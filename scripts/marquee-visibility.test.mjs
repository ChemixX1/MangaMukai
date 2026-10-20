import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/hooks/useInfiniteMarquee.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function mount(initialCount = 0) {
  const slots = [];
  const frames = new Map();
  const intersections = new Set();
  const listeners = new Map();
  const track = { style: {} };
  const sequence = { offsetWidth: 1000 };
  const viewport = { clientWidth: 400 };
  let index = 0;
  let frameId = 0;
  let now = 0;
  let changed = false;
  let effects = [];
  let model;
  let count = initialCount;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const useMemo = (factory, deps) => {
    const slot = index++;
    if (!slots[slot] || !same(slots[slot].deps, deps)) slots[slot] = { value: factory(), deps };
    return slots[slot].value;
  };
  const document = {
    hidden: false,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, document,
    performance: { now: () => now },
    window: {
      requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
    ResizeObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; }
      observe(element) { this.element = element; intersections.add(this); }
      disconnect() { intersections.delete(this); }
    },
    require: (name) => {
      assert.equal(name, 'react');
      return {
        useMemo,
        useCallback: (callback, deps) => useMemo(() => callback, deps),
        useRef: (value) => {
          const slot = index++;
          slots[slot] ??= { current: value };
          return slots[slot];
        },
        useState: (value) => {
          const slot = index++;
          slots[slot] ??= { value: typeof value === 'function' ? value() : value };
          return [slots[slot].value, (next) => {
            const resolved = typeof next === 'function' ? next(slots[slot].value) : next;
            if (!Object.is(resolved, slots[slot].value)) {
              slots[slot].value = resolved;
              changed = true;
            }
          }];
        },
        useEffect: (callback, deps) => {
          const slot = index++;
          if (!slots[slot] || !same(slots[slot].deps, deps)) {
            const previous = slots[slot];
            slots[slot] = { deps };
            effects.push(() => {
              previous?.cleanup?.();
              slots[slot].cleanup = callback();
            });
          }
        },
      };
    },
  });
  function render(nextCount = count) {
    count = nextCount;
    do {
      changed = false;
      index = 0;
      effects = [];
      model = exports.useInfiniteMarquee({ itemCount: count, speed: 20, direction: 'left' });
      model.viewportRef.current = count ? viewport : null;
      model.trackRef.current = count ? track : null;
      model.sequenceRef.current = count ? sequence : null;
      effects.forEach((run) => run());
    } while (changed);
  }
  render();
  return {
    frames, intersections, track, render,
    get props() { return model.viewportProps; },
    intersect(visible) {
      [...intersections].forEach((observer) => observer.callback([{ isIntersecting: visible }]));
      render();
    },
    hide(hidden) {
      document.hidden = hidden;
      listeners.get('visibilitychange')?.();
      render();
    },
    tick(elapsed = 16) {
      now += elapsed;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(now));
    },
    unmount() {
      slots.forEach((slot) => slot.cleanup?.());
      assert.equal(listeners.size, 0);
    },
  };
}

test('a marquee observes the viewport when asynchronously loaded items mount it', () => {
  const app = mount();
  assert.equal(app.intersections.size, 0);
  app.render(8);
  assert.equal(app.intersections.size, 1);
  assert.equal(app.frames.size, 0, 'wait for a visible viewport before animating');
  app.intersect(true);
  assert.equal(app.frames.size, 1);
  const before = app.track.style.transform;
  app.tick();
  assert.notEqual(app.track.style.transform, before);
  app.unmount();
  assert.equal(app.frames.size, 0);
  assert.equal(app.intersections.size, 0);
});

test('offscreen and hidden marquees stop their animation and resume from the same position', () => {
  const app = mount(8);
  app.intersect(true);
  app.tick();
  app.intersect(false);
  const paused = app.track.style.transform;
  assert.equal(app.frames.size, 0);
  app.tick(10000);
  assert.equal(app.track.style.transform, paused);
  app.intersect(true);
  assert.equal(app.track.style.transform, paused);
  assert.equal(app.frames.size, 1);
  app.hide(true);
  assert.equal(app.frames.size, 0);
  app.tick(10000);
  app.hide(false);
  assert.equal(app.track.style.transform, paused);
  assert.equal(app.frames.size, 1);
  app.tick();
  assert.notEqual(app.track.style.transform, paused);
  app.unmount();
});

test('drag and click suppression still work after visibility resumes', () => {
  const app = mount(8);
  app.intersect(true);
  app.hide(true);
  app.hide(false);
  const captured = new Set();
  const target = {
    setPointerCapture: (id) => captured.add(id),
    hasPointerCapture: (id) => captured.has(id),
    releasePointerCapture: (id) => captured.delete(id),
  };
  const pointer = (clientX) => ({ clientX, pointerId: 1, pointerType: 'touch', button: 0, currentTarget: target });
  app.props.onPointerDown(pointer(100));
  const before = app.track.style.transform;
  app.props.onPointerMove(pointer(40));
  assert.notEqual(app.track.style.transform, before);
  assert.equal(captured.size, 1);
  app.props.onPointerUp(pointer(40));
  assert.equal(captured.size, 0);
  let prevented = 0;
  app.props.onClickCapture({ preventDefault: () => prevented++, stopPropagation() {} });
  assert.equal(prevented, 1);
  app.props.onClickCapture({ preventDefault: () => prevented++, stopPropagation() {} });
  assert.equal(prevented, 1, 'a later ordinary click remains usable');
  app.unmount();
});
