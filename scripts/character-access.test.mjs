import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const characters = ['alex', 'raven', 'arianel', 'estrella'].map(id => ({ id, label: id, description: id }));
const hooks = {
  useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
  useMemo: fn => fn(),
  useEffect() {},
};

function load(file, imports) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => name === 'react/jsx-runtime' ? require(name)
    : imports[name] ?? new Proxy({}, { get: (_, key) => key }), module, module.exports);
  return module.exports;
}

function links(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === 'Link' ? [tree.props] : []), ...[tree.props?.children].flat(Infinity).flatMap(links)];
}

for (const signedIn of [false, true]) {
  test(`character cards ${signedIn ? 'open their character for a signed-in user' : 'take guests straight to login with the chosen character'}`, () => {
    const { MobileCharacterHome } = load('../src/components/character/mobile/MobileCharacterHome.tsx', {
      react: hooks,
      'react-router-dom': { Link: 'Link' },
      'framer-motion': { motion: { div: 'div', li: 'li', section: 'section', p: 'p' } },
      '../../../data/chatCharacters': { chatCharacters: characters },
      '../../../hooks/useLocalExperience': { useExperienceUser: () => ({ id: signedIn ? '1' : 'guest', signedIn }) },
      '../../../services/authService': { getStoredToken: () => signedIn ? 'token' : null, getStoredUser: () => ({ coins: 0 }) },
      '../../../services/characterChatService': { FREE_MESSAGE_LIMIT: 20 },
      './cards': { CHARACTER_CARDS: characters },
    });
    const cards = links(MobileCharacterHome()).filter(link => link['aria-label']?.startsWith('Ver la ficha'));
    assert.equal(cards.length, 4);
    cards.forEach((card, index) => {
      const destination = `/chat/${characters[index].id}`;
      if (signedIn) {
        assert.equal(card.to, destination);
        assert.equal(card.state, undefined);
      } else {
        const url = new URL(card.to, 'https://mangamukai.com');
        assert.equal(url.pathname, '/auth/login');
        assert.equal(url.searchParams.get('returnTo'), destination);
        assert.equal(card.state.returnTo, destination);
      }
    });
  });
}

test('guest direct links redirect before mounting the character and preserve the complete return path', () => {
  for (const suffix of ['', '/conversacion']) {
    const location = { pathname: `/chat/alex${suffix}`, search: '?from=link', hash: '#intro' };
    const { default: CharacterChatPage } = load('../src/pages/CharacterChatPage.tsx', {
      'react-router-dom': { Navigate: 'Navigate', useParams: () => ({ characterId: 'alex' }), useLocation: () => location, useMatch: () => suffix ? {} : null },
      '../data/chatCharacters': { chatCharacters: characters },
      '../hooks/useLocalExperience': { useExperienceUser: () => ({ id: 'guest', signedIn: false }) },
    });
    const result = CharacterChatPage();
    assert.equal(result.type, 'Navigate');
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    assert.equal(result.props.state.returnTo, returnTo);
    assert.equal(new URL(result.props.to, 'https://mangamukai.com').searchParams.get('returnTo'), returnTo);
    assert.equal(result.props.replace, true);
  }
});

test('character selection stays public while signed-in users can open introductions', () => {
  for (const signedIn of [false, true]) {
    const { default: CharacterChatPage } = load('../src/pages/CharacterChatPage.tsx', {
      'react-router-dom': { Navigate: 'Navigate', useParams: () => ({ characterId: signedIn ? 'alex' : undefined }), useLocation: () => ({ pathname: '/chat', search: '', hash: '' }), useMatch: () => null },
      '../data/chatCharacters': { chatCharacters: characters },
      '../hooks/useLocalExperience': { useExperienceUser: () => ({ id: signedIn ? '1' : 'guest', signedIn }) },
    });
    assert.equal(CharacterChatPage().type, signedIn ? 'MobileCharacterIntro' : 'MobileCharacterHome');
  }
});
