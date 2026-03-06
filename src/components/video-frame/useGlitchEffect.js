import { useEffect } from 'react';
import { GLITCH_EVENT_NAME } from '../../constants/ui';
import { playSound } from '../../sound/soundSystem';

export default function useGlitchEffect({ frameRef, duration = 500, intervalMs = 2000, chance = 0.85 }) {
  useEffect(() => {
    const triggerGlitch = (event) => {
      if (!frameRef.current) return;

      if (!event?.detail?.skipSound) {
        playSound('glitch');
      }
      frameRef.current.classList.add('glitch-active');
      setTimeout(() => {
        frameRef.current?.classList.remove('glitch-active');
      }, duration);
    };

    const interval = setInterval(() => {
      if (Math.random() > chance) {
        triggerGlitch();
      }
    }, intervalMs);

    window.addEventListener(GLITCH_EVENT_NAME, triggerGlitch);

    return () => {
      clearInterval(interval);
      window.removeEventListener(GLITCH_EVENT_NAME, triggerGlitch);
    };
  }, [chance, duration, frameRef, intervalMs]);
}
