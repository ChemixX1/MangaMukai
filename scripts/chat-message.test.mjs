import assert from 'node:assert/strict';
import test from 'node:test';
import { chatMessagePreview, formatChatDate, parseChatMessage } from '../src/utils/chatMessage.ts';

test('chat dates always show day, month and a spaced twelve-hour period', () => {
  assert.equal(formatChatDate('2026-10-18T22:48:00'), '18 de octubre 10:48 p. m.');
  assert.equal(formatChatDate('2026-10-18 00:05:00'), '18 de octubre 12:05 a. m.');
  assert.equal(formatChatDate('invalid'), '');
});

test('chat attachments preserve accompanying text and readable conversation previews', () => {
  assert.deepEqual(parseChatMessage('Mira esto\n[GIF](https://example.test/image.gif)'), {
    text: 'Mira esto', media: { url: 'https://example.test/image.gif', label: 'GIF' },
  });
  assert.equal(chatMessagePreview('[Imagen](https://example.test/image.webp)'), 'Imagen');
  assert.equal(chatMessagePreview('Hola\n[GIF](https://example.test/image.gif)'), 'Hola');
});

test('arbitrary messages and executable attachment URLs remain plain text', () => {
  for (const body of ['Hola ❤️', '[Imagen](javascript:alert(1))', '[GIF](data:image/gif;base64,test)', '[Imagen](https://example.test/x) texto posterior']) {
    assert.deepEqual(parseChatMessage(body), { text: body, media: null });
  }
});
