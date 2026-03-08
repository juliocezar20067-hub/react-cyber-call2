const PRESET_PROFILES = {
  '404': {
    codename: 'Ghost Proxy',
    role: 'Netrunner',
    level: 9,
    hp: '72/100',
    cyberware: 'Neural Link Mk.III',
    trait: 'Invasao silenciosa',
  },
  Soren: {
    codename: 'Iron Pulse',
    role: 'Solo',
    level: 8,
    hp: '84/100',
    cyberware: 'Kerenzikov Boost',
    trait: 'Combate de aproximacao',
  },
};

function hashCode(text) {
  return [...text].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function fallbackProfile(playerId) {
  const seed = hashCode(playerId);
  const level = 4 + (seed % 7);
  const hpCurrent = 55 + (seed % 35);
  const roles = ['Techie', 'Nomad', 'Solo', 'Netrunner'];
  const implants = ['Optical Camo Lite', 'Reflex Tuner', 'Subdermal Grip', 'Datajack V2'];

  return {
    codename: playerId,
    role: roles[seed % roles.length],
    level,
    hp: `${hpCurrent}/100`,
    cyberware: implants[seed % implants.length],
    trait: 'Operador adaptativo',
  };
}

export function getCharacterProfile(playerId) {
  if (!playerId) return null;
  return PRESET_PROFILES[playerId] ?? fallbackProfile(playerId);
}
