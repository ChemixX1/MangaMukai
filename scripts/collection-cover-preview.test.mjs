import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/components/social/CollectionCoverPreview.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;

function render(open) {
  const exports = {};
  let stateIndex = 0;
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === 'react') return {
        lazy: () => 'LazyHoloCard', Suspense: 'Suspense',
        useEffect: () => {}, useId: () => 'preview-title', useRef: () => ({ current: null }),
        useState: () => [stateIndex++ === 0 ? open : false, () => {}],
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
      if (name.includes('HoloCard')) throw new Error('HoloCard must not load during preview rendering');
      return {};
    },
  });
  return exports.CollectionCoverPreview({ cover: 'cover.webp', title: 'Colección' });
}

test('closed collection preview does not mount the holographic renderer', () => {
  const preview = render(false);
  assert.equal(preview.props.children[0].type, 'button');
  assert.equal(preview.props.children[1].props.children, false);
});

test('opening a collection cover mounts the renderer behind Suspense', () => {
  const preview = render(true);
  const section = preview.props.children[1].props.children;
  assert.equal(section.type, 'section');
  assert.equal(section.props.children[0].type, 'Suspense');
  assert.equal(section.props.children[0].props.children.type, 'LazyHoloCard');
});
