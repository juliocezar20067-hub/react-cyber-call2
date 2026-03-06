import { CALLER_NAME, CONNECTION_CODE } from '../../constants/ui';
import { playSound } from '../../sound/soundSystem';
import './Menu.css';

export default function MainMenu({ onOpenLocations, onOpenNpcs }) {
  const handleOpenLocations = () => {
    playSound('button');
    onOpenLocations();
  };

  const handleOpenNpcs = () => {
    playSound('button');
    onOpenNpcs();
  };

  return (
    <div className="menu-shell">
      <h2 className="menu-title">SISTEMA RED</h2>
      <div className="menu-grid">
        <button className="menu-card" onClick={handleOpenLocations}>
          <span className="menu-card-title">Locais Importantes</span>
          <span className="menu-card-subtitle">Mapeamento de pontos-chave</span>
        </button>

        <button className="menu-card" onClick={handleOpenNpcs}>
          <span className="menu-card-title">NPCs</span>
          <span className="menu-card-subtitle">Contatos e ligacoes ativas</span>
        </button>
      </div>

      <div className="menu-footer">
        ULTIMO CONTATO: {CALLER_NAME} | {CONNECTION_CODE}
      </div>
    </div>
  );
}
