import { useState } from 'react';
import { playSound } from '../../sound/soundSystem';
import usePanelEntries from '../../hooks/usePanelEntries';
import './Menu.css';

const EVENT_TYPES = ['texto', 'video', 'ligacao', 'intel'];

export default function LocationsPanel({ onBack, campaignId, playerId }) {
  const { entries, addEntry, removeEntry } = usePanelEntries({
    campaignId,
    playerId,
    panelId: 'locations',
  });

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    playSound('button');
    addEntry({
      title: title.trim(),
      details: details.trim(),
      eventType,
    });
    setTitle('');
    setDetails('');
    setEventType(EVENT_TYPES[0]);
  };

  return (
    <div className="menu-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">Locais Importantes</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="entry-form compact">
        <input
          className="entry-input"
          placeholder="Nome do local"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <select className="entry-input" value={eventType} onChange={(event) => setEventType(event.target.value)}>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>Evento: {type.toUpperCase()}</option>
          ))}
        </select>
        <input
          className="entry-input"
          placeholder="Descricao / pista"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
        <button className="mission-add-btn" onClick={handleAdd}>ADICIONAR LOCAL</button>
      </div>

      <div className="entries-list">
        {entries.length === 0 ? <div className="placeholder-box">Nenhum local cadastrado ainda.</div> : null}
        {entries.map((entry) => (
          <div className="entry-card" key={entry.id}>
            <div className="entry-card-title">{entry.title}</div>
            <div className="entry-tag">EVENTO: {entry.eventType?.toUpperCase()}</div>
            <div className="entry-card-text">{entry.details}</div>
            <button className="mission-delete-btn" onClick={() => removeEntry(entry.id)}>EXCLUIR</button>
          </div>
        ))}
      </div>
    </div>
  );
}
