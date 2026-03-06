import { CALLER_NAME, CONNECTION_CODE, INCOMING_STATUS_TEXT } from '../../constants/ui';
import { playSound } from '../../sound/soundSystem';
import './Menu.css';

export default function NpcsPanel({ onBack, onOpenCall }) {
  const handleBack = () => {
    playSound('button');
    onBack();
  };

  const handleOpenCall = () => {
    playSound('button');
    onOpenCall();
  };

  return (
    <div className="menu-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">NPCs</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="npc-card">
        <img
          src="public\npcs\LightFinger.png"
          alt={CALLER_NAME}
          className="npc-avatar"
        />

        <div className="npc-info">
          <div className="npc-name">{CALLER_NAME}</div>
          <div className="npc-meta">Fixer | Canal Encriptado</div>
          <div className="npc-connection">{CONNECTION_CODE}</div>
          <div className="npc-status">{INCOMING_STATUS_TEXT}</div>
          <button className="npc-call-btn" onClick={handleOpenCall}>ABRIR LIGACAO</button>
        </div>
      </div>
    </div>
  );
}
