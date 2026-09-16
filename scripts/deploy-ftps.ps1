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

.PARAMETER NoPrune
  No borra del servidor los bundles viejos de assets/ (por defecto, tras subir,
  se elimina todo archivo de assets/ remoto que ya no exista en dist/assets/).

.PARAMETER PruneOnly
  Solo ejecuta la limpieza de assets/ contra el dist/ existente, sin compilar ni subir.

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
  [switch]$DryRun,
  [switch]$NoPrune,
  [switch]$PruneOnly
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $repo "dist"

if ($PruneOnly) { $NoBuild = $true }

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
  if ($PruneOnly) { $files = @() }
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

  if (-not $DryRun -and -not $PruneOnly) {
    Write-Host ("==> Subidos: {0}  Fallidos: {1}" -f $ok, $fail) -ForegroundColor Green
    if ($fail -gt 0) { $failed | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }; exit 1 }
  }

  # Limpieza de assets/: Vite nombra cada bundle con hash, asi que cada deploy dejaba
  # los anteriores acumulandose en el servidor. Solo se toca assets/ (nunca wp-content,
  # images, etc.) y solo se borra lo que no existe en el dist/ recien subido.
  if (-not $NoPrune) {
    $local = @{}
    Get-ChildItem -LiteralPath (Join-Path $dist 'assets') -File -Force | ForEach-Object { $local[$_.Name] = $true }
    $listing = & curl.exe -s -S -K $tmp --list-only "ftp://$FtpHost/assets/"
    if ($LASTEXITCODE -ne 0) {
      Write-Host "==> No se pudo listar assets/ remoto; se omite la limpieza." -ForegroundColor Yellow
    } else {
      # Solo el nombre (NLST puede devolver rutas); '.' y '..' se filtran antes de nada.
      $stale = @($listing | ForEach-Object { (($_ -replace '\r','').Trim() -split '/')[-1] } |
        Where-Object { $_ -and $_ -ne '.' -and $_ -ne '..' -and -not $local.ContainsKey($_) })
      if ($stale.Count -eq 0) {
        Write-Host "==> assets/ remoto sin bundles viejos." -ForegroundColor Green
      } elseif ($DryRun) {
        $stale | ForEach-Object { Write-Host "  [dry] borrar assets/$_" }
      } else {
        Write-Host ("==> Borrando {0} bundles viejos de assets/" -f $stale.Count) -ForegroundColor Cyan
        $removed = 0
        # Lotes de DELE en una misma conexion; el '*' hace que curl siga aunque uno falle.
        for ($i = 0; $i -lt $stale.Count; $i += 40) {
          $batch = $stale[$i..([Math]::Min($i + 39, $stale.Count - 1))]
          $quote = @()
          foreach ($name in $batch) { $quote += '-Q'; $quote += ('*DELE assets/' + $name) }
          # Sin redirigir stderr: con ErrorActionPreference=Stop, PowerShell 5.1 convierte
          # cualquier linea de stderr redirigida en error terminante.
          & curl.exe -s -S -K $tmp @quote "ftp://$FtpHost/assets/" | Out-Null
          if ($LASTEXITCODE -ne 0) { Write-Host ("  aviso: curl devolvio {0} en un lote de borrado" -f $LASTEXITCODE) -ForegroundColor Yellow }
          $removed += $batch.Count
          $batch | ForEach-Object { Write-Host "  DEL  assets/$_" }
        }
        # Verificacion: lo que siga existiendo se reporta, sin abortar el deploy.
        $after = & curl.exe -s -S -K $tmp --list-only "ftp://$FtpHost/assets/"
        $left = @($after | ForEach-Object { (($_ -replace '\r','').Trim() -split '/')[-1] } |
          Where-Object { $_ -and $_ -ne '.' -and $_ -ne '..' -and -not $local.ContainsKey($_) })
        if ($left.Count -gt 0) {
          Write-Host ("==> Quedaron {0} archivos sin borrar en assets/:" -f $left.Count) -ForegroundColor Yellow
          $left | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
        } else {
          Write-Host ("==> Limpieza completa: {0} archivos borrados." -f $removed) -ForegroundColor Green
        }
      }
    }
  }
} finally {
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}
