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
  class Audio extends EventTarget {
    currentTime = 0;
    duration = 180;
    volume = 1;
    src = '';
    constructor() { super(); instances.push(this); }
    load() {}
    play() { this.dispatchEvent(new Event('play')); return Promise.resolve(); }
    pause() { this.dispatchEvent(new Event('pause')); }
    removeAttribute() { this.src = ''; }
  }
  const exports = {};
  vm.runInNewContext(compile('../src/services/musicPlayer.ts'), {
    exports, Audio,
    require: (name) => name === 'react'
      ? { useEffect() {}, useSyncExternalStore: (_subscribe, snapshot) => snapshot() }
      : name.includes('authService')
        ? { getStoredToken: () => null, getStoredUser: () => null }
        : { getMusicTracks: async () => tracks },
  });
  return { player: exports, instances };
}

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
  let requestedSubscription = false;
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compile('../src/components/manga/MangaMusicCard.tsx'), {
    exports,
    require: (name) => {
      if (name === 'react') return { useState: (value) => [value, () => {}] };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'framer-motion') return { motion: { div: 'motion.div' }, AnimatePresence: 'AnimatePresence' };
      if (name.includes('musicPlayer')) return {
        useMusicPlayer: () => ({ tracks: [{ id: 1, url: unlocked ? 'one.mp3' : '', is_locked: !unlocked }], currentId: 1, loading: false, currentTime: 0, duration: 180, volume: 50 }),
        isPlayableTrack: (track) => Boolean(track?.url && !track.is_locked),
      };
      if (name.includes('MukaiMusicPromo')) return { MukaiMusicPromo: 'MukaiMusicPromo' };
      if (name.includes('subscriptionModal')) return { openSubscriptionModal: () => { requestedSubscription = true; } };
      return {};
    },
  });
  const locked = exports.MangaMusicCard({ cover: '' });
  assert.match(locked.props.className, /manga-music-locked-card/);
  assert.equal(locked.props.children.type, 'MukaiMusicPromo');
  locked.props.children.props.onUnlock();
  assert.equal(requestedSubscription, true);
  unlocked = true;
  const playable = exports.MangaMusicCard({ cover: '' });
  assert.match(playable.props.className, /manga-music-player/);
});
