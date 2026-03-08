import { getCharacterProfile } from '../../constants/characterProfiles';
import { playSound } from '../../sound/soundSystem';
import './Menu.css';

export default function CharacterSheet({ playerId, onOpenProfile }) {
  const profile = getCharacterProfile(playerId);

  if (!profile) {
    return null;
  }

  const handleOpen = () => {
    playSound('button');
    onOpenProfile?.();
  };

  return (
    <button className="character-sheet-block out-of-menu character-sheet-btn" onClick={handleOpen}>
      <div className="sheet-label">Ficha do Personagem</div>
      <div className="sheet-name">{profile.codename}</div>
      <div className="sheet-line">Classe: {profile.role}</div>
      <div className="sheet-line">Nivel: {profile.level}</div>
      <div className="sheet-line">HP: {profile.hp}</div>
      <div className="sheet-line">Cyberware: {profile.cyberware}</div>
      <div className="sheet-line">Especialidade: {profile.trait}</div>
    </button>
  );
}
