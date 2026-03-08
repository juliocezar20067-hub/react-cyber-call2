import { getCharacterProfile } from '../../constants/characterProfiles';
import { playSound } from '../../sound/soundSystem';
import './Menu.css';

export default function CharacterProfilePanel({ playerId, onBack }) {
  const profile = getCharacterProfile(playerId);

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  if (!profile) {
    return (
      <div className="menu-shell">
        <div className="panel-header-row">
          <h2 className="menu-title">Ficha do Personagem</h2>
          <button className="menu-back" onClick={handleBack}>VOLTAR</button>
        </div>
        <div className="placeholder-box">Perfil nao encontrado.</div>
      </div>
    );
  }

  return (
    <div className="menu-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">Ficha do Personagem</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="character-sheet-block">
        <div className="sheet-label">Dados do Operador</div>
        <div className="sheet-name">{profile.codename}</div>
        <div className="sheet-line">Classe: {profile.role}</div>
        <div className="sheet-line">Nivel: {profile.level}</div>
        <div className="sheet-line">HP: {profile.hp}</div>
        <div className="sheet-line">Cyberware: {profile.cyberware}</div>
        <div className="sheet-line">Especialidade: {profile.trait}</div>
      </div>

      <div className="placeholder-box">
        Placeholder: aqui entram atributos detalhados, perks, equipamentos e historico do personagem.
      </div>
    </div>
  );
}
