import { useState } from 'react';
import { playSound } from '../../sound/soundSystem';
import usePanelEntries from '../../hooks/usePanelEntries';
import './Menu.css';

export default function MissionsPanel({
  onBack,
  activeMission,
  completedMissions,
  deniedMissions,
  campaignId,
  playerId,
  role,
  onSendQueuedMission,
  onRemoveDeniedMission,
}) {
  const [masterNote, setMasterNote] = useState('');
  const [playerNote, setPlayerNote] = useState('');
  const [showMissionPlaceholder, setShowMissionPlaceholder] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customSummary, setCustomSummary] = useState('');
  const [customNpc, setCustomNpc] = useState('');
  const [customClue, setCustomClue] = useState('');
  const [attachmentLabel, setAttachmentLabel] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState('imagem');
  const [attachments, setAttachments] = useState([]);
  const [missionError, setMissionError] = useState('');
  const [queueError, setQueueError] = useState('');
  const { entries: masterNotes, addEntry: addMasterNote, removeEntry: removeMasterNote } = usePanelEntries({
    campaignId,
    playerId: role === 'master' ? 'master' : playerId,
    panelId: 'mission_notes_master',
    defaultEntries: [],
  });
  const { entries: playerNotes, addEntry: addPlayerNote, removeEntry: removePlayerNote } = usePanelEntries({
    campaignId,
    playerId,
    panelId: 'mission_notes_player',
    defaultEntries: [],
  });
  const {
    entries: queuedMissions,
    addEntry: addQueuedMission,
    removeEntry: removeQueuedMission,
  } = usePanelEntries({
    campaignId,
    playerId: role === 'master' ? 'master' : playerId,
    panelId: 'mission_queue_master',
    defaultEntries: [],
  });

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  const handleAddMasterNote = () => {
    const text = masterNote.trim();
    if (!text) return;
    playSound('button');
    addMasterNote({ text, createdAt: Date.now() });
    setMasterNote('');
  };

  const handleAddPlayerNote = () => {
    const text = playerNote.trim();
    if (!text) return;
    playSound('button');
    addPlayerNote({ text, createdAt: Date.now() });
    setPlayerNote('');
  };

  const handleAddAttachment = () => {
    const url = attachmentUrl.trim();
    if (!url) return;
    setAttachments((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        label: attachmentLabel.trim(),
        url,
        type: attachmentType,
      },
    ]);
    setAttachmentLabel('');
    setAttachmentUrl('');
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleAddCustomMission = () => {
    setMissionError('');
    const title = customTitle.trim();
    if (!title) return;
    playSound('button');
    addQueuedMission({
      title,
      summary: customSummary.trim(),
      npc: customNpc.trim(),
      clue: customClue.trim(),
      attachments: attachments.map(({ id, ...rest }) => rest),
    });
    setCustomTitle('');
    setCustomSummary('');
    setCustomNpc('');
    setCustomClue('');
    setAttachments([]);
    setShowMissionPlaceholder(false);
  };

  const handleSendQueuedMission = (mission) => {
    setQueueError('');
    if (!playerId) {
      setQueueError('Selecione um player para enviar a missao.');
      return;
    }
    playSound('button');
    onSendQueuedMission?.(mission, playerId);
    if (mission?.id) {
      removeQueuedMission(mission.id);
    }
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
            <div key={`dm-${mission.title}-${index}`} className="mission-history-item denied-mission-item">
              <div className="denied-mission-header">
                <div className="denied-mission-title">{mission.title}</div>
                {role === 'master' ? (
                  <button className="mission-note-delete" onClick={() => onRemoveDeniedMission?.(index)}>
                    EXCLUIR
                  </button>
                ) : null}
              </div>
              {(mission.summary || mission.npc || mission.clue) ? (
                <details className="denied-mission-details">
                  <summary className="denied-mission-toggle">Detalhes</summary>
                  {mission.summary ? <div className="denied-mission-summary">{mission.summary}</div> : null}
                  {mission.npc ? <div className="denied-mission-meta">NPC: {mission.npc}</div> : null}
                  {mission.clue ? <div className="denied-mission-meta">Pista: {mission.clue}</div> : null}
                  {mission.attachments?.length ? (
                    <div className="denied-mission-meta">
                      Anexos: {mission.attachments.map((att) => att.label || att.url).join(', ')}
                    </div>
                  ) : null}
                </details>
              ) : null}
            </div>
          ))
        ) : (
          <div className="active-mission-empty">Nenhuma.</div>
        )}
      </div>

      {role === 'master' ? (
        <div className="mission-notes-block">
          <div className="mission-notes-header">Gerenciar missoes (mestre)</div>
          <button
            className="mission-note-add"
            onClick={() => {
              setMissionError('');
              setShowMissionPlaceholder(true);
            }}
          >
            ADICIONAR MISSAO
          </button>
        </div>
      ) : null}

      {role === 'master' ? (
        <div className="mission-notes-block">
          <div className="mission-notes-header">Fila de envio</div>
          {queueError ? <div className="mission-note-error">{queueError}</div> : null}
          {queuedMissions.length > 0 ? (
            <div className="mission-queue-list">
              {queuedMissions.map((mission) => (
                <div key={mission.id} className="mission-queue-item">
                  <div className="mission-queue-title">{mission.title}</div>
                  {mission.attachments?.length ? (
                    <div className="mission-queue-meta">{mission.attachments.length} anexos</div>
                  ) : null}
                  <div className="mission-queue-actions">
                    <button className="mission-note-add" onClick={() => handleSendQueuedMission(mission)}>
                      ENVIAR
                    </button>
                    <button className="mission-note-delete" onClick={() => removeQueuedMission(mission.id)}>
                      REMOVER
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mission-note-empty">Fila vazia.</div>
          )}
        </div>
      ) : null}

      {showMissionPlaceholder && role === 'master' ? (
        <div className="mission-placeholder-overlay" onClick={() => setShowMissionPlaceholder(false)}>
          <div className="mission-placeholder-modal" onClick={(event) => event.stopPropagation()}>
            <div className="mission-placeholder-title">Criar missao</div>
            <input
              className="mission-note-input"
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
              placeholder="Titulo da missao"
            />
            <input
              className="mission-note-input"
              value={customSummary}
              onChange={(event) => setCustomSummary(event.target.value)}
              placeholder="Resumo"
            />
            <input
              className="mission-note-input"
              value={customNpc}
              onChange={(event) => setCustomNpc(event.target.value)}
              placeholder="NPC (opcional)"
            />
            <input
              className="mission-note-input"
              value={customClue}
              onChange={(event) => setCustomClue(event.target.value)}
              placeholder="Pista (opcional)"
            />
            <div className="mission-attachments-block">
              <div className="mission-attachments-header">Anexos</div>
              <div className="mission-attachments-form">
                <input
                  className="mission-note-input"
                  value={attachmentLabel}
                  onChange={(event) => setAttachmentLabel(event.target.value)}
                  placeholder="Nome do anexo (opcional)"
                />
                <input
                  className="mission-note-input"
                  value={attachmentUrl}
                  onChange={(event) => setAttachmentUrl(event.target.value)}
                  placeholder="URL do anexo"
                />
                <select
                  className="mission-note-input"
                  value={attachmentType}
                  onChange={(event) => setAttachmentType(event.target.value)}
                >
                  <option value="imagem">Imagem</option>
                  <option value="audio">Audio</option>
                  <option value="documento">Documento</option>
                </select>
                <button className="mission-note-add" onClick={handleAddAttachment}>
                  ADICIONAR ANEXO
                </button>
              </div>
              {attachments.length ? (
                <div className="mission-attachments-list">
                  {attachments.map((att) => (
                    <div key={att.id} className="mission-attachment-item">
                      <span>
                        [{att.type}] {att.label || att.url}
                      </span>
                      <button className="mission-note-delete" onClick={() => handleRemoveAttachment(att.id)}>
                        REMOVER
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {missionError ? <div className="mission-note-error">{missionError}</div> : null}
            <div className="mission-placeholder-actions">
              <button className="mission-note-add" onClick={handleAddCustomMission}>
                SALVAR NA FILA
              </button>
              <button className="mission-note-delete" onClick={() => setShowMissionPlaceholder(false)}>
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mission-notes-block">
        <div className="mission-notes-header">Notas do mestre</div>
        <div className="mission-notes-terminal">
          <div className="mission-notes-log">
            {masterNotes.length > 0 ? (
              masterNotes.map((note) => (
                <div key={note.id} className="mission-note-line">
                  &gt; {note.text}
                  <button className="mission-note-delete" onClick={() => removeMasterNote(note.id)}>X</button>
                </div>
              ))
            ) : (
              <div className="mission-note-empty">Sem notas do mestre.</div>
            )}
          </div>
          <div className="mission-notes-input-row">
            <span className="mission-note-prompt">&gt;</span>
            <input
              className="mission-note-input terminal"
              value={masterNote}
              onChange={(event) => setMasterNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddMasterNote();
                }
              }}
              placeholder="Digite uma nota"
            />
            <button className="mission-note-add" onClick={handleAddMasterNote}>ENTER</button>
          </div>
        </div>
      </div>

      <div className="mission-notes-block">
        <div className="mission-notes-header">Notas do player</div>
        <div className="mission-notes-terminal">
          <div className="mission-notes-log">
            {playerNotes.length > 0 ? (
              playerNotes.map((note) => (
                <div key={note.id} className="mission-note-line">
                  &gt; {note.text}
                  <button className="mission-note-delete" onClick={() => removePlayerNote(note.id)}>X</button>
                </div>
              ))
            ) : (
              <div className="mission-note-empty">Sem notas do player.</div>
            )}
          </div>
          <div className="mission-notes-input-row">
            <span className="mission-note-prompt">&gt;</span>
            <input
              className="mission-note-input terminal"
              value={playerNote}
              onChange={(event) => setPlayerNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddPlayerNote();
                }
              }}
              placeholder="Digite uma nota"
            />
            <button className="mission-note-add" onClick={handleAddPlayerNote}>ENTER</button>
          </div>
        </div>
      </div>
    </div>
  );
}
