import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/components/ui/ElasticSlider.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function mount() {
  const effects = [];
  const layouts = [];
  const frames = new Map();
  const changes = [];
  const commits = [];
  let frameId = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(source, {
    exports,
    window: { matchMedia: () => ({ matches: true }) },
    performance: { now: () => 0 },
    requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
    require: (name) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name !== 'react') return {};
      return {
        useRef: (current) => ({ current }),
        useState: (value) => [value, () => {}],
        useEffect: (callback) => effects.push(callback),
        useLayoutEffect: (callback) => layouts.push(callback),
      };
    },
  });
  const tree = exports.default({
    defaultValue: 50, leftIcon: null, rightIcon: null, fillContentColor: '#fff',
    onChange: (value) => changes.push(value), onChangeEnd: (value) => commits.push(value),
  });
  let slider;
  let range;
  const attach = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(attach);
    const element = {
      style: { setProperty() {} }, clientWidth: 200, clientHeight: 34,
      getBoundingClientRect: () => ({ left: 0, bottom: 34 }),
      setPointerCapture() {}, setAttribute() {}, removeAttribute() {}, focus() {},
    };
    if (node.props.ref) node.props.ref.current = element;
    if (node.props.role === 'slider') slider = node;
    if (node.props.className?.includes('[clip-path:inset')) range = element;
    attach(node.props.children);
  };
  attach(tree);
  layouts.forEach((effect) => effect());
  const cleanup = effects.map((effect) => effect());

  cleanup.forEach((fn) => fn?.());
  layouts.forEach((effect) => effect());
  effects.forEach((effect) => effect());
  const flush = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(16));
  };
  const pointer = (clientX) => ({ clientX, pointerId: 1, button: 0, preventDefault() {} });
  return { slider, range, changes, commits, flush, pointer, frames };
}

test('slider paints and commits a drag after StrictMode effect replay', () => {
  const app = mount();
  app.slider.props.onPointerDown(app.pointer(50));
  app.slider.props.onPointerMove(app.pointer(160));
  app.flush();
  assert.equal(app.changes.at(-1), 80);
  assert.match(app.range.style.clipPath, /20\.000%/);
  assert.equal(app.commits.length, 0, 'drag changes must not end the gesture');
  app.slider.props.onPointerUp();
  app.slider.props.onLostPointerCapture();
  assert.deepEqual(app.commits, [80], 'release commits exactly once');
  app.flush();
  assert.equal(app.frames.size, 0, 'animation settles after release');
});

test('slider clamps dragging outside the track and accepts a subsequent drag', () => {
  const app = mount();
  app.slider.props.onPointerDown(app.pointer(100));
  app.slider.props.onPointerMove(app.pointer(300));
  app.slider.props.onPointerUp();
  app.slider.props.onPointerDown(app.pointer(100));
  app.slider.props.onPointerMove(app.pointer(-50));
  app.slider.props.onPointerUp();
  app.flush();
  assert.deepEqual(app.commits, [100, 0]);
  assert.match(app.range.style.clipPath, /100\.000%/);
});
