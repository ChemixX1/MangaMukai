import assert from 'node:assert/strict';
import test from 'node:test';
import { optimizeProfileImage } from '../src/utils/optimizeProfileImage.ts';

function imageBrowser(t, { width = 4000, height = 2000, mime = 'image/webp', bytes = 100, large = false } = {}) {
  const previousBitmap = globalThis.createImageBitmap;
  const previousDocument = globalThis.document;
  let closed = false;
  const qualities = [];
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ drawImage() {} }),
    toBlob: (callback, type, quality) => {
      assert.equal(type, 'image/webp');
      qualities.push(quality);
      callback(new Blob([new Uint8Array(large && quality > .62 ? 500 * 1024 : bytes)], { type: mime }));
    },
  };
  globalThis.createImageBitmap = async () => ({ width, height, close() { closed = true; } });
  globalThis.document = { createElement: () => canvas };
  t.after(() => {
    if (previousBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = previousBitmap;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  return { canvas, qualities, closed: () => closed };
}

test('profile banners accept JPG/PNG/GIF and always become WebP, even for tiny input files', async t => {
  const browser = imageBrowser(t);
  for (const [extension, type] of [['jpg', 'image/jpeg'], ['png', 'image/png'], ['gif', 'image/gif']]) {
    const file = new File(['small'], `portada.${extension}`, { type });
    const result = await optimizeProfileImage(file, 'banner');
    assert.equal(result.type, 'image/webp');
    assert.equal(result.name, 'portada.webp');
    assert.notEqual(result, file);
    assert.deepEqual([browser.canvas.width, browser.canvas.height], [1920, 960]);
    assert.equal(browser.closed(), true);
  }
});

test('large banners lower quality and small banners are not enlarged', async t => {
  const browser = imageBrowser(t, { width: 800, height: 400, large: true });
  const result = await optimizeProfileImage(new File(['png'], 'portada.png', { type: 'image/png' }), 'banner');
  assert.deepEqual([browser.canvas.width, browser.canvas.height], [800, 400]);
  assert.deepEqual(browser.qualities, [.82, .72, .62]);
  assert.ok(result.size < 450 * 1024);
});

test('an unsupported WebP encoder rejects banners instead of uploading an uncompressed fallback', async t => {
  const browser = imageBrowser(t, { mime: 'image/png' });
  await assert.rejects(optimizeProfileImage(new File(['png'], 'portada.png', { type: 'image/png' }), 'banner'), /WebP/);
  assert.equal(browser.closed(), true);
});

test('avatar GIF animation is preserved', async () => {
  const file = new File(['gif'], 'avatar.gif', { type: 'image/gif' });
  assert.equal(await optimizeProfileImage(file, 'avatar'), file);
});
