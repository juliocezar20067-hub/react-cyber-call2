import { useState } from 'react';
import { playSound } from '../../sound/soundSystem';
import usePanelEntries from '../../hooks/usePanelEntries';
import './Menu.css';

const LOCATION_TYPES = ['regiao', 'espaco', 'estabelecimento', 'rota', 'zona de risco'];

export default function LocationsPanel({ onBack, campaignId, playerId }) {
  const { entries, addEntry, removeEntry } = usePanelEntries({
    campaignId,
    playerId,
    panelId: 'locations',
  });

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [locationType, setLocationType] = useState(LOCATION_TYPES[0]);

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
      imageUrl: imageUrl.trim(),
      locationType,
    });
    setTitle('');
    setDetails('');
    setImageUrl('');
    setLocationType(LOCATION_TYPES[0]);
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
        <select className="entry-input" value={locationType} onChange={(event) => setLocationType(event.target.value)}>
          {LOCATION_TYPES.map((type) => (
            <option key={type} value={type}>Tipo: {type.toUpperCase()}</option>
          ))}
        </select>
        <input
          className="entry-input"
          placeholder="Descricao / pista"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
        <input
          className="entry-input"
          placeholder="Link da imagem do local (opcional)"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
        />
        <button className="mission-add-btn" onClick={handleAdd}>ADICIONAR LOCAL</button>
      </div>

      <div className="entries-list">
        {entries.length === 0 ? <div className="placeholder-box">Nenhum local cadastrado ainda.</div> : null}
        {entries.map((entry) => (
          <div className="entry-card" key={entry.id}>
            <div className="entry-card-title">{entry.title}</div>
            <div className="entry-tag">TIPO: {entry.locationType?.toUpperCase()}</div>
            <div className="entry-card-text">{entry.details}</div>
            {entry.imageUrl ? (
              <a className="entry-link" href={entry.imageUrl} target="_blank" rel="noreferrer">
                ABRIR IMAGEM
              </a>
            ) : null}
            {entry.imageUrl ? <img className="entry-image-preview" src={entry.imageUrl} alt={entry.title} /> : null}
            <button className="mission-delete-btn" onClick={() => removeEntry(entry.id)}>EXCLUIR</button>
          </div>
        ))}
      </div>
    </div>
  );
}
