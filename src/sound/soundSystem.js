import { GLITCH_SOUND_MAX_PLAYS, SOUND_FILES } from './soundConfig';

const audioCache = new Map();
let audioUnlocked = false;
let unlockInitialized = false;
let glitchSoundPlayCount = 0;
let audioContext = null;
let narrationChainReady = false;

function getAudio(soundKey) {
  const src = SOUND_FILES[soundKey];
  if (!src) return null;

  if (!audioCache.has(soundKey)) {
    audioCache.set(soundKey, new Audio(src));
  }

  return audioCache.get(soundKey);
}

function waitForAudioLoad(audio) {
  return new Promise((resolve) => {
    if (audio.readyState >= 3) {
      resolve(true);
      return;
    }

    const onReady = () => {
      cleanup();
      resolve(true);
    };

    const onError = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('loadeddata', onReady);
      audio.removeEventListener('error', onError);
    };

    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('loadeddata', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });
}

export async function preloadAllSounds(onProgress) {
  const soundKeys = Object.keys(SOUND_FILES);
  let loadedCount = 0;

  onProgress?.({ loaded: loadedCount, total: soundKeys.length });

  for (const key of soundKeys) {
    const audio = getAudio(key);
    if (!audio) continue;

    await waitForAudioLoad(audio);
    loadedCount += 1;
    onProgress?.({ loaded: loadedCount, total: soundKeys.length });
  }

  return { loaded: loadedCount, total: soundKeys.length };
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;

  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;

  audioContext = new Context();
  return audioContext;
}

function setupNarrationFilter(audio) {
  if (narrationChainReady) return;

  const context = getAudioContext();
  if (!context) return;

  const source = context.createMediaElementSource(audio);
  const highPass = context.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = 280;

  const lowPass = context.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.value = 3400;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 24;
  compressor.ratio.value = 10;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.2;

  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(compressor);
  compressor.connect(context.destination);
  narrationChainReady = true;
}

export async function playSound(soundKey, { volume = 1, loop = false, reset = true } = {}) {
  if (soundKey === 'glitch' && glitchSoundPlayCount >= GLITCH_SOUND_MAX_PLAYS) {
    return false;
  }

  const audio = getAudio(soundKey);
  if (!audio) return false;

  audio.volume = volume;
  audio.loop = loop;
  if (reset) audio.currentTime = 0;

  try {
    if (soundKey === 'narration') {
      setupNarrationFilter(audio);
      const context = getAudioContext();
      if (context?.state === 'suspended') {
        await context.resume();
      }
    }

    await audio.play();
    if (soundKey === 'glitch') {
      glitchSoundPlayCount += 1;
    }
    return true;
  } catch {
    return false;
  }
}

async function unlockAudio() {
  if (audioUnlocked) return true;

  const audio = getAudio('button') || getAudio('glitch');
  if (!audio) return false;

  const previousVolume = audio.volume;
  try {
    audio.volume = 0;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = previousVolume;
    audioUnlocked = true;
    return true;
  } catch {
    audio.volume = previousVolume;
    return false;
  }
}

export function initAudioUnlock() {
  if (typeof window === 'undefined' || unlockInitialized) return;
  unlockInitialized = true;

  const tryUnlock = async () => {
    const unlocked = await unlockAudio();
    if (!unlocked) return;

    window.removeEventListener('pointerdown', tryUnlock);
    window.removeEventListener('keydown', tryUnlock);
  };

  window.addEventListener('pointerdown', tryUnlock, { passive: true });
  window.addEventListener('keydown', tryUnlock);
}

export function stopSound(soundKey) {
  const audio = audioCache.get(soundKey);
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

export function stopNarration() {
  stopSound('narration');
}

export function resetGlitchSoundCounter() {
  glitchSoundPlayCount = 0;
}
