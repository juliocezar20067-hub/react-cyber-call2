function randomId() {
  return Math.floor(100 + Math.random() * 900);
}

const RANDOM_PLAYERS = [
  `Player${randomId()}`,
  `Player${randomId()}`,
  `Player${randomId()}`,
];

export const PLAYERS = ['404', 'Soren', ...RANDOM_PLAYERS];

export const ACCESS_KEYS = {
  MESTRE_BRISSE: { role: 'master', playerId: null },
  PLAYER_404_KEY: { role: 'player', playerId: '404' },
  SOREN_KEY: { role: 'player', playerId: 'Soren' },
  RANDOM_PLAYER_1_KEY: { role: 'player', playerId: RANDOM_PLAYERS[0] },
  RANDOM_PLAYER_2_KEY: { role: 'player', playerId: RANDOM_PLAYERS[1] },
  RANDOM_PLAYER_3_KEY: { role: 'player', playerId: RANDOM_PLAYERS[2] },
};
