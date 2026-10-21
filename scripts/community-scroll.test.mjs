import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/hooks/useCommunityScroll.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function mount({ state = { restoreCommunityScroll: true }, navigationType = 'PUSH', search = '?tab=saved', loading = false, maxScroll = 8000 } = {}) {
  const listeners = new Map();
  let saved = { userId: '7', url: '/comunidad?tab=saved', scrollY: 5500 };
  let effect;
  let resize;
  let observing = false;
  const window = {
    scrollY: 0,
    scrollTo({ top }) { this.scrollY = Math.min(top, maxScroll); },
    setTimeout: () => 1,
    clearTimeout() {},
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: event => listeners.delete(event),
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, window, document: { getElementById: () => ({}) },
    ResizeObserver: class {
      constructor(fn) { resize = fn; }
      observe() { observing = true; }
      disconnect() { observing = false; }
    },
    require(name) {
      if (name === 'react') return { useLayoutEffect: fn => { effect = fn; } };
      if (name === 'react-router-dom') return {
        useLocation: () => ({ pathname: '/comunidad', search, key: 'return', state }),
        useNavigationType: () => navigationType,
      };
      return {
        getCommunityPosition: () => saved,
        rememberCommunityPosition: (userId, url, scrollY) => { saved = { userId, url, scrollY }; },
      };
    },
  });
  exports.useCommunityScroll('7', loading);
  const cleanup = effect();
  return {
    window, listeners, cleanup,
    saved: () => saved,
    resize: height => { maxScroll = height; if (observing) resize(); },
    observing: () => observing,
    emit: event => listeners.get(event)?.(),
  };
}

test('returning from messages restores the same community filter and scroll position', () => {
  const page = mount();
  assert.equal(page.window.scrollY, 5500);
  assert.equal(page.saved().url, '/comunidad?tab=saved');
  page.cleanup();
  assert.equal(page.listeners.size, 0);
});

test('browser Back also restores community while fresh navigation and changed filters start at the top', () => {
  assert.equal(mount({ state: null, navigationType: 'POP' }).window.scrollY, 5500);
  assert.equal(mount({ state: null }).window.scrollY, 0);
  assert.equal(mount({ search: '' }).window.scrollY, 0);
  assert.equal(mount({ loading: true }).listeners.size, 0);
});

test('restoration waits for content height without overwriting the saved position', () => {
  const page = mount({ maxScroll: 300 });
  assert.equal(page.window.scrollY, 300);
  page.emit('scroll');
  assert.equal(page.saved().scrollY, 5500);
  page.resize(8000);
  assert.equal(page.window.scrollY, 5500);
  assert.equal(page.observing(), false);
});

test('touching the feed cancels delayed restoration so it never fights manual scrolling', () => {
  const page = mount({ maxScroll: 300 });
  page.emit('touchstart');
  page.window.scrollY = 200;
  page.emit('scroll');
  page.resize(8000);
  assert.equal(page.window.scrollY, 200);
  assert.equal(page.saved().scrollY, 200);
  page.cleanup();
});
