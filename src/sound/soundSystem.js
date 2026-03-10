import { GLITCH_SOUND_MAX_PLAYS, SOUND_FILES } from './soundConfig';

const audioCache = new Map();
let audioUnlocked = false;
let unlockInitialized = false;
let glitchSoundPlayCount = 0;
let audioContext = null;
let narrationChainReady = false;
let externalNarrationAudio = null;
const endedHandlers = new Map();

function getAudio(soundKey) {
  const src = SOUND_FILES[soundKey];
  if (!src) return null;

  if (!audioCache.has(soundKey)) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audioCache.set(soundKey, audio);
  }

  return audioCache.get(soundKey);
}

function resolveAudioSrc(rawSrc) {
  if (!rawSrc) return '';
  if (typeof rawSrc !== 'string') return rawSrc;

  let src = rawSrc.trim();
  if (!src) return '';
  if (
    (src.startsWith('"') && src.endsWith('"')) ||
    (src.startsWith("'") && src.endsWith("'"))
  ) {
    src = src.slice(1, -1).trim();
  }

  if (src.includes('drive.google.com')) {
    try {
      const directByPath = src.match(/\/file\/d\/([^/]+)/i);
      if (directByPath?.[1]) {
        return `https://drive.google.com/uc?export=download&id=${directByPath[1]}`;
      }

      const url = new URL(src);
      const id = url.searchParams.get('id');
      if (id) {
        return `https://drive.google.com/uc?export=download&id=${id}`;
      }
    } catch {
      // If parsing fails, continue with original source.
    }
  }

  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
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

  try {
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
  } catch {
    narrationChainReady = false;
  }
}

export async function playSound(soundKey, { volume = 1, loop = false, reset = true, src } = {}) {
  if (soundKey === 'glitch' && glitchSoundPlayCount >= GLITCH_SOUND_MAX_PLAYS) {
    return false;
  }

  const desiredSrc = src ? resolveAudioSrc(src) : resolveAudioSrc(SOUND_FILES[soundKey]);

  if (soundKey === 'narration' && desiredSrc) {
    let isExternal = false;
    try {
      const url = new URL(desiredSrc, window.location.href);
      isExternal = url.origin !== window.location.origin;
    } catch {
      isExternal = true;
    }

    if (isExternal) {
      if (externalNarrationAudio) {
        externalNarrationAudio.pause();
        externalNarrationAudio.currentTime = 0;
      }
      const audio = new Audio(desiredSrc);
      audio.preload = 'auto';
      audio.volume = volume;
      audio.loop = loop;
      externalNarrationAudio = audio;
      audio.onended = () => {
        const handlers = endedHandlers.get(soundKey);
        if (handlers) {
          for (const handler of handlers) handler();
        }
      };
      try {
        audio.load();
        await audio.play();
        return true;
      } catch {
        return false;
      }
    }
  }

  const audio = getAudio(soundKey);
  if (!audio) return false;
  audio.crossOrigin = 'anonymous';

  if (desiredSrc && audio.src !== desiredSrc) {
    audio.src = desiredSrc;
    audio.load();
  }

  audio.volume = volume;
  audio.loop = loop;
  if (reset) audio.currentTime = 0;

  try {
    if (soundKey === 'narration') {
      let canFilter = true;
      if (desiredSrc) {
        try {
          const url = new URL(desiredSrc, window.location.href);
          canFilter = url.origin === window.location.origin;
        } catch {
          canFilter = false;
        }
      }
      if (canFilter) {
        setupNarrationFilter(audio);
        const context = getAudioContext();
        if (context?.state === 'suspended') {
          await context.resume();
        }
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
  if (externalNarrationAudio) {
    externalNarrationAudio.pause();
    externalNarrationAudio.currentTime = 0;
  }
}

export function resetGlitchSoundCounter() {
  glitchSoundPlayCount = 0;
}

export function onSoundEnded(soundKey, handler) {
  const audio = getAudio(soundKey);
  if (!audio || typeof handler !== 'function') {
    return () => {};
  }

  if (!endedHandlers.has(soundKey)) {
    endedHandlers.set(soundKey, new Set());
  }
  const handlers = endedHandlers.get(soundKey);
  handlers.add(handler);

  audio.addEventListener('ended', handler);
  return () => {
    audio.removeEventListener('ended', handler);
    handlers.delete(handler);
  };
}
