import { GLITCH_EVENT_NAME } from '../../constants/ui';
import { playSound, stopNarration } from '../../sound/soundSystem';

function blurTarget(event) {
  event.target.blur();
}

export default function useControlHandlers({ onToggleMessage, showMessage, onNarrationStart }) {
  const triggerGlitch = () => {
    window.dispatchEvent(new CustomEvent(GLITCH_EVENT_NAME, { detail: { skipSound: true } }));
  };

  const handleTextClick = (event) => {
    blurTarget(event);
    playSound('button');
    if (showMessage) {
      stopNarration();
    } else {
      playSound('narration');
      onNarrationStart?.();
    }
    onToggleMessage();
  };

  const handleGlitchClick = (event) => {
    blurTarget(event);
    playSound('glitch');
    triggerGlitch();
  };

  const handleEndClick = (event) => {
    blurTarget(event);
    playSound('endCall');
    stopNarration();
  };

  return {
    handleGlitchClick,
    handleTextClick,
    handleEndClick,
  };
}
