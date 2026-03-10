import { playSound } from '../../sound/soundSystem';
import './Menu.css';

export default function MissionsPanel({ onBack, activeMission, completedMissions, deniedMissions }) {
  const handleBack = () => {
    playSound('button');
    onBack();
  };

  return (
    <div className="menu-shell missions-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">Missoes</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="active-mission-block">
        <div className="active-mission-label">Ativa</div>
        {activeMission ? (
          <>
            <div className="active-mission-title">{activeMission.title}</div>
            <div className="active-mission-meta">{activeMission.summary}</div>
          </>
        ) : (
          <div className="active-mission-empty">Nenhuma missao ativa.</div>
        )}
      </div>

      <div className="active-mission-block">
        <div className="active-mission-label">Concluidas</div>
        {completedMissions.length > 0 ? (
          completedMissions.map((mission, index) => (
            <div key={`cm-${mission.title}-${index}`} className="mission-history-item">{mission.title}</div>
          ))
        ) : (
          <div className="active-mission-empty">Nenhuma.</div>
        )}
      </div>

      <div className="active-mission-block">
        <div className="active-mission-label">Negadas</div>
        {deniedMissions.length > 0 ? (
          deniedMissions.map((mission, index) => (
            <div key={`dm-${mission.title}-${index}`} className="mission-history-item">{mission.title}</div>
          ))
        ) : (
          <div className="active-mission-empty">Nenhuma.</div>
        )}
      </div>
    </div>
  );
}
