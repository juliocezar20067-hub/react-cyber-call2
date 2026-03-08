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

  const { entries, addEntry, removeEntry } = usePanelEntries({
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

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  const handleOpenEvent = () => {
    playSound('button');
    onOpenCall();
  };

  const handleAddContact = () => {
    if (!newName.trim()) return;

    playSound('button');
    addEntry({
      name: newName.trim(),
      role: newRole.trim() || 'Contato',
      connection: newConnection.trim() || 'CONNECTION ---',
      status: newStatus.trim() || 'ENCRYPTED',
      eventType: newEventType,
      avatarUrl: newAvatarUrl.trim() || 'https://via.placeholder.com/160x160?text=NPC',
    });

    setNewName('');
    setNewRole('');
    setNewConnection('');
    setNewStatus('');
    setNewEventType(EVENT_TYPES[0]);
    setNewAvatarUrl('');
  };

  const handleDeleteContact = (entryId) => {
    playSound('button');
    removeEntry(entryId);
  };

  return (
    <div className="menu-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">NPCs</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="entry-form">
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
        <button className="mission-add-btn" onClick={handleAddContact}>
          ADICIONAR CONTATO
        </button>
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
              <div className="entry-actions">
                <button className="npc-call-btn" onClick={handleOpenEvent}>
                  ABRIR EVENTO
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
    </div>
  );
}
