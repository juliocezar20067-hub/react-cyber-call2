import ControlButton from './controls/ControlButton';
import useControlHandlers from './controls/useControlHandlers';
import './Controls.css';

export default function Controls({ onToggleMessage, showMessage, onNarrationStart }) {
  const { handleGlitchClick, handleTextClick, handleEndClick } = useControlHandlers({
    onToggleMessage,
    showMessage,
    onNarrationStart,
  });

  return (
    <div className="controls">
      <ControlButton onClick={handleGlitchClick}>RETORNAR</ControlButton>
      <ControlButton onClick={handleTextClick}>GRAVAÇÃO</ControlButton>
      <ControlButton
        onClick={handleEndClick}
        style={{ background: 'var(--cp-red)', color: '#000' }}
      >
        END CALL
      </ControlButton>
    </div>
  );
}
