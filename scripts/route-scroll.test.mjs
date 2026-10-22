import assert from 'node:assert/strict';
import test from 'node:test';
import { createRouteScrollManager } from '../src/utils/routeScroll.ts';

function setup(t) {
  const originals = Object.fromEntries(['window', 'document', 'ResizeObserver', 'MutationObserver'].map(key => [key, globalThis[key]]));
  const win = new EventTarget();
  const observers = [];
  const timers = new Map();
  let timerId = 0;
  let maxY = 10000;
  Object.assign(win, {
    scrollX: 0, scrollY: 0,
    scrollTo({ left = 0, top = 0 }) { this.scrollX = left; this.scrollY = Math.min(top, maxY); this.dispatchEvent(new Event('scroll')); },
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  const root = {};
  const elements = new Map([['root', root]]);
  globalThis.window = win;
  globalThis.document = { body: root, getElementById: id => elements.get(id) };
  globalThis.ResizeObserver = globalThis.MutationObserver = class {
    constructor(fn) { this.fn = fn; this.active = true; observers.push(this); }
    observe() {}
    disconnect() { this.active = false; }
  };
  t.after(() => Object.assign(globalThis, originals));
  return {
    win, elements, attach: createRouteScrollManager(),
    scroll: top => win.scrollTo({ top }),
    layout: height => { maxY = height; observers.filter(o => o.active).forEach(o => o.fn()); },
    input: () => win.dispatchEvent(new Event('wheel')),
    activeObservers: () => observers.filter(o => o.active).length,
  };
}

test('back restores the second hero and forward restores the detail independently', t => {
  const s = setup(t);
  let leave = s.attach('home', false, '');
  s.scroll(3100);
  leave();
  leave = s.attach('detail', false, '');
  assert.equal(s.win.scrollY, 0);
  s.scroll(650);
  leave();
  leave = s.attach('home', true, '');
  assert.equal(s.win.scrollY, 3100);
  leave();
  leave = s.attach('detail', true, '');
  assert.equal(s.win.scrollY, 650);
  leave();
});

test('different visits to the same page keep their own position and new entries start at the top', t => {
  const s = setup(t);
  let leave = s.attach('home-first-visit', false, '');
  s.scroll(4300); leave();
  leave = s.attach('home-second-visit', false, '');
  assert.equal(s.win.scrollY, 0);
  s.scroll(900); leave();
  leave = s.attach('home-first-visit', true, '');
  assert.equal(s.win.scrollY, 4300); leave();
});

test('restoration waits for enough content height without losing the saved position', t => {
  const s = setup(t);
  let leave = s.attach('hot-latest', false, '');
  s.scroll(4600); leave();
  s.layout(200);
  leave = s.attach('hot-latest', true, '');
  assert.equal(s.win.scrollY, 200);
  assert.equal(s.activeObservers(), 2);
  s.layout(6000);
  assert.equal(s.win.scrollY, 4600);
  assert.equal(s.activeObservers(), 0);
  leave();
});

test('pending restoration is cancelled by user input and does not drag them back', t => {
  const s = setup(t);
  let leave = s.attach('bn-latest', false, '');
  s.scroll(4200); leave();
  s.layout(200);
  leave = s.attach('bn-latest', true, '');
  s.input(); s.scroll(100); s.layout(6000);
  assert.equal(s.win.scrollY, 100);
  assert.equal(s.activeObservers(), 0);
  leave();
});

test('leaving during a delayed restoration does not overwrite the original position', t => {
  const s = setup(t);
  let leave = s.attach('youth', false, '');
  s.scroll(3600); leave(); s.layout(200);
  leave = s.attach('youth', true, ''); leave();
  s.layout(6000);
  leave = s.attach('youth', true, '');
  assert.equal(s.win.scrollY, 3600); leave();
});

test('new hash navigation targets the anchor, but back restores the exact saved reading position', t => {
  const s = setup(t);
  s.elements.set('mangas-juveniles', { scrollIntoView: () => s.scroll(2900) });
  let leave = s.attach('anchor-entry', false, '#mangas-juveniles');
  assert.equal(s.win.scrollY, 2900);
  s.scroll(3300); leave();
  leave = s.attach('anchor-entry', true, '#mangas-juveniles');
  assert.equal(s.win.scrollY, 3300); leave();
});
