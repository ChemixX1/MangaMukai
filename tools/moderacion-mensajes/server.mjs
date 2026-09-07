#!/usr/bin/env node
/**
 * Supervision local de mensajes privados de MangaMukai (solo lectura).
 *
 * Conexion integrada, sin inicio de sesion: la app y el sitio comparten una clave
 * larga guardada en server/wp-content/mu-plugins/mangamukai-moderation-key.php.
 * Ese archivo esta fuera de git, lo genera esta herramienta la primera vez y se
 * publica en el servidor con el resto de server/ al hacer `npm run deploy`.
 *
 * El servidor local sirve la interfaz (index.html) en http://127.0.0.1:4317 y
 * reenvia las consultas a /wp-json/mangamukai/v1/moderation/* del sitio
 * (mu-plugin mangamukai-moderation-api.php) firmandolas con la clave.
 * No guarda mensajes en disco; lo unico que sale del equipo son esas consultas.
 *
 * Uso:  npm run moderacion        (o)  node tools/moderacion-mensajes/server.mjs [--port=4317] [--open]
 * Variables opcionales: MM_SITE (https://mangamukai.com), MM_SITE_IP (50.31.188.151),
 * MM_PORT, MM_MODERATION_KEY (clave directa) o MM_MODERATION_KEY_FILE (otro archivo).
 */
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const flags = Object.fromEntries(
  process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => {
    const [key, value = 'true'] = arg.slice(2).split('=');
    return [key, value];
  }),
);

const SITE = new URL(process.env.MM_SITE || flags.site || 'https://mangamukai.com');
const SITE_IP = process.env.MM_SITE_IP ?? flags.ip ?? '50.31.188.151';
const PORT = Number(process.env.MM_PORT || flags.port || 4317);
const HOST = '127.0.0.1';
const API_BASE = '/wp-json/mangamukai/v1';
const INDEX_FILE = path.join(here, 'index.html');
const KEY_FILE = path.resolve(process.env.MM_MODERATION_KEY_FILE || flags['key-file']
  || path.join(repoRoot, 'server', 'wp-content', 'mu-plugins', 'mangamukai-moderation-key.php'));

if (SITE.protocol !== 'https:') {
  console.error('MM_SITE debe usar https.');
  process.exit(1);
}

function readKeyFile(file) {
  try {
    const source = fs.readFileSync(file, 'utf8');
    const match = source.match(/define\(\s*'MM_MODERATION_KEY'\s*,\s*'([A-Za-z0-9_-]{32,})'\s*\)/);
    return match ? match[1] : null;
  } catch {
    return '';
  }
}

function createKeyFile(file) {
  const key = crypto.randomBytes(48).toString('hex');
  const source = [
    '<?php',
    '/**',
    ' * Plugin Name: MangaMukai Moderation Key',
    ' * Description: Clave compartida con la herramienta local tools/moderacion-mensajes. Generada automaticamente; fuera de git. Si se filtra, borra este archivo, vuelve a ejecutar npm run moderacion y despliega.',
    ' */',
    "if (!defined('ABSPATH')) exit;",
    `define('MM_MODERATION_KEY', '${key}');`,
    '',
  ].join('\n');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, source, { mode: 0o600, flag: 'wx' });
  return key;
}

let keyCreated = false;
let KEY = process.env.MM_MODERATION_KEY || '';
if (!KEY) {
  const stored = readKeyFile(KEY_FILE);
  if (stored === null) {
    console.error(`El archivo de clave existe pero no tiene un define('MM_MODERATION_KEY', '...') valido: ${KEY_FILE}`);
    console.error('Borralo para que se genere otro (y despliega despues con npm run deploy).');
    process.exit(1);
  }
  if (stored) {
    KEY = stored;
  } else {
    KEY = createKeyFile(KEY_FILE);
    keyCreated = true;
  }
}

/**
 * DNS con respaldo: el equipo de desarrollo no resuelve mangamukai.com, asi que
 * si la resolucion falla se usa la IP conocida. SNI y Host siguen siendo los del
 * dominio, por lo que el certificado TLS se valida con normalidad.
 */
function lookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.lookup(hostname, options, (error, address, family) => {
    if (!error) return callback(null, address, family);
    if (!SITE_IP) return callback(error);
    if (options && options.all) return callback(null, [{ address: SITE_IP, family: 4 }]);
    return callback(null, SITE_IP, 4);
  });
}

function upstream(endpoint, query) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + endpoint, SITE);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
      }
    }
    const headers = {
      Accept: 'application/json',
      'User-Agent': 'MangaMukai-Moderacion/1.0',
      'X-MM-Moderation-Key': KEY,
    };
    const request = https.request(url, { method: 'GET', headers, lookup, timeout: 30000 }, (response) => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { text += chunk; });
      response.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          // Respuesta no JSON (por ejemplo una pagina de error del hosting).
        }
        resolve({ status: response.statusCode || 0, json });
      });
    });
    request.on('timeout', () => request.destroy(new Error('El sitio tardo demasiado en responder.')));
    request.on('error', reject);
    request.end();
  });
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const sendJson = (res, status, data) => send(res, status, data);

/** Solo acepta peticiones que nacen de la propia interfaz local. */
function sameOrigin(req) {
  const origin = req.headers.origin;
  const allowed = [`http://${HOST}:${PORT}`, `http://localhost:${PORT}`];
  if (origin && !allowed.includes(origin)) return false;
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  return true;
}

const relativeKeyFile = path.relative(repoRoot, KEY_FILE).replace(/\\/g, '/');

function explain(status) {
  if (status === 401 || status === 403) {
    return `El sitio no reconoce la clave de supervision. Publica server/ con "npm run deploy" (la clave esta en ${relativeKeyFile}) y pulsa Reintentar.`;
  }
  if (status === 404) {
    return 'El sitio todavia no tiene la API de moderacion. Publica server/ con "npm run deploy" y pulsa Reintentar.';
  }
  return `Respuesta no valida del sitio (HTTP ${status}).`;
}

async function handleApi(req, res, url) {
  if (!sameOrigin(req)) return sendJson(res, 403, { success: false, message: 'Origen no permitido.' });
  if (req.method !== 'GET') return sendJson(res, 405, { success: false, message: 'Solo lectura.' });
  const route = url.pathname.slice('/api/'.length);

  if (route === 'session') {
    return sendJson(res, 200, { site: SITE.origin, keyFile: relativeKeyFile, keyCreated });
  }

  if (route.startsWith('mod/')) {
    const endpoint = '/moderation/' + route.slice('mod/'.length).replace(/[^A-Za-z0-9/_-]/g, '');
    const query = Object.fromEntries(url.searchParams.entries());
    let result;
    try {
      result = await upstream(endpoint, query);
    } catch (error) {
      return sendJson(res, 502, { success: false, message: `No se pudo conectar con ${SITE.host}: ${error.message}` });
    }
    if (result.json && result.status < 400) return sendJson(res, result.status, result.json);
    return sendJson(res, result.status || 502, {
      success: false,
      status: result.status,
      message: (result.json && result.json.message && result.status !== 404 && result.status !== 401 && result.status !== 403)
        ? result.json.message
        : explain(result.status),
    });
  }

  return sendJson(res, 404, { success: false, message: 'Ruta no encontrada.' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return send(res, 200, fs.readFileSync(INDEX_FILE), 'text/html; charset=utf-8');
    }
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname === '/favicon.ico') {
      res.writeHead(204);
      return res.end();
    }
    return send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
  } catch (error) {
    return sendJson(res, 500, { success: false, message: error instanceof Error ? error.message : 'Error interno.' });
  }
});

server.listen(PORT, HOST, () => {
  const address = `http://${HOST}:${PORT}`;
  console.log(`Supervision de mensajes MangaMukai -> ${address}`);
  console.log(`Sitio: ${SITE.origin}${SITE_IP ? ` (respaldo IP ${SITE_IP})` : ''}. Ctrl+C para salir.`);
  if (keyCreated) {
    console.log(`Clave de supervision creada en ${relativeKeyFile}.`);
    console.log('Publica server/ con "npm run deploy" para que el sitio la reconozca.');
  } else {
    console.log(`Clave de supervision: ${process.env.MM_MODERATION_KEY ? 'variable MM_MODERATION_KEY' : relativeKeyFile}.`);
  }
  if (flags.open === 'true') {
    const command = process.platform === 'win32'
      ? `start "" "${address}"`
      : process.platform === 'darwin' ? `open "${address}"` : `xdg-open "${address}"`;
    exec(command);
  }
});
