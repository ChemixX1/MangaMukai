import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compile = (file) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function setup(tracks) {
  const instances = [];
  let libraryRequests = 0;
  let accountKey = '';
  const browser = new EventTarget();
  class Audio extends EventTarget {
    currentTime = 0;
    duration = 180;
    volume = 1;
    src = '';
    constructor() { super(); instances.push(this); }
    loadCalls = 0;
    load() { this.loadCalls++; }
    play() { this.dispatchEvent(new Event('play')); return Promise.resolve(); }
    pause() { this.dispatchEvent(new Event('pause')); }
    removeAttribute() { this.src = ''; }
  }
  const exports = {};
  vm.runInNewContext(compile('../src/services/musicPlayer.ts'), {
    exports, Audio, window: browser,
    require: (name) => name === 'react'
      ? { useEffect() {}, useSyncExternalStore: (_subscribe, snapshot) => snapshot() }
      : name.includes('authService')
        ? { AUTH_CHANGED_EVENT: 'auth-changed', getAuthCacheKey: () => accountKey }
        : { getMusicTracks: async () => { libraryRequests++; return tracks; } },
  });
  return { player: exports, instances, requests: () => libraryRequests, authChanged: (key = accountKey) => { accountKey = key; browser.dispatchEvent(new Event('auth-changed')); } };
}

test('account refresh events keep the music loaded; changing account reloads access', async () => {
  const { player, instances, requests, authChanged } = setup([{ id: 1, url: 'one.mp3' }]);
  await player.ensureMusicLibrary();
  player.seekTo(42);
  authChanged();
  await player.ensureMusicLibrary();
  assert.equal(requests(), 1);
  assert.equal(instances[0].currentTime, 42);
  authChanged('another-user|0');
  await player.ensureMusicLibrary();
  assert.equal(requests(), 2);
});

test('detail and reader share an in-flight library and preserve audio when remounting', async () => {
  const { player, instances, requests } = setup([{ id: 1, url: 'one.mp3' }]);
  const detailLoad = player.ensureMusicLibrary();
  const readerLoad = player.ensureMusicLibrary();
  assert.equal(detailLoad, readerLoad);
  await readerLoad;
  player.togglePlay();
  player.seekTo(73);
  player.setVolume(35);
  await player.ensureMusicLibrary();
  const snapshot = player.useMusicPlayer();
  assert.equal(requests(), 1);
  assert.equal(instances.length, 1);
  assert.equal(instances[0].loadCalls, 1);
  assert.equal(snapshot.loading, false);
  assert.equal(snapshot.currentId, 1);
  assert.equal(snapshot.currentTime, 73);
  assert.equal(snapshot.volume, 35);
  assert.equal(snapshot.isPlaying, true);
});

test('an already loaded subscription prompt does not request the library again', async () => {
  const { player, requests } = setup([]);
  await player.ensureMusicLibrary();
  await player.ensureMusicLibrary();
  assert.equal(requests(), 1);
  assert.equal(player.useMusicPlayer().loading, false);
});

test('audio supports play, pause, volume, seeking and next/previous tracks', async () => {
  const { player, instances } = setup([{ id: 1, url: 'one.mp3' }, { id: 2, url: 'two.mp3' }]);
  await player.ensureMusicLibrary();
  const audio = instances[0];
  audio.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(player.useMusicPlayer().duration, 180);
  player.togglePlay();
  assert.equal(player.useMusicPlayer().isPlaying, true);
  player.setVolume(75);
  assert.equal(audio.volume, 0.75);
  player.seekTo(60);
  assert.equal(audio.currentTime, 60);
  assert.equal(player.useMusicPlayer().currentTime, 60);
  player.togglePlay();
  assert.equal(player.useMusicPlayer().isPlaying, false);
  player.playNext(false);
  assert.equal(audio.src, 'two.mp3');
  player.playPrev(false);
  assert.equal(audio.src, 'one.mp3');
  player.togglePlay();
  audio.dispatchEvent(new Event('ended'));
  assert.equal(audio.src, 'two.mp3');
});

test('locked tracks cannot start playback; volume remains bounded', async () => {
  const { player, instances } = setup([{ id: 1, is_locked: true, url: '' }]);
  await player.ensureMusicLibrary();
  player.togglePlay();
  assert.equal(player.useMusicPlayer().isPlaying, false);
  assert.equal(instances.length, 0);
  player.setVolume(150);
  assert.equal(player.useMusicPlayer().volume, 100);
  player.setVolume(-5);
  assert.equal(player.useMusicPlayer().volume, 0);
  player.setVolume(NaN);
  assert.equal(player.useMusicPlayer().volume, 0);
});

test('card restores the subscription prompt without mounting player controls', () => {
  const exports = {};
  let unlocked = false;
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compile('../src/components/manga/MangaMusicCard.tsx'), {
    exports,
    require: (name) => {
      if (name === 'react') return { useState: (value) => [value, () => {}] };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react-router-dom') return { useNavigate: () => () => {} };
      if (name === 'framer-motion') return { motion: { div: 'motion.div' }, AnimatePresence: 'AnimatePresence' };
      if (name.includes('musicPlayer')) return {
        useMusicPlayer: () => ({ tracks: [{ id: 1, url: unlocked ? 'one.mp3' : '', is_locked: !unlocked }], currentId: 1, loading: false, currentTime: 0, duration: 180, volume: 50 }),
        isPlayableTrack: (track) => Boolean(track?.url && !track.is_locked),
      };
      if (name.includes('MukaiMusicPromo')) return { MukaiMusicPromo: 'MukaiMusicPromo' };
      return {};
    },
  });
  const locked = exports.MangaMusicCard({ cover: '' });
  assert.match(locked.props.className, /manga-music-locked-card/);
  assert.equal(locked.props.children.type, 'MukaiMusicPromo');
  assert.equal(locked.props.children.props.onUnlock, undefined);
  unlocked = true;
  const playable = exports.MangaMusicCard({ cover: '' });
  assert.match(playable.props.className, /manga-music-player/);
});

test('Mukai Music sends guests through login and signed-in users to plans', () => {
  let token = null;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compile('../src/components/manga/MukaiMusicPromo.tsx'), {
    exports,
    require: (name) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react-router-dom') return { Link: 'Link' };
      if (name.endsWith('/authService')) return { getStoredToken: () => token };
      return {};
    },
  });
  const promo = exports.MukaiMusicPromo();
  const content = promo.props.children[1];
  const link = content.props.children.find((child) => child.type === 'Link');
  assert.equal(link.props.to, '/auth/login?returnTo=%2Fpro');
  assert.equal(link.props.state.returnTo, '/pro');
  token = 'session';
  const signedIn = exports.MukaiMusicPromo().props.children[1].props.children.find(child => child.type === 'Link');
  assert.equal(signedIn.props.to, '/pro');
  assert.equal(link.props.children, 'SUSCRÍBETE');
});
