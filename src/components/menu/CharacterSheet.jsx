import { playSound } from '../../sound/soundSystem';
import './Menu.css';

export default function CharacterSheet({ onOpenProfile }) {
  const handleOpen = () => {
    playSound('button');
    onOpenProfile?.();
  };

  return (
    <button className="character-sheet-block out-of-menu character-sheet-btn" onClick={handleOpen}>
      <div className="sheet-label">Ficha do Personagem</div>
      <div className="sheet-name">Clique para editar</div>
      <div className="sheet-line">Passado, aliados, inimigos, notas pessoais</div>
    </button>
  );
}
