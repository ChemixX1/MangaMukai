import assert from 'node:assert/strict';
import https from 'node:https';

// Read-only, anonymous deployment checks. Never follows redirects to providers.
const origin = process.env.CHECK_ORIGIN || 'https://mangamukai.com';
const site = new URL(origin);
assert.equal(site.protocol, 'https:', 'CHECK_ORIGIN must use HTTPS');
const providerOption = process.argv.find(arg => arg.startsWith('--provider='));
const requestedProvider = providerOption?.slice('--provider='.length);
assert.ok(!providerOption || ['google', 'discord'].includes(requestedProvider),
  '--provider must be google or discord');
const providers = requestedProvider ? [requestedProvider] : ['google', 'discord'];
const allowSelfSigned = process.argv.includes('--allow-self-signed');
if (allowSelfSigned) console.warn('Diagnostic only: TLS verification disabled; this does NOT verify SSL.');
function request(path, method = 'GET', headers = {}) {
  const url = new URL(path, origin);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method, headers, rejectUnauthorized: !allowSelfSigned,
      ...(process.env.CHECK_IP ? { lookup: (_host, options, cb) => options.all
        ? cb(null, [{ address: process.env.CHECK_IP, family: 4 }])
        : cb(null, process.env.CHECK_IP, 4) } : {}),
    }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(30000, () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end();
  });
}

function redirectUrl(value, base) {
  try {
    return new URL(value, base);
  } catch {
    // Do not include the Location header: it can contain OAuth state or codes.
    throw new Error('OAuth start returned an invalid redirect URL');
  }
}

function verifyProviderRedirect(provider, location) {
  const isGoogle = provider === 'google';
  assert.ok(location.protocol === 'https:' && !location.username && !location.password,
    `${provider}: authorization redirect must use HTTPS without URL credentials`);
  assert.ok(isGoogle
    ? location.origin === 'https://accounts.google.com' && /^\/o\/oauth2(?:\/v2)?\/auth(?:\/|$)/.test(location.pathname)
    : ['https://discord.com', 'https://discordapp.com'].includes(location.origin) && /^\/(?:api\/)?oauth2\/authorize\/?$/.test(location.pathname),
  `${provider}: unexpected authorization endpoint`);
  const params = location.searchParams;
  assert.ok(params.get('client_id')?.trim(), `${provider}: client_id missing`);
  assert.ok(params.get('state')?.trim(), `${provider}: OAuth state missing`);
  assert.equal(params.get('response_type'), 'code', `${provider}: authorization-code flow required`);
  assert.ok(params.get('redirect_uri')?.startsWith('https://'), `${provider}: absolute HTTPS redirect_uri required`);
  const callback = redirectUrl(params.get('redirect_uri'), site);
  assert.ok(callback.origin === site.origin
    && /^\/login\/?$/.test(callback.pathname)
    && callback.searchParams.get('provider') === provider
    && !callback.username && !callback.password && !callback.hash,
  `${provider}: callback must return to the site's WordPress login provider route`);
  const scopes = new Set((params.get('scope') || '').split(/\s+/).filter(Boolean));
  assert.ok(isGoogle
    ? (scopes.has('email') || scopes.has('https://www.googleapis.com/auth/userinfo.email'))
      && (scopes.has('profile') || scopes.has('https://www.googleapis.com/auth/userinfo.profile'))
    : scopes.has('identify') && scopes.has('email'),
  `${provider}: identity/email scopes missing`);
}

async function checkProviderStart(provider) {
  const query = new URLSearchParams({ provider, redirect_to: `${site.origin}/auth/login?social=${provider}` });
  let current = new URL(`/login/?${query}`, site);
  const cookies = new Map();
  let hasReturnCookie = false;

  for (let hop = 0; hop < 5; hop++) {
    const result = await request(current.href, 'GET', cookies.size
      ? { Cookie: [...cookies.values()].join('; ') } : {});
    assert.ok(result.status < 400, `${provider}: provider start failed (${result.status})`);
    for (const cookie of result.headers['set-cookie'] || []) {
      const pair = cookie.split(';', 1)[0];
      cookies.set(pair.slice(0, pair.indexOf('=')), pair);
      if (!cookie.startsWith('mm_social_auth_return=')) continue;
      assert.ok(/;\s*secure(?:;|$)/i.test(cookie), `${provider}: return cookie must be Secure`);
      assert.ok(/;\s*httponly(?:;|$)/i.test(cookie), `${provider}: return cookie must be HttpOnly`);
      assert.ok(/;\s*samesite=lax(?:;|$)/i.test(cookie), `${provider}: return cookie must be SameSite=Lax`);
      hasReturnCookie = true;
    }
    assert.ok(hasReturnCookie, `${provider}: production return cookie missing`);

    if (![301, 302, 303, 307, 308].includes(result.status) || !result.headers.location) {
      console.warn(`PENDING ${provider}: return cookie is secure, but HTTP ${result.status} did not redirect to the provider. HTML/link/JavaScript starts require browser verification.`);
      return false;
    }
    const next = redirectUrl(result.headers.location, current);
    if (next.origin !== site.origin) {
      // Inspect the provider URL, without following it or logging sensitive parameters.
      verifyProviderRedirect(provider, next);
      console.log(`PASS ${provider}: HTTPS authorization redirect, required OAuth parameters, WordPress callback, and secure React return cookie`);
      return true;
    }
    assert.ok(!next.username && !next.password, `${provider}: invalid internal redirect`);
    current = next;
  }
  throw new Error(`${provider}: too many internal redirects before OAuth authorization`);
}

let startsConfirmed = true;
for (const provider of providers) {
  if (!await checkProviderStart(provider)) startsConfirmed = false;
}
const invalid = await request('/login/?provider=google&redirect_to=https%3A%2F%2Fexample.com%2Fauth%2Flogin%3Fsocial%3Dgoogle');
assert.ok(!(invalid.headers['set-cookie'] || []).some(value => value.startsWith('mm_social_auth_return=')));
console.log('PASS external React return rejected');
const anonymous = await request('/?mm_social_session=1', 'POST');
assert.equal(anonymous.status, 401);
assert.equal(JSON.parse(anonymous.body).success, false);
assert.equal((await request('/?mm_social_session=1')).status, 405);
const cors = await request('/?mm_social_session=1', 'OPTIONS', { Origin: 'http://localhost:5173' });
assert.equal(cors.status, 204);
assert.equal(cors.headers['access-control-allow-origin'], 'http://localhost:5173');
console.log('PASS anonymous session denied, GET denied, local preflight supported');
// Provider failures must land on the React auth page, never on a WordPress error page.
const failure = await request('/auth/login?social_error=user_denied&social_provider=google');
assert.equal(failure.status, 200);
assert.ok((failure.headers['content-type'] || '').includes('text/html'), 'social failure page must be the React shell');
console.log('PASS social failures return to the React auth page');
// Logs and backups in the web root leaked session tokens once; they must stay blocked.
for (const path of ['/wp-content/mu-plugins/debug_auth.log', '/error_log', '/wp-content/mu-plugins/manga-auth-api.php.bak-20260426105133', '/node_modules/react/package.json', '/src/config/api.ts']) {
  const blocked = await request(path);
  assert.ok([403, 404].includes(blocked.status), path + ' is publicly readable (HTTP ' + blocked.status + ')');
}
console.log('PASS logs, backups and development files are not public');
console.log(`A real ${providers.map(provider => provider === 'google' ? 'Google' : 'Discord').join('/')} account sign-in is still required for end-to-end confirmation.`);
if (!startsConfirmed) process.exitCode = 2;
