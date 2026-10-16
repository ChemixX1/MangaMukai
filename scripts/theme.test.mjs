import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/hooks/useTheme.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup() {
  const storage = new Map();
  const classes = new Set();
  const effects = [];
  const timers = [];
  const subscriptions = [];
  const window = new EventTarget();
  window.requestAnimationFrame = (callback) => timers.push(callback);
  window.setTimeout = (callback) => timers.push(callback);
  const root = {
    style: {},
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
    },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, window, document: { documentElement: root },
    CustomEvent: class extends Event {},
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    require: () => ({
      useEffect: (callback) => effects.push(callback),
      useSyncExternalStore: (subscribe, getSnapshot) => {
        const updates = [];
        const unsubscribe = subscribe(() => updates.push(getSnapshot()));
        subscriptions.push({ updates, unsubscribe });
        return getSnapshot();
      },
    }),
  });
  return { useTheme: exports.useTheme, storage, classes, effects, subscriptions, window, timers, root };
}

test('each click toggles the current theme, including handlers retained by different controls', () => {
  const app = setup();
  const navbar = app.useTheme();
  const manga = app.useTheme();
  navbar.toggleTheme();
  assert.equal(app.root.style.colorScheme, 'dark');
  manga.toggleTheme();
  assert.equal(app.root.style.colorScheme, 'light');
  navbar.toggleTheme();
  assert.equal(app.root.style.colorScheme, 'dark');
  app.effects.forEach((effect) => effect());
  assert.equal(app.root.style.colorScheme, 'dark', 'mount effects must not restore an old theme');
  for (const subscription of app.subscriptions) {
    assert.deepEqual(subscription.updates, ['dark', 'light', 'dark']);
    subscription.unsubscribe();
  }
});

test('a theme change from another tab updates the document and the subscribers', () => {
  const app = setup();
  app.useTheme();
  app.storage.set('mangamukai-theme', 'dark');
  const event = new Event('storage');
  Object.defineProperty(event, 'key', { value: 'mangamukai-theme' });
  app.window.dispatchEvent(event);
  assert.equal(app.root.style.colorScheme, 'dark');
  assert.deepEqual(app.subscriptions[0].updates, ['dark']);
});
