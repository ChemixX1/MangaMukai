import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/components/manga/MangaRecommendations.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function setup() {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(source, {
    exports,
    getComputedStyle: () => ({ transform: 'matrix(1,0,0,1,0,-120)' }),
    DOMMatrixReadOnly: class { m42 = -120; },
    require: (name) => {
      if (name === 'react') return { useRef: (current) => ({ current }), useState: (value) => [value, () => {}] };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name.includes('titleCase')) return { toTitleCase: (title) => title };
      return {};
    },
  });
  const tree = exports.MangaRecommendations({ items: [1, 2, 3].map(id => ({ id, titulo: 'Manga', portada: '' })) });
  const list = tree.props.children[1].props;
  let captured = false;
  const target = {
    dataset: {}, scrollTop: 0, querySelector: () => ({}),
    setPointerCapture: () => { captured = true; },
    hasPointerCapture: () => captured,
    releasePointerCapture: () => { captured = false; },
  };
  const pointer = (y, pointerType = 'mouse') => ({ currentTarget: target, pointerId: 1, button: 0, clientY: y, pointerType, preventDefault() {} });
  const click = () => {
    let prevented = false;
    list.onClickCapture({ detail: 1, preventDefault: () => { prevented = true; }, stopPropagation() {} });
    return prevented;
  };
  return { list, target, pointer, click };
}

test('mouse drag preserves the carousel position and suppresses navigation only after dragging', () => {
  const app = setup();
  app.list.onPointerDown(app.pointer(100));
  assert.equal(app.target.scrollTop, 120);
  app.list.onPointerMove(app.pointer(70));
  assert.equal(app.target.scrollTop, 150);
  app.list.onPointerUp(app.pointer(70));
  assert.equal(app.click(), true);
  app.list.onPointerDown(app.pointer(100));
  app.list.onPointerMove(app.pointer(102));
  app.list.onPointerUp(app.pointer(102));
  assert.equal(app.click(), false, 'a normal click must still open the manga');
});

test('touch hands off to native scrolling without capturing the gesture', () => {
  const app = setup();
  app.list.onPointerDown(app.pointer(100, 'touch'));
  assert.equal(app.target.dataset.manual, 'true');
  app.list.onPointerMove(app.pointer(50, 'touch'));
  assert.equal(app.target.hasPointerCapture(), false);
  assert.equal(app.target.scrollTop, 120, 'touch scrolling is handled by the browser');
  assert.equal(app.click(), false);
});

test('keyboard focus preserves the carousel offset without applying it again on subsequent focus', () => {
  const app = setup();
  app.list.onFocusCapture({ currentTarget: app.target });
  assert.equal(app.target.dataset.manual, 'true');
  assert.equal(app.target.scrollTop, 120);
  app.list.onFocusCapture({ currentTarget: app.target });
  assert.equal(app.target.scrollTop, 120);
  assert.equal(app.click(), false);
});
