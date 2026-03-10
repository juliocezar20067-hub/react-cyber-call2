import { useMemo, useState } from 'react';
import { CALLER_NAME, CONNECTION_CODE, INCOMING_STATUS_TEXT } from '../../constants/ui';
import { playSound } from '../../sound/soundSystem';
import usePanelEntries from '../../hooks/usePanelEntries';
import './Menu.css';

const EVENT_TYPES = ['ligacao', 'video', 'texto', 'intel'];

export default function NpcsPanel({ onBack, onOpenCall, campaignId, playerId }) {
  const defaultContacts = useMemo(
    () => [
      {
        id: 'default-light-finger',
        name: CALLER_NAME,
        role: 'Fixer | Canal Encriptado',
        connection: CONNECTION_CODE,
        status: INCOMING_STATUS_TEXT,
        eventType: 'ligacao',
        avatarUrl: 'https://image2url.com/r2/default/images/1772824379564-be375f73-73b3-4e07-81f9-a0fc9851a25a.png',
      },
    ],
    []
  );

  const { entries, addEntry, removeEntry, updateEntry } = usePanelEntries({
    campaignId,
    playerId,
    panelId: 'contacts',
    defaultEntries: defaultContacts,
  });

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newConnection, setNewConnection] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newEventType, setNewEventType] = useState(EVENT_TYPES[0]);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionSummary, setNewMissionSummary] = useState('');
  const [newMissionClue, setNewMissionClue] = useState('');
  const [showCreatePlaceholder, setShowCreatePlaceholder] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  const handleOpenEvent = (entry) => {
    playSound('button');
    onOpenCall(entry);
  };

  const clearForm = () => {
    setNewName('');
    setNewRole('');
    setNewConnection('');
    setNewStatus('');
    setNewEventType(EVENT_TYPES[0]);
    setNewAvatarUrl('');
    setNewMessageText('');
    setNewAudioUrl('');
    setNewMissionTitle('');
    setNewMissionSummary('');
    setNewMissionClue('');
    setEditingContactId(null);
  };

  const handleAddContact = () => {
    if (!newName.trim()) return;

    const payload = {
      name: newName.trim(),
      role: newRole.trim() || 'Contato',
      connection: newConnection.trim() || 'CONNECTION ---',
      status: newStatus.trim() || 'ENCRYPTED',
      eventType: newEventType,
      avatarUrl: newAvatarUrl.trim() || 'https://via.placeholder.com/160x160?text=NPC',
      messageText: newMessageText.trim(),
      audioUrl: newAudioUrl.trim(),
      mission: {
        title: newMissionTitle.trim() || `Operacao: ${newName.trim()}`,
        npc: newName.trim(),
        summary: newMissionSummary.trim() || 'Sem resumo definido.',
        clue: newMissionClue.trim() || 'Sem pista definida.',
      },
    };

    playSound('button');
    if (editingContactId) {
      updateEntry(editingContactId, payload);
    } else {
      addEntry(payload);
    }

    clearForm();
    setShowCreatePlaceholder(false);
  };

  const handleDeleteContact = (entryId) => {
    playSound('button');
    removeEntry(entryId);
  };

  const handleOpenCreatePlaceholder = () => {
    playSound('button');
    clearForm();
    setShowCreatePlaceholder(true);
  };

  const handleCloseCreatePlaceholder = () => {
    playSound('button');
    clearForm();
    setShowCreatePlaceholder(false);
  };

  const handleEditContact = (entry) => {
    playSound('button');
    setEditingContactId(entry.id);
    setNewName(entry.name ?? '');
    setNewRole(entry.role ?? '');
    setNewConnection(entry.connection ?? '');
    setNewStatus(entry.status ?? '');
    setNewEventType(entry.eventType ?? EVENT_TYPES[0]);
    setNewAvatarUrl(entry.avatarUrl ?? '');
    setNewMessageText(entry.messageText ?? '');
    setNewAudioUrl(entry.audioUrl ?? '');
    setNewMissionTitle(entry.mission?.title ?? '');
    setNewMissionSummary(entry.mission?.summary ?? '');
    setNewMissionClue(entry.mission?.clue ?? '');
    setShowCreatePlaceholder(true);
  };

  return (
    <div className="menu-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">NPCs</h2>
        <div className="entry-actions">
          <button className="mission-add-btn" onClick={handleOpenCreatePlaceholder}>+ NOVO CONTATO</button>
          <button className="menu-back" onClick={handleBack}>VOLTAR</button>
        </div>
      </div>

      <div className="entries-list">
        {entries.map((entry) => (
          <div className="npc-card" key={entry.id}>
            <img
              src={entry.avatarUrl}
              alt={entry.name}
              className="npc-avatar"
            />

            <div className="npc-info">
              <div className="npc-name">{entry.name}</div>
              <div className="npc-meta">{entry.role}</div>
              <div className="npc-connection">{entry.connection}</div>
              <div className="npc-status">{entry.status}</div>
              <div className="entry-tag">EVENTO: {entry.eventType?.toUpperCase()}</div>
              {entry.audioUrl ? <div className="entry-card-text">AUDIO: CONFIGURADO</div> : null}
              <div className="entry-actions">
                <button className="npc-call-btn" onClick={() => handleOpenEvent(entry)}>
                  ABRIR EVENTO
                </button>
                <button className="mission-action-btn edit" onClick={() => handleEditContact(entry)}>
                  EDITAR
                </button>
                <button className="mission-delete-btn" onClick={() => handleDeleteContact(entry.id)}>
                  EXCLUIR
                </button>
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 ? (
          <div className="placeholder-box">Nenhum contato cadastrado.</div>
        ) : null}
      </div>

      {showCreatePlaceholder ? (
        <div className="master-image-overlay" onClick={handleCloseCreatePlaceholder}>
          <div className="master-image-modal npc-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="master-image-title">{editingContactId ? 'Editar Contato' : 'Configurar Contato'}</div>
            <input
              className="entry-input"
              placeholder="Nome do contato"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <input
              className="entry-input"
              placeholder="Cargo / descricao"
              value={newRole}
              onChange={(event) => setNewRole(event.target.value)}
            />
            <input
              className="entry-input"
              placeholder="Connection code"
              value={newConnection}
              onChange={(event) => setNewConnection(event.target.value)}
            />
            <select className="entry-input" value={newEventType} onChange={(event) => setNewEventType(event.target.value)}>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  Evento: {type.toUpperCase()}
                </option>
              ))}
            </select>
            <input
              className="entry-input"
              placeholder="Status (opcional)"
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value)}
            />
            <input
              className="entry-input"
              placeholder="URL da imagem (opcional)"
              value={newAvatarUrl}
              onChange={(event) => setNewAvatarUrl(event.target.value)}
            />
            <input
              className="entry-input"
              placeholder="Texto do evento (mensagem)"
              value={newMessageText}
              onChange={(event) => setNewMessageText(event.target.value)}
            />
            <input
              className="entry-input"
              placeholder="Link do audio (Supabase/public)"
              value={newAudioUrl}
              onChange={(event) => setNewAudioUrl(event.target.value)}
            />
            <input
              className="entry-input"
              placeholder="Missao: titulo"
              value={newMissionTitle}
              onChange={(event) => setNewMissionTitle(event.target.value)}
            />
            <input
              className="entry-input"
              placeholder="Missao: resumo"
              value={newMissionSummary}
              onChange={(event) => setNewMissionSummary(event.target.value)}
            />
            <input
              className="entry-input"
              placeholder="Missao: pista"
              value={newMissionClue}
              onChange={(event) => setNewMissionClue(event.target.value)}
            />
            <div className="master-image-trigger-actions">
              <button className="master-trigger-btn" onClick={handleAddContact}>
                {editingContactId ? 'SALVAR ALTERACOES' : 'SALVAR CONTATO'}
              </button>
              <button className="master-trigger-btn secondary" onClick={handleCloseCreatePlaceholder}>CANCELAR</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
