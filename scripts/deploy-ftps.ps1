<#
.SYNOPSIS
  Despliega dist/ al web root de MangaMukai por FTPS (TLS explicito, puerto 21).

.DESCRIPTION
  BanaHosting no permite SSH externo en hosting compartido, asi que el canal de
  despliegue es FTPS. Este script compila el frontend (npm run build, que ademas
  copia server/ dentro de dist/) y sube todo el arbol de dist/ a la raiz de la
  cuenta FTP, que debe estar enjaulada en public_html.

  La credencial se lee de un XML de PowerShell cifrado con DPAPI (solo tu usuario
  de Windows puede descifrarlo). Nunca se escribe la contrasena en texto plano ni
  en los argumentos del proceso: se pasa a curl por un archivo de config temporal
  que se borra al terminar.

.PARAMETER CredPath
  Ruta al credential XML (creado con: Get-Credential | Export-Clixml <ruta>).

.PARAMETER FtpHost
  Nombre del servidor que coincide con su certificado TLS.

.PARAMETER NoBuild
  Sube el dist/ existente sin recompilar.

.PARAMETER DryRun
  Muestra que archivos se subirian, sin subir nada.

.EXAMPLE
  pwsh scripts/deploy-ftps.ps1
  pwsh scripts/deploy-ftps.ps1 -NoBuild
  pwsh scripts/deploy-ftps.ps1 -DryRun
#>
param(
  [string]$CredPath = "$env:USERPROFILE\.ssh\mangamukai-deploy-ftps.xml",
  [string]$FtpHost  = "lake-9070.banahosting.com",
  [string]$FtpAddress = "50.31.188.151",
  [switch]$NoBuild,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $repo "dist"

if (-not $NoBuild) {
  Write-Host "==> npm run build" -ForegroundColor Cyan
  Push-Location $repo
  try {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "El build fallo (npm run build exit $LASTEXITCODE)" }
  } finally { Pop-Location }
}

if (-not (Test-Path (Join-Path $dist "index.html"))) {
  throw "No existe dist/index.html. Corre el build primero (sin -NoBuild)."
}
if (-not (Test-Path $CredPath)) {
  throw "No existe la credencial: $CredPath`nCreala con:`n  `$c = Get-Credential -UserName 'deploy@mangamukai.com'`n  `$c | Export-Clixml '$CredPath'"
}

$cred = Import-Clixml $CredPath
$curlUser = ($cred.UserName + ':' + $cred.GetNetworkCredential().Password).Replace('\', '\\').Replace('"', '\"')
$cfg  = "user = `"$curlUser`"`nssl-reqd`nconnect-timeout = 20`nresolve = `"${FtpHost}:21:${FtpAddress}`""
$tmp  = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmp, $cfg, (New-Object System.Text.UTF8Encoding $false))

try {
  # Publicar el shell solo cuando todos sus assets y endpoints esten disponibles.
  $files = Get-ChildItem -LiteralPath $dist -Recurse -File -Force | Sort-Object @{Expression={
    if ($_.FullName -eq (Join-Path $dist 'index.html')) { 3 }
    elseif ($_.FullName -eq (Join-Path $dist '.htaccess')) { 2 }
    elseif ($_.FullName.StartsWith((Join-Path $dist 'assets') + [IO.Path]::DirectorySeparatorChar)) { 0 }
    else { 1 }
  }}, FullName
  Write-Host ("==> {0} archivos -> ftps://{1}/  (raiz = public_html)" -f $files.Count, $FtpHost) -ForegroundColor Cyan

  $ok = 0; $fail = 0; $failed = @()
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($dist.Length).TrimStart('\','/').Replace('\','/')
    $enc = ($rel -split '/' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
    $url = "ftp://$FtpHost/$enc"
    if ($DryRun) { Write-Host "  [dry] $rel"; continue }

    & curl.exe -s -S -K $tmp --retry 2 --ftp-create-dirs -T $f.FullName $url
    if ($LASTEXITCODE -eq 0) {
      $ok++
      Write-Host ("  OK   {0}" -f $rel)
    } else {
      $fail++; $failed += $rel
      Write-Host ("  FALLO ({0}) {1}" -f $LASTEXITCODE, $rel) -ForegroundColor Red
      throw "Carga interrumpida en $rel. No se publicara el nuevo index.html."
    }
  }

  if (-not $DryRun) {
    Write-Host ("==> Subidos: {0}  Fallidos: {1}" -f $ok, $fail) -ForegroundColor Green
    if ($fail -gt 0) { $failed | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }; exit 1 }
  }
} finally {
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}
