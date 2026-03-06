import { playSound } from '../../sound/soundSystem';
import './Menu.css';

export default function LocationsPanel({ onBack }) {
  const handleBack = () => {
    playSound('button');
    onBack();
  };

  return (
    <div className="menu-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">Locais Importantes</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="placeholder-box">
        Nenhum local cadastrado ainda.
      </div>
    </div>
  );
}
