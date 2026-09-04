import assert from 'node:assert/strict';
import https from 'node:https';

// Read-only, anonymous deployment checks. Never follows redirects to providers.
const origin = process.env.CHECK_ORIGIN || 'https://mangamukai.com';
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
for (const provider of ['google', 'discord']) {
  const query = new URLSearchParams({ provider, redirect_to: `${origin}/auth/login?social=${provider}` });
  const result = await request(`/login/?${query}`);
  assert.ok(result.status < 400, `${provider}: provider start failed (${result.status})`);
  const cookie = (result.headers['set-cookie'] || []).find(value => value.startsWith('mm_social_auth_return='));
  assert.ok(cookie, `${provider}: production return cookie missing`);
  assert.match(cookie, /secure/i);
  assert.match(cookie, /httponly/i);
  assert.match(cookie, /samesite=lax/i);
  console.log(`PASS ${provider}: starts OAuth and preserves secure React return`);
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
console.log('A real Google/Discord account sign-in is still required for end-to-end confirmation.');
