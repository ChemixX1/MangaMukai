import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/config/api.ts'], bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' } });
const { socialLoginUrl } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

for (const provider of ['google', 'discord']) {
  test(`${provider} preserves the reader destination in its callback without session storage`, () => {
    const destination = '/read/123?source=manga#chapter';
    const login = new URL(socialLoginUrl(provider, destination));
    const callback = new URL(login.searchParams.get('redirect_to'));
    assert.equal(callback.pathname, '/auth/login');
    assert.equal(callback.searchParams.get('social'), provider);
    assert.equal(callback.searchParams.get('returnTo'), destination);
  });
}

test('social callbacks reject external and recursive auth destinations', () => {
  for (const destination of ['https://example.com', '//example.com', '/auth/login', '/\\example.com']) {
    const login = new URL(socialLoginUrl('google', destination));
    const callback = new URL(login.searchParams.get('redirect_to'));
    assert.equal(callback.searchParams.get('returnTo'), '/');
  }
});
