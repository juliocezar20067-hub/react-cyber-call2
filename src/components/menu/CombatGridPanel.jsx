import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playSound } from '../../sound/soundSystem';
import { setStoredState, subscribeStoredState } from '../../lib/stateStorage';
import './Menu.css';

const CELL_SIZE = 32;
const CELL_METERS = 2;
const MIN_COLS = 8;
const MAX_COLS = 40;
const MIN_ROWS = 6;
const MAX_ROWS = 30;

const COMBAT_OVERVIEW = [
  {
    title: 'Tempo e turnos',
    text: 'Cada rodada dura cerca de 3 segundos. Em cada turno: 1 Acao de Movimento + 1 Acao.',
  },
  {
    title: 'Iniciativa',
    text: 'Iniciativa = REF + 1d10. Ordem decrescente; empate rola novamente.',
  },
];

const COMBAT_ACTIONS = [
  { action: 'Acao de Movimento', description: 'Move ate MOVE x 2 metros/jardas.' },
  { action: 'Ataque', description: 'Ataque corpo a corpo ou a distancia.' },
  { action: 'Agarrar', description: 'Inicia ou escapa de agarramento; toma objeto.' },
  { action: 'Estrangular', description: '(Requer agarrando) dano = BODY direto nos PV.' },
  { action: 'Derrubar', description: '(Requer agarrando) derruba e causa dano = BODY.' },
  { action: 'Recarregar', description: 'Troca carregador (uma acao).' },
  { action: 'Usar Objeto', description: 'Abrir porta, pegar item, etc.' },
  { action: 'Acao Mantida', description: 'Aguarda um gatilho para agir.' },
  { action: 'Correr', description: 'Ganha uma segunda Acao de Movimento.' },
  { action: 'Entrar no Veiculo', description: 'Entra em veiculo destrancado.' },
  { action: 'Ligar Veiculo', description: 'Liga veiculo e sobe na iniciativa.' },
  { action: 'Estabilizar', description: 'Salva alguem de morrer.' },
  { action: 'Usar Escudo', description: 'Equipar ou soltar escudo (custa acao).' },
  { action: 'Escudo Humano', description: 'Usa oponente agarrado como cobertura.' },
  { action: 'Usar Habilidade', description: 'Teste rapido (ate 3s).' },
];

const RANGED_DV_TABLE = [
  { weapon: 'Pistola', ranges: ['13', '15', '20', '25', '30', '-'] },
  { weapon: 'SMG', ranges: ['15', '13', '15', '20', '25', '30'] },
  { weapon: 'Espingarda', ranges: ['13', '15', '20', '25', '30', '35'] },
  { weapon: 'Rifle de Assalto', ranges: ['17', '16', '15', '13', '15', '20'] },
  { weapon: 'Rifle Sniper', ranges: ['30', '25', '25', '20', '15', '16'] },
  { weapon: 'Arco/Besta', ranges: ['15', '13', '15', '17', '20', '22'] },
  { weapon: 'Lanca-granadas', ranges: ['16', '15', '15', '17', '20', '22'] },
  { weapon: 'Lanca-misseis', ranges: ['17', '16', '15', '15', '20', '20'] },
];

const RANGED_RESOLUTION = [
  'Atacante: REF + habilidade da arma + 1d10.',
  'Defensor pode usar DEX + Evasao + 1d10 se tiver REF 8+.',
  'Empate: defensor vence.',
];

const AUTOFIRE_TABLE = [
  { weapon: 'SMG', ranges: ['20', '17', '20', '25', '30'] },
  { weapon: 'Rifle Assalto', ranges: ['22', '20', '17', '20', '25'] },
];

const SPECIAL_FIRE_MODES = [
  {
    title: 'Disparo Automatico',
    text:
      'Gasta 10 balas. Usa habilidade Autofire. Dano = 2d6 x (quanto passou do DV), limitado ao multiplicador da arma (SMG 3, rifle 4). Se ambos os d6 forem 6, causa Lesao Critica.',
  },
  {
    title: 'Disparo Supressivo',
    text:
      'Gasta 10 balas. Todos em 25m, fora de cobertura e em LoS fazem WILL + Concentracao + 1d10 vs REF + Autofire + 1d10. Quem falhar deve usar a proxima Acao de Movimento para entrar em cobertura.',
  },
  {
    title: 'Explosivos',
    text:
      'Area 10m x 10m. Causa dano a todos na area. Se errar DV, o GM decide onde caiu (dentro da area alvo).',
  },
  {
    title: 'Carga de Chumbo (Shotgun)',
    text:
      'Dispara contra DV13, acerta todos dentro de 6m a sua frente (3 quadrados) com 3d6 de dano cada.',
  },
];

const SPECIAL_AMMO = [
  'Anti-blindagem: reduz SP em 2 ao inves de 1.',
  'Incendiaria: 2 de dano por turno ate apagar.',
  'Borracha: nao causa lesao critica; se reduzir a <1 HP, deixa com 1 HP.',
  'Inteligente: se errar por 4 ou menos, rerrola com +10 (requer link de arma inteligente).',
  'EMP (granadas): teste Cybertech DV15; falha desativa 2 cyberwares por 1 minuto.',
  'Outros: veneno, biotoxina, gas lacrimogeneo, flashbang.',
];

const MELEE_WEAPONS_TABLE = [
  { type: 'Leve', examples: 'Faca, tomahawk', damage: '1d6', hands: '1', concealable: 'Sim', cost: '50eb' },
  { type: 'Media', examples: 'Taco, facao', damage: '2d6', hands: '1 ou 2', concealable: 'Nao', cost: '50eb' },
  { type: 'Pesada', examples: 'Espada, cano de chumbo', damage: '3d6', hands: '1 ou 2', concealable: 'Nao', cost: '100eb' },
  { type: 'Muito Pesada', examples: 'Motosserra, marreta', damage: '4d6', hands: '2', concealable: 'Nao', cost: '500eb' },
];

const MELEE_RESOLUTION = [
  'Atacante: DEX + habilidade (Briga/Arma Branca/Artes Marciais) + 1d10.',
  'Defensor: DEX + Evasao + 1d10. Empate: defensor vence.',
  'Armas brancas ignoram metade do SP (arredondado para cima).',
  'Armas muito pesadas: CDT 1. Demais: CDT 2.',
];

const BRAWLING_RULES = [
  'Dano baseado em BODY:',
  'BODY <= 4: 1d6 | BODY 5-6: 2d6 | BODY 7-10: 3d6 | BODY 11+: 4d6.',
  'Cyberarm: dano minimo 2d6 se BODY <= 4.',
  'Agarrados sofrem -2 em todas as acoes e nao podem usar Acao de Movimento (sao arrastados).',
];

const GRAPPLE_ACTIONS = [
  'Iniciar: DEX + Brawling + 1d10 vs oponente.',
  'Vencer: pode agarrar ou tomar objeto.',
  'Escapar: nova disputa de agarramento.',
  'Estrangular: dano = BODY direto no HP (ignora armadura). 3 turnos seguidos deixam inconsciente.',
  'Derrubar: dano = BODY e alvo cai.',
];

const MARTIAL_ARTS_STYLES = [
  {
    style: 'Recuperacao (comum)',
    moves: ['Ao levantar, teste DV13 para nao gastar acao.'],
  },
  {
    style: 'Aikido',
    moves: [
      'Desarme Combinado: acertar Briga e Arte Marcial no mesmo turno, DV15 para desarmar.',
      'Aperto de Ferro: agarrando, DV15; alvo -2 para escapar e nao pode atacar a distancia.',
    ],
  },
  {
    style: 'Karate',
    moves: [
      'Combinacao Quebra Armadura: acertar arma branca e arte marcial, DV15; armadura perde +2 SP.',
      'Golpe Quebra Ossos (WILL 8+): ataque unico com -8 opcional na cabeca; causa Lesao Critica.',
    ],
  },
  {
    style: 'Judo',
    moves: [
      'Contra-Queda: se desviou de todos ataques corpo a corpo desde ultimo turno, DV15 para derrubar.',
      'Escape de Agarrao: acertar 2 ataques em quem agarra voce, DV15; escapa e causa Braco Quebrado.',
    ],
  },
  {
    style: 'Taekwondo',
    moves: [
      'Golpe de Pontos de Pressao (WILL 8+): ataque unico causa Lesao Espinhal; com -8 na cabeca, Lesao Cerebral.',
      'Voadora (MOVE 8+): mova 4m no turno; ataque em linha reta, alvo cai e sai de veiculo aberto.',
    ],
  },
];

const DEFENSE_RULES = [
  'Qualquer um pode usar Evasao contra ataques corpo a corpo.',
  'Se tiver REF 8+, pode usar Evasao contra ataques a distancia e explosoes.',
];

const COVER_RULES = [
  'Cobertura 2x2m tem HP baseado no material.',
  'Quando a cobertura chega a 0 HP, e destruida; excesso nao passa para quem esta atras (exceto explosivos).',
];

const COVER_MATERIALS = [
  { material: 'Aco', thick: 50, thin: 25 },
  { material: 'Pedra', thick: 40, thin: 20 },
  { material: 'Vidro Blindado', thick: 30, thin: 15 },
  { material: 'Concreto', thick: 25, thin: 10 },
  { material: 'Madeira', thick: 20, thin: 5 },
  { material: 'Gesso/Espuma', thick: 15, thin: 0 },
];

const SHIELD_RULES = [
  'Escudo Balistico: 10 HP, ocupa uma mao, fornece cobertura. Escudo recebe o dano.',
  'Escudo Humano: usa oponente agarrado como cobertura. Ele sofre o dano.',
  'Nao pode bloquear ataques corpo a corpo ou tiros na cabeca.',
];

const ARMOR_RULES = [
  'Cada local (cabeca/corpo) tem SP (Stop Power).',
  'Nao acumula: vale a maior armadura no local.',
  'Penalidade: algumas armaduras reduzem REF/DEX/MOVE.',
  'Ablacao: se sofreu dano, SP do local atingido -1.',
];

const ARMOR_TABLE = [
  { armor: 'Couro', sp: 4, penalty: 'Nenhuma', cost: '20eb' },
  { armor: 'Kevlar', sp: 7, penalty: 'Nenhuma', cost: '50eb' },
  { armor: 'Blindagem Leve', sp: 11, penalty: 'Nenhuma', cost: '100eb' },
  { armor: 'Traje Corporal', sp: 11, penalty: 'Nenhuma', cost: '1000eb' },
  { armor: 'Blindagem Media', sp: 12, penalty: '-2 REF, DEX, MOVE', cost: '100eb' },
  { armor: 'Blindagem Pesada', sp: 13, penalty: '-2 REF, DEX, MOVE', cost: '500eb' },
  { armor: 'Flak', sp: 15, penalty: '-4 REF, DEX, MOVE', cost: '500eb' },
  { armor: 'Metalgear', sp: 18, penalty: '-4 REF, DEX, MOVE', cost: '5000eb' },
];

const DAMAGE_STEPS = [
  'Atacante rola dano.',
  'Subtrai SP do local atingido (cabeca ou corpo).',
  'Dano restante reduz HP.',
  'Se algum dano passou, armadura sofre ablacao (SP -1).',
];

const WOUND_STATES = [
  { state: 'Leve', threshold: 'Abaixo do HP total', effects: 'Nenhum', dv: '10' },
  { state: 'Grave', threshold: 'Abaixo da metade do HP', effects: '-2 em todas as acoes', dv: '13' },
  {
    state: 'Mortal',
    threshold: 'Abaixo de 1 HP',
    effects: '-4 acoes, -6 MOVE (min 1), Death Save por turno, lesao critica a cada ataque, penalidade cumulativa',
    dv: '15 (volta a 1 HP e fica inconsciente por 1 minuto)',
  },
  { state: 'Morto', threshold: 'Falha no Death Save', effects: '-', dv: '-' },
];

const DEATH_SAVE_RULES = [
  'No inicio de cada turno em estado Mortal, role 1d10.',
  'Se resultado <= BODY, sobrevive.',
  'Se rolar 10, falha automaticamente.',
  'Cada Death Save acumula +1 na rolagem.',
  'Lesoes criticas podem aumentar o valor base do Death Save.',
];

const CRIT_INJURY_RULES = [
  'Dois ou mais dados de dano mostrando 6 causam Lesao Critica.',
  'Role 2d6 na tabela apropriada (corpo ou cabeca).',
  'Causa 5 de dano bonus direto no HP e um efeito debilitante.',
  'Tratamento: Correcao Rapida (1 minuto, dura 1 dia) ou Tratamento (4 horas).',
];

const CRIT_BODY_TABLE = [
  { roll: 2, result: 'Braco desmembrado' },
  { roll: 3, result: 'Mao desmembrada' },
  { roll: 4, result: 'Pulmao colapsado' },
  { roll: 5, result: 'Costelas quebradas' },
  { roll: 6, result: 'Braco quebrado' },
  { roll: 7, result: 'Objeto estranho alojado' },
  { roll: 8, result: 'Perna quebrada' },
  { roll: 9, result: 'Lesao muscular' },
  { roll: 10, result: 'Lesao na coluna' },
  { roll: 11, result: 'Dedos esmagados' },
  { roll: 12, result: 'Perna desmembrada' },
];

const CRIT_HEAD_TABLE = [
  { roll: 2, result: 'Olho perdido' },
  { roll: 3, result: 'Lesao cerebral' },
  { roll: 4, result: 'Olho danificado' },
  { roll: 5, result: 'Contusao' },
  { roll: 6, result: 'Maxilar quebrado' },
  { roll: 7, result: 'Objeto estranho alojado' },
  { roll: 8, result: 'Torcicolo' },
  { roll: 9, result: 'Traumatismo craniano' },
  { roll: 10, result: 'Ouvido danificado' },
  { roll: 11, result: 'Traqueia esmagada' },
  { roll: 12, result: 'Ouvido perdido' },
];

const STABILIZATION_RULES = [
  'Acao: TECH + Primeiros Socorros ou Paramedico + 1d10 vs DV.',
  'Leve: DV10 | Grave: DV13 | Mortal: DV15.',
  'Se bem-sucedido em Mortal: volta a 1 HP e fica inconsciente por 1 minuto.',
];

const NATURAL_HEALING = [
  'Apos estabilizado, cura BODY PV por dia de descanso.',
  'Pode ser acelerado por drogas (Speedheal, etc.) ou tratamento hospitalar.',
];

const CRIT_TREATMENT = [
  'Correcao Rapida: 1 minuto, remove efeito por 1 dia.',
  'Tratamento: 4 horas, cura permanente.',
  'Requer Cirurgia (Medtech) ou Cybertech para lesoes em cyberware.',
];

const WEAPONS = {
  pistola: { name: 'Pistola', dice: 2, rangeType: 'pistol', melee: false, halfSp: false },
  smg: { name: 'SMG', dice: 2, rangeType: 'smg', melee: false, halfSp: false },
  espingarda: { name: 'Espingarda', dice: 3, rangeType: 'espingarda', melee: false, halfSp: false },
  rifle_assalto: { name: 'Rifle Assalto', dice: 3, rangeType: 'rifle_assalto', melee: false, halfSp: false },
  rifle_sniper: { name: 'Rifle Sniper', dice: 4, rangeType: 'rifle_sniper', melee: false, halfSp: false },
  arco: { name: 'Arco/Besta', dice: 2, rangeType: 'arco', melee: false, halfSp: false },
  faca: { name: 'Faca', dice: 1, rangeType: null, melee: true, halfSp: true },
  espada: { name: 'Espada', dice: 3, rangeType: null, melee: true, halfSp: true },
  motosserra: { name: 'Motosserra', dice: 4, rangeType: null, melee: true, halfSp: true },
  briga: { name: 'Briga', dice: 0, rangeType: null, melee: true, halfSp: false, brawl: true },
};

const RANGE_DV = {
  pistol: [13, 15, 20, 25, 30, null],
  smg: [15, 13, 15, 20, 25, 30],
  espingarda: [13, 15, 20, 25, 30, 35],
  rifle_assalto: [17, 16, 15, 13, 15, 20],
  rifle_sniper: [30, 25, 25, 20, 15, 16],
  arco: [15, 13, 15, 17, 20, 22],
};

const DEFAULT_TOKEN = {
  name: 'Token',
  team: '1',
  color: '#d43a3a',
  hp: 30,
  maxHp: 30,
  body: 6,
  ref: 6,
  dex: 6,
  skill: 6,
  evasion: 6,
  move: 6,
  sp: 7,
  weaponKey: 'pistola',
  autoDodge: true,
};

const NUMERIC_FIELDS = new Set(['hp', 'maxHp', 'body', 'ref', 'dex', 'skill', 'evasion', 'move', 'sp']);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function findOpenCell(tokens, cols, rows) {
  const occupied = new Set(tokens.map((token) => `${token.x},${token.y}`));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) return { x, y };
    }
  }
  return null;
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollD6(count) {
  return Array.from({ length: count }, () => rollDie(6));
}

function getBrawlDice(body) {
  if (body <= 4) return 1;
  if (body <= 6) return 2;
  if (body <= 10) return 3;
  return 4;
}

function getRangeBand(distance) {
  if (distance <= 6) return 0;
  if (distance <= 12) return 1;
  if (distance <= 25) return 2;
  if (distance <= 50) return 3;
  if (distance <= 100) return 4;
  return 5;
}

function getDistanceMeters(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy) * CELL_METERS;
}

function hasLineOfSight(start, end, isBlocked) {
  let x0 = start.x;
  let y0 = start.y;
  const x1 = end.x;
  const y1 = end.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (x0 !== x1 || y0 !== y1) {
    if (x0 !== start.x || y0 !== start.y) {
      if (isBlocked(x0, y0)) return false;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return true;
}

function buildMoveRange(start, maxSteps, isBlocked, isOccupied, cols, rows) {
  const visited = new Set([`${start.x},${start.y}`]);
  const queue = [{ x: start.x, y: start.y, steps: 0 }];
  const reachable = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (current.steps > 0) {
      reachable.add(`${current.x},${current.y}`);
    }
    if (current.steps >= maxSteps) continue;

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
      { x: current.x + 1, y: current.y + 1 },
      { x: current.x + 1, y: current.y - 1 },
      { x: current.x - 1, y: current.y + 1 },
      { x: current.x - 1, y: current.y - 1 },
    ];

    neighbors.forEach((next) => {
      if (next.x < 0 || next.y < 0 || next.x >= cols || next.y >= rows) return;
      const key = `${next.x},${next.y}`;
      if (visited.has(key)) return;
      if (isBlocked(next.x, next.y) || isOccupied(next.x, next.y)) return;
      visited.add(key);
      queue.push({ ...next, steps: current.steps + 1 });
    });
  }

  return reachable;
}

export default function CombatGridPanel({ onBack, campaignId, playerId }) {
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const lastTurnRef = useRef(null);

  const [gridCols, setGridCols] = useState(24);
  const [gridRows, setGridRows] = useState(16);
  const [colsInput, setColsInput] = useState('24');
  const [rowsInput, setRowsInput] = useState('16');
  const [tokens, setTokens] = useState([]);
  const [cells, setCells] = useState({});
  const [tool, setTool] = useState('');
  const [coverHpInput, setCoverHpInput] = useState('20');
  const [status, setStatus] = useState('');
  const [dragging, setDragging] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [combatState, setCombatState] = useState({
    active: false,
    phase: 'setup',
    round: 0,
    turnOrder: [],
    turnIndex: 0,
    hasMoved: false,
    hasActed: false,
    log: [],
  });
  const [moveRange, setMoveRange] = useState(new Set());
  const [effects, setEffects] = useState({ shots: [], hits: [], floats: [], moves: [] });

  const [newToken, setNewToken] = useState({
    ...DEFAULT_TOKEN,
  });

  const scope = useMemo(() => 'combat_grid_v1', []);
  const sharedPlayerId = '__system__';
  const [systemTime, setSystemTime] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour12: false })
  );
  const columnLabels = useMemo(
    () => Array.from({ length: gridCols }, (_, idx) => String.fromCharCode(65 + (idx % 26))),
    [gridCols]
  );
  const rowLabels = useMemo(() => Array.from({ length: gridRows }, (_, idx) => idx + 1), [gridRows]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString('pt-BR', { hour12: false }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!campaignId) return;

    const unsubscribe = subscribeStoredState({
      campaignId,
      playerId: sharedPlayerId,
      scope,
      fallback: null,
      onChange: (data) => {
        const cols = Number(data?.gridCols) || 24;
        const rows = Number(data?.gridRows) || 16;
        const loadedTokens = Array.isArray(data?.tokens) ? data.tokens : [];
        const loadedCells = data?.cells && typeof data.cells === 'object' ? data.cells : {};
        const loadedCombat = data?.combat && typeof data.combat === 'object' ? data.combat : {};

        setGridCols(clamp(cols, MIN_COLS, MAX_COLS));
        setGridRows(clamp(rows, MIN_ROWS, MAX_ROWS));
        setColsInput(String(clamp(cols, MIN_COLS, MAX_COLS)));
        setRowsInput(String(clamp(rows, MIN_ROWS, MAX_ROWS)));
        setTokens(
          loadedTokens.map((token) => ({
            id: token.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: token.name ?? DEFAULT_TOKEN.name,
            team: token.team ?? DEFAULT_TOKEN.team,
            color: token.color ?? DEFAULT_TOKEN.color,
            hp: Number.isFinite(Number(token.hp)) ? Number(token.hp) : DEFAULT_TOKEN.hp,
            maxHp: Number.isFinite(Number(token.maxHp)) ? Number(token.maxHp) : DEFAULT_TOKEN.maxHp,
            body: Number.isFinite(Number(token.body)) ? Number(token.body) : DEFAULT_TOKEN.body,
            ref: Number.isFinite(Number(token.ref)) ? Number(token.ref) : DEFAULT_TOKEN.ref,
            dex: Number.isFinite(Number(token.dex)) ? Number(token.dex) : DEFAULT_TOKEN.dex,
            skill: Number.isFinite(Number(token.skill)) ? Number(token.skill) : DEFAULT_TOKEN.skill,
            evasion: Number.isFinite(Number(token.evasion)) ? Number(token.evasion) : DEFAULT_TOKEN.evasion,
            move: Number.isFinite(Number(token.move)) ? Number(token.move) : DEFAULT_TOKEN.move,
            sp: Number.isFinite(Number(token.sp)) ? Number(token.sp) : DEFAULT_TOKEN.sp,
            weaponKey: token.weaponKey ?? DEFAULT_TOKEN.weaponKey,
            autoDodge: token.autoDodge !== undefined ? Boolean(token.autoDodge) : DEFAULT_TOKEN.autoDodge,
            x: Number.isFinite(token.x) ? token.x : 0,
            y: Number.isFinite(token.y) ? token.y : 0,
          }))
        );
        const normalizedCells = {};
        Object.entries(loadedCells).forEach(([key, cell]) => {
          if (!cell || typeof cell !== 'object') return;
          const [xRaw, yRaw] = key.split(',').map((value) => Number(value));
          if (!Number.isFinite(xRaw) || !Number.isFinite(yRaw)) return;
          const x = clamp(xRaw, 0, cols - 1);
          const y = clamp(yRaw, 0, rows - 1);
          const type = cell.type === 'cover' ? 'cover' : 'wall';
          const hp = Number.isFinite(Number(cell.hp)) ? Number(cell.hp) : 20;
          normalizedCells[`${x},${y}`] = type === 'cover' ? { type, hp } : { type };
        });
        setCells(normalizedCells);
        setCombatState((prev) => ({
          active: Boolean(loadedCombat.active),
          phase: loadedCombat.phase ?? 'setup',
          round: Number(loadedCombat.round) || 0,
          turnOrder: Array.isArray(loadedCombat.turnOrder) ? loadedCombat.turnOrder : [],
          turnIndex: Number(loadedCombat.turnIndex) || 0,
          hasMoved: Boolean(loadedCombat.hasMoved),
          hasActed: Boolean(loadedCombat.hasActed),
          log: Array.isArray(loadedCombat.log) ? loadedCombat.log : prev.log,
        }));
        setHydrated(true);
      },
    });

    return unsubscribe;
  }, [campaignId, scope]);

  useEffect(() => {
    if (!campaignId || !hydrated) return;
    setStoredState({
      campaignId,
      playerId: sharedPlayerId,
      scope,
      data: {
        gridCols,
        gridRows,
        tokens,
        cells,
        combat: {
          active: combatState.active,
          phase: combatState.phase,
          round: combatState.round,
          turnOrder: combatState.turnOrder,
          turnIndex: combatState.turnIndex,
          hasMoved: combatState.hasMoved,
          hasActed: combatState.hasActed,
          log: combatState.log,
        },
        updatedBy: playerId || 'anon',
      },
    });
  }, [campaignId, cells, combatState, gridCols, gridRows, hydrated, playerId, scope, tokens]);

  const currentTurnTokenId = combatState.turnOrder[combatState.turnIndex];
  const currentToken = tokens.find((token) => token.id === currentTurnTokenId) || null;

  useEffect(() => {
    const handleMove = (event) => {
      if (!dragRef.current || !gridRef.current) return;
      const gridRect = gridRef.current.getBoundingClientRect();
      const relX = event.clientX - gridRect.left;
      const relY = event.clientY - gridRect.top;
      const cellX = clamp(Math.floor(relX / CELL_SIZE), 0, gridCols - 1);
      const cellY = clamp(Math.floor(relY / CELL_SIZE), 0, gridRows - 1);
      setHoverCell({ x: cellX, y: cellY, blocked: Boolean(cells[`${cellX},${cellY}`]) });
      setDragging((prev) => (prev ? { ...prev, x: cellX, y: cellY } : prev));
      if (dragRef.current) {
        dragRef.current = { ...dragRef.current, x: cellX, y: cellY };
      }
    };

    const handleUp = () => {
      if (!dragRef.current) return;
      const active = dragRef.current;
      if (cells[`${active.x},${active.y}`]) {
        setTokens((prev) =>
          prev.map((token) =>
            token.id === active.id ? { ...token, x: active.startX, y: active.startY } : token
          )
        );
      } else {
        setTokens((prev) =>
          prev.map((token) => (token.id === active.id ? { ...token, x: active.x, y: active.y } : token))
        );
      }
      setDragging(null);
      setHoverCell(null);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [cells, gridCols, gridRows]);

  useEffect(() => {
    if (!combatState.active) return;
    if (!currentToken) return;
    if ((currentToken.hp ?? 0) > 0) return;
    advanceTurn();
  }, [combatState.active, currentToken, tokens]);

  useEffect(() => {
    if (combatState.phase !== 'move' && moveRange.size) {
      setMoveRange(new Set());
    }
  }, [combatState.phase, moveRange]);

  const isCellBlocked = (x, y) => Boolean(cells[`${x},${y}`]);
  const isCellOccupied = (x, y, ignoreId) =>
    tokens.some((token) => token.id !== ignoreId && token.x === x && token.y === y);
  const isTokenInCover = (token) => {
    if (!token) return false;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        if (!dx && !dy) continue;
        const x = token.x + dx;
        const y = token.y + dy;
        const cell = cells[`${x},${y}`];
        if (cell?.type === 'cover' && (cell.hp ?? 1) > 0) {
          return true;
        }
      }
    }
    return false;
  };

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  const handleToolToggle = (nextTool) => {
    playSound('button');
    setTool((prev) => (prev === nextTool ? '' : nextTool));
  };

  const appendLog = useCallback((message, tone = 'info') => {
    setCombatState((prev) => {
      const next = [...(prev.log || []), { id: `${Date.now()}-${Math.random()}`, message, tone }];
      return { ...prev, log: next.slice(-120) };
    });
  }, []);

  const addEffect = useCallback((type, payload, ttl = 600) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setEffects((prev) => ({ ...prev, [type]: [...(prev[type] || []), { id, ...payload }] }));
    window.setTimeout(() => {
      setEffects((prev) => ({ ...prev, [type]: prev[type].filter((item) => item.id !== id) }));
    }, ttl);
  }, []);

  const resetCombat = () => {
    lastTurnRef.current = null;
    setCombatState({
      active: false,
      phase: 'setup',
      round: 0,
      turnOrder: [],
      turnIndex: 0,
      hasMoved: false,
      hasActed: false,
      log: [],
    });
    setMoveRange(new Set());
    appendLog('Combate resetado.', 'warn');
  };

  function startCombat() {
    if (tokens.length === 0) {
      setStatus('Adicione tokens antes de iniciar o combate.');
      return;
    }

    const aliveTokens = tokens.filter((token) => (token.hp ?? 0) > 0);
    if (aliveTokens.length === 0) {
      setStatus('Nenhum token vivo para iniciar combate.');
      return;
    }

    const withInitiative = aliveTokens.map((token) => ({
      id: token.id,
      roll: token.ref + rollDie(10) + Math.random() * 0.01,
    }));
    const sorted = withInitiative.sort((a, b) => b.roll - a.roll).map((entry) => entry.id);
    setCombatState({
      active: true,
      phase: 'action',
      round: 1,
      turnOrder: sorted,
      turnIndex: 0,
      hasMoved: false,
      hasActed: false,
      log: [{ id: `${Date.now()}-${Math.random()}`, message: 'Combate iniciado.', tone: 'crit' }],
    });
    lastTurnRef.current = null;
  }

  function advanceTurn() {
    setCombatState((prev) => {
      if (!prev.turnOrder.length) return prev;
      if (!tokens.length) return prev;
      let nextIndex = prev.turnIndex + 1;
      let nextRound = prev.round;
      const aliveIds = new Set(tokens.filter((token) => (token.hp ?? 0) > 0).map((token) => token.id));
      let safety = 0;
      while (safety < prev.turnOrder.length) {
        if (nextIndex >= prev.turnOrder.length) {
          nextIndex = 0;
          nextRound += 1;
        }
        if (aliveIds.has(prev.turnOrder[nextIndex])) break;
        nextIndex += 1;
        safety += 1;
      }
      return {
        ...prev,
        turnIndex: nextIndex,
        round: nextRound,
        phase: 'action',
        hasMoved: false,
        hasActed: false,
      };
    });
    setMoveRange(new Set());
  }

  function enterMove() {
    if (!combatState.active || !currentToken || combatState.hasMoved) return;
    const range = buildMoveRange(
      currentToken,
      Number(currentToken.move) || 0,
      (x, y) => isCellBlocked(x, y),
      (x, y) => isCellOccupied(x, y, currentToken.id),
      gridCols,
      gridRows
    );
    setMoveRange(range);
    setCombatState((prev) => ({ ...prev, phase: 'move' }));
  }

  function enterAttack() {
    if (!combatState.active || !currentToken || combatState.hasActed) return;
    setCombatState((prev) => ({ ...prev, phase: 'attack' }));
  }

  function endTurn() {
    appendLog(`Fim do turno: ${currentToken?.name || '???'}`, 'info');
    advanceTurn();
  }

  const handleApplyGrid = () => {
    const nextCols = clamp(Number(colsInput) || 0, MIN_COLS, MAX_COLS);
    const nextRows = clamp(Number(rowsInput) || 0, MIN_ROWS, MAX_ROWS);
    setGridCols(nextCols);
    setGridRows(nextRows);
    setTokens((prev) =>
      prev.map((token) => ({
        ...token,
        x: clamp(token.x, 0, nextCols - 1),
        y: clamp(token.y, 0, nextRows - 1),
      }))
    );
    setCells((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, cell]) => {
        const [xRaw, yRaw] = key.split(',').map((value) => Number(value));
        if (!Number.isFinite(xRaw) || !Number.isFinite(yRaw)) return;
        if (xRaw >= nextCols || yRaw >= nextRows) return;
        next[key] = cell;
      });
      return next;
    });
    setStatus(`Grid atualizado para ${nextCols}x${nextRows}.`);
  };

  const handleAddToken = () => {
    const name = newToken.name.trim() || `Token ${tokens.length + 1}`;
    const cell = findOpenCell(tokens, gridCols, gridRows);
    if (!cell) {
      setStatus('Sem espaco no grid para novo token.');
      return;
    }
    if (isCellBlocked(cell.x, cell.y)) {
      setStatus('Sem espaco no grid (coberturas/paredes bloqueando).');
      return;
    }

    setTokens((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        team: newToken.team,
        color: newToken.color,
        hp: Number(newToken.hp) || DEFAULT_TOKEN.hp,
        maxHp: Number(newToken.maxHp) || Number(newToken.hp) || DEFAULT_TOKEN.maxHp,
        body: Number(newToken.body) || DEFAULT_TOKEN.body,
        ref: Number(newToken.ref) || DEFAULT_TOKEN.ref,
        dex: Number(newToken.dex) || DEFAULT_TOKEN.dex,
        skill: Number(newToken.skill) || DEFAULT_TOKEN.skill,
        evasion: Number(newToken.evasion) || DEFAULT_TOKEN.evasion,
        move: Number(newToken.move) || DEFAULT_TOKEN.move,
        sp: Number(newToken.sp) || DEFAULT_TOKEN.sp,
        weaponKey: newToken.weaponKey || DEFAULT_TOKEN.weaponKey,
        autoDodge: Boolean(newToken.autoDodge),
        x: cell.x,
        y: cell.y,
      },
    ]);
    setStatus(`Token ${name} adicionado.`);
  };

  const handleRemoveToken = (tokenId) => {
    setTokens((prev) => prev.filter((token) => token.id !== tokenId));
  };

  const handleTokenChange = (tokenId, field, value) => {
    const nextValue = NUMERIC_FIELDS.has(field) ? Number(value) : value;
    setTokens((prev) =>
      prev.map((token) => (token.id === tokenId ? { ...token, [field]: nextValue } : token))
    );
  };

  const handleTokenMouseDown = (event, token) => {
    if (combatState.active && combatState.phase !== 'setup') return;
    event.preventDefault();
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    const relX = event.clientX - gridRect.left;
    const relY = event.clientY - gridRect.top;
    const cellX = clamp(Math.floor(relX / CELL_SIZE), 0, gridCols - 1);
    const cellY = clamp(Math.floor(relY / CELL_SIZE), 0, gridRows - 1);
    setDragging({ id: token.id, x: cellX, y: cellY, startX: token.x, startY: token.y });
    dragRef.current = { id: token.id, x: cellX, y: cellY, startX: token.x, startY: token.y };
  };

  const handleGridMouseMove = (event) => {
    if (!gridRef.current || dragRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const relX = event.clientX - gridRect.left;
    const relY = event.clientY - gridRect.top;
    if (relX < 0 || relY < 0 || relX >= gridRect.width || relY >= gridRect.height) {
      setHoverCell(null);
      return;
    }
    const cellX = clamp(Math.floor(relX / CELL_SIZE), 0, gridCols - 1);
    const cellY = clamp(Math.floor(relY / CELL_SIZE), 0, gridRows - 1);
    setHoverCell({ x: cellX, y: cellY, blocked: Boolean(cells[`${cellX},${cellY}`]) });
  };

  const handleGridMouseLeave = () => {
    if (dragRef.current) return;
    setHoverCell(null);
  };

  const handleGridClick = (event) => {
    if (!gridRef.current) return;
    if (combatState.active && combatState.phase === 'move' && currentToken) {
      const gridRect = gridRef.current.getBoundingClientRect();
      const relX = event.clientX - gridRect.left;
      const relY = event.clientY - gridRect.top;
      const cellX = clamp(Math.floor(relX / CELL_SIZE), 0, gridCols - 1);
      const cellY = clamp(Math.floor(relY / CELL_SIZE), 0, gridRows - 1);
      const key = `${cellX},${cellY}`;
      if (!moveRange.has(key)) return;
      setTokens((prev) =>
        prev.map((token) => (token.id === currentToken.id ? { ...token, x: cellX, y: cellY } : token))
      );
      setCombatState((prev) => ({ ...prev, hasMoved: true, phase: 'action' }));
      setMoveRange(new Set());
      addEffect('moves', { x: cellX, y: cellY }, 420);
      return;
    }

    if (combatState.active && combatState.phase !== 'setup') return;
    if (!tool) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const relX = event.clientX - gridRect.left;
    const relY = event.clientY - gridRect.top;
    const cellX = clamp(Math.floor(relX / CELL_SIZE), 0, gridCols - 1);
    const cellY = clamp(Math.floor(relY / CELL_SIZE), 0, gridRows - 1);
    const key = `${cellX},${cellY}`;
    if (tokens.some((token) => token.x === cellX && token.y === cellY)) {
      setStatus('Essa celula ja possui um token.');
      return;
    }

    setCells((prev) => {
      const next = { ...prev };
      if (tool === 'erase') {
        delete next[key];
        return next;
      }
      if (tool === 'wall') {
        if (next[key]?.type === 'wall') {
          delete next[key];
        } else {
          next[key] = { type: 'wall' };
        }
        return next;
      }
      if (tool === 'cover') {
        if (next[key]?.type === 'cover') {
          delete next[key];
        } else {
          const hp = Number(coverHpInput);
          next[key] = { type: 'cover', hp: Number.isFinite(hp) ? hp : 20 };
        }
        return next;
      }
      return next;
    });
  };

  const handleTokenClick = (token) => {
    if (!combatState.active || combatState.phase !== 'attack' || !currentToken) return;
    if (token.id === currentToken.id) return;
    if (token.team === currentToken.team) return;
    if ((token.hp ?? 0) <= 0) {
      appendLog('Alvo ja esta fora de combate.', 'warn');
      return;
    }
    const weapon = WEAPONS[currentToken.weaponKey] || WEAPONS.pistola;
    const distance = getDistanceMeters(currentToken, token);
    if (weapon.melee && distance > CELL_METERS * Math.SQRT2 + 0.1) {
      appendLog('Alvo fora do alcance corpo a corpo.', 'warn');
      return;
    }
    if (!weapon.melee) {
      const inSight = hasLineOfSight(currentToken, token, (x, y) => cells[`${x},${y}`]?.type === 'wall');
      if (!inSight) {
        appendLog('Sem linha de visao.', 'warn');
        return;
      }
    }

    const roll = rollDie(10);
    const attackBase = weapon.melee ? currentToken.dex + currentToken.skill : currentToken.ref + currentToken.skill;
    const attackTotal = attackBase + roll;
    let hit = false;
    let defenseText = '';

    if (weapon.melee) {
      const defendRoll = rollDie(10);
      const defendTotal = token.dex + token.evasion + defendRoll;
      defenseText = `DEX+Evasao ${defendTotal}`;
      hit = attackTotal > defendTotal;
    } else if (token.autoDodge && token.ref >= 8) {
      const defendRoll = rollDie(10);
      const defendTotal = token.dex + token.evasion + defendRoll;
      defenseText = `Esquiva ${defendTotal}`;
      hit = attackTotal > defendTotal;
    } else {
      const rangeBand = getRangeBand(distance);
      let dv = weapon.rangeType ? RANGE_DV[weapon.rangeType]?.[rangeBand] : null;
      if (dv == null) {
        appendLog('Fora do alcance.', 'warn');
        return;
      }
      const coverBonus = isTokenInCover(token);
      if (coverBonus) {
        dv += 2;
      }
      defenseText = coverBonus ? `DV ${dv} (cobertura)` : `DV ${dv}`;
      hit = attackTotal >= dv;
    }

    appendLog(
      `${currentToken.name} ataca ${token.name}: ${attackTotal} vs ${defenseText} (${hit ? 'ACERTOU' : 'ERROU'})`,
      hit ? 'heal' : 'dmg'
    );

    addEffect(
      'shots',
      {
        x1: currentToken.x,
        y1: currentToken.y,
        x2: token.x,
        y2: token.y,
        melee: weapon.melee,
      },
      weapon.melee ? 200 : 240
    );

    if (!hit) {
      setCombatState((prev) => ({ ...prev, hasActed: true, phase: 'action' }));
      return;
    }

    const diceCount = weapon.brawl ? getBrawlDice(currentToken.body || 6) : weapon.dice;
    const rolls = rollD6(diceCount);
    const total = rolls.reduce((sum, value) => sum + value, 0);
    const crit = rolls.filter((value) => value === 6).length >= 2;
    const effectiveSp = weapon.halfSp ? Math.ceil((token.sp || 0) / 2) : token.sp || 0;
    let damage = Math.max(0, total - effectiveSp);
    if (crit) damage += 5;

    setTokens((prev) =>
      prev.map((entry) => {
        if (entry.id !== token.id) return entry;
        const nextHp = (entry.hp || 0) - damage;
        const nextSp = damage > 0 ? Math.max(0, (entry.sp || 0) - 1) : entry.sp;
        return { ...entry, hp: nextHp, sp: nextSp };
      })
    );

    addEffect(
      'hits',
      {
        x: token.x,
        y: token.y,
      },
      400
    );
    addEffect(
      'floats',
      {
        x: token.x,
        y: token.y,
        text: `-${damage}`,
        tone: crit ? 'crit' : 'dmg',
      },
      700
    );
    appendLog(`Dano: ${rolls.join(', ')} (${total}) SP ${effectiveSp} => ${damage}`, 'info');
    setCombatState((prev) => ({ ...prev, hasActed: true, phase: 'action' }));
  };

  useEffect(() => {
    if (!combatState.active || !currentToken) return;
    if (lastTurnRef.current === currentToken.id) return;
    lastTurnRef.current = currentToken.id;
    appendLog(`Turno de ${currentToken.name}.`, 'info');
  }, [appendLog, combatState.active, currentToken]);

  return (
    <div className="menu-shell combat-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">Arena de Combate</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="combat-layout">
        <div className="combat-grid-wrap">
          <div className="combat-grid-hud">
            REDE: ESTAVEL | SINAL: FORTE | HORA DO SISTEMA: {systemTime}
          </div>
          <div className="combat-grid-frame">
            <div className="combat-axis corner" />
            <div
              className="combat-axis top"
              style={{ gridTemplateColumns: `repeat(${gridCols}, ${CELL_SIZE}px)` }}
            >
              {columnLabels.map((label, idx) => (
                <div key={`col-${label}-${idx}`} className="combat-axis-cell">
                  {label}
                </div>
              ))}
            </div>
            <div
              className="combat-axis left"
              style={{ gridTemplateRows: `repeat(${gridRows}, ${CELL_SIZE}px)` }}
            >
              {rowLabels.map((label, idx) => (
                <div key={`row-${label}-${idx}`} className="combat-axis-cell">
                  {label}
                </div>
              ))}
            </div>
            <div
              ref={gridRef}
              className="combat-grid"
              style={{
                width: `${gridCols * CELL_SIZE}px`,
                height: `${gridRows * CELL_SIZE}px`,
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
              }}
              onMouseMove={handleGridMouseMove}
              onMouseLeave={handleGridMouseLeave}
              onClick={handleGridClick}
            >
              <div className="combat-grid-radar" />
              <div className="combat-grid-scanline" />
              {moveRange.size
                ? Array.from(moveRange).map((key) => {
                    const [x, y] = key.split(',').map((value) => Number(value));
                    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
                    return (
                      <div
                        key={`move-${key}`}
                        className="combat-move-cell"
                        style={{
                          left: `${x * CELL_SIZE}px`,
                          top: `${y * CELL_SIZE}px`,
                          width: `${CELL_SIZE}px`,
                          height: `${CELL_SIZE}px`,
                        }}
                      />
                    );
                  })
                : null}
              {hoverCell ? (
                <div
                  className={`combat-hover ${hoverCell.blocked ? 'is-blocked' : ''}`}
                  style={{
                    left: `${hoverCell.x * CELL_SIZE}px`,
                    top: `${hoverCell.y * CELL_SIZE}px`,
                    width: `${CELL_SIZE}px`,
                    height: `${CELL_SIZE}px`,
                  }}
                />
              ) : null}
              {Object.entries(cells).map(([key, cell]) => {
                const [x, y] = key.split(',').map((value) => Number(value));
                if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
                return (
                  <div
                    key={key}
                    className={`combat-cell ${cell.type}`}
                    style={{
                      left: `${x * CELL_SIZE}px`,
                      top: `${y * CELL_SIZE}px`,
                      width: `${CELL_SIZE}px`,
                      height: `${CELL_SIZE}px`,
                    }}
                  >
                    {cell.type === 'cover' && Number.isFinite(Number(cell.hp)) ? (
                      <span className="combat-cell-hp">{cell.hp}</span>
                    ) : null}
                  </div>
                );
              })}
              {effects.shots.map((shot) => {
                const x1 = shot.x1 * CELL_SIZE + CELL_SIZE / 2;
                const y1 = shot.y1 * CELL_SIZE + CELL_SIZE / 2;
                const x2 = shot.x2 * CELL_SIZE + CELL_SIZE / 2;
                const y2 = shot.y2 * CELL_SIZE + CELL_SIZE / 2;
                const length = Math.hypot(x2 - x1, y2 - y1);
                const angle = Math.atan2(y2 - y1, x2 - x1);
                return (
                  <div
                    key={shot.id}
                    className={`combat-shot-line ${shot.melee ? 'is-melee' : ''}`}
                    style={{
                      left: `${x1}px`,
                      top: `${y1}px`,
                      width: `${length}px`,
                      transform: `rotate(${angle}rad)`,
                    }}
                  />
                );
              })}
              {effects.hits.map((hit) => (
                <div
                  key={hit.id}
                  className="combat-hit-marker"
                  style={{
                    left: `${hit.x * CELL_SIZE + CELL_SIZE / 2}px`,
                    top: `${hit.y * CELL_SIZE + CELL_SIZE / 2}px`,
                  }}
                />
              ))}
              {effects.floats.map((float) => (
                <div
                  key={float.id}
                  className={`combat-damage-float ${float.tone}`}
                  style={{
                    left: `${float.x * CELL_SIZE + CELL_SIZE / 2}px`,
                    top: `${float.y * CELL_SIZE}px`,
                  }}
                >
                  {float.text}
                </div>
              ))}
              {effects.moves.map((move) => (
                <div
                  key={move.id}
                  className="combat-move-marker"
                  style={{
                    left: `${move.x * CELL_SIZE + CELL_SIZE / 2}px`,
                    top: `${move.y * CELL_SIZE + CELL_SIZE / 2}px`,
                  }}
                />
              ))}
              {tokens.map((token) => {
                const isDragging = dragging?.id === token.id;
                const display = isDragging ? dragging : token;
                const isActiveTurn = combatState.active && currentToken?.id === token.id;
                let isTargetable = false;
                if (combatState.active && combatState.phase === 'attack' && currentToken) {
                  if (token.id !== currentToken.id && token.team !== currentToken.team && (token.hp ?? 0) > 0) {
                    const weapon = WEAPONS[currentToken.weaponKey] || WEAPONS.pistola;
                    const distance = getDistanceMeters(currentToken, token);
                    const meleeRange = CELL_METERS * Math.SQRT2 + 0.1;
                    const inRange = weapon.melee
                      ? distance <= meleeRange
                      : weapon.rangeType
                        ? RANGE_DV[weapon.rangeType]?.[getRangeBand(distance)] != null
                        : false;
                    const inSight = weapon.melee
                      ? true
                      : hasLineOfSight(currentToken, token, (x, y) => cells[`${x},${y}`]?.type === 'wall');
                    isTargetable = Boolean(inRange && inSight);
                  }
                }
                return (
                  <div
                    key={token.id}
                    className={`combat-token ${isActiveTurn ? 'is-active' : ''} ${isTargetable ? 'is-targetable' : ''}`}
                    onMouseDown={(event) => handleTokenMouseDown(event, token)}
                    onClick={() => handleTokenClick(token)}
                    style={{
                      left: `${display.x * CELL_SIZE}px`,
                      top: `${display.y * CELL_SIZE}px`,
                      background: token.color,
                    }}
                  >
                    <div className="combat-token-name">{token.name}</div>
                    {token.hp !== '' ? <div className="combat-token-hp">{token.hp}</div> : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="combat-status">
            {status || `Grid ${gridCols}x${gridRows} | Tokens: ${tokens.length}`}
          </div>
          <div className="entry-card">
            <div className="entry-card-title">Log de Combate</div>
            {combatState.log?.length ? (
              <div className="combat-log">
                {combatState.log.map((entry) => (
                  <div key={entry.id} className={`combat-log-line ${entry.tone || ''}`}>
                    {entry.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="entry-card-text">Sem eventos ainda.</div>
            )}
          </div>
        </div>

        <div className="combat-panel">
          <div className="entry-card">
            <div className="entry-card-title">Combate</div>
            <div className="combat-controls">
              <button className="mission-add-btn" onClick={startCombat} disabled={combatState.active}>
                INICIAR COMBATE
              </button>
              <button className="mission-action-btn delete" onClick={resetCombat}>
                RESETAR
              </button>
              <button
                className={`mission-action-btn edit ${combatState.phase === 'move' ? 'is-active' : ''}`}
                onClick={enterMove}
                disabled={!combatState.active || combatState.hasMoved || !currentToken}
              >
                MOVER
              </button>
              <button
                className={`mission-action-btn edit ${combatState.phase === 'attack' ? 'is-active' : ''}`}
                onClick={enterAttack}
                disabled={!combatState.active || combatState.hasActed || !currentToken}
              >
                ATACAR
              </button>
              <button
                className="mission-action-btn"
                onClick={endTurn}
                disabled={!combatState.active || !currentToken}
              >
                PASSAR
              </button>
            </div>
            <div className="entry-card-text">
              {combatState.active ? `Rodada ${combatState.round}` : 'Combate desligado'}
            </div>
            {currentToken ? (
              <div className="entry-card-text">
                Turno: {currentToken.name} (Time {currentToken.team})
              </div>
            ) : null}
            {combatState.phase !== 'setup' && combatState.active ? (
              <div className="entry-tag">Fase: {combatState.phase.toUpperCase()}</div>
            ) : null}
          </div>

          <div className="entry-card">
            <div className="entry-card-title">Ferramentas</div>
            <div className="combat-tools">
              <button
                className={`mission-action-btn edit ${tool === 'wall' ? 'is-active' : ''}`}
                onClick={() => handleToolToggle('wall')}
              >
                PAREDE
              </button>
              <button
                className={`mission-action-btn edit ${tool === 'cover' ? 'is-active' : ''}`}
                onClick={() => handleToolToggle('cover')}
              >
                COBERTURA
              </button>
              <button
                className={`mission-action-btn delete ${tool === 'erase' ? 'is-active' : ''}`}
                onClick={() => handleToolToggle('erase')}
              >
                APAGAR
              </button>
              <input
                className="entry-input"
                value={coverHpInput}
                onChange={(event) => setCoverHpInput(event.target.value)}
                placeholder="HP cobertura"
              />
            </div>
            <div className="entry-card-text">
              Ferramenta ativa: {tool ? tool.toUpperCase() : 'NENHUMA'}
            </div>
          </div>
          <div className="entry-card">
            <div className="entry-card-title">Grid</div>
            <div className="entry-form compact">
              <input
                className="entry-input"
                value={colsInput}
                onChange={(event) => setColsInput(event.target.value)}
                placeholder="Colunas"
              />
              <input
                className="entry-input"
                value={rowsInput}
                onChange={(event) => setRowsInput(event.target.value)}
                placeholder="Linhas"
              />
              <button className="mission-add-btn" onClick={handleApplyGrid}>APLICAR GRID</button>
            </div>
          </div>

          <div className="entry-card">
            <div className="entry-card-title">Adicionar Token</div>
            <div className="entry-form">
              <input
                className="entry-input"
                value={newToken.name}
                onChange={(event) => setNewToken((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nome"
              />
              <select
                className="entry-input"
                value={newToken.team}
                onChange={(event) => setNewToken((prev) => ({ ...prev, team: event.target.value }))}
              >
                <option value="1">Time 1</option>
                <option value="2">Time 2</option>
                <option value="3">Time 3</option>
              </select>
              <input
                className="entry-input"
                value={newToken.color}
                onChange={(event) => setNewToken((prev) => ({ ...prev, color: event.target.value }))}
                placeholder="#cor"
              />
            </div>
            <div className="entry-form compact">
              <input
                className="entry-input"
                value={newToken.hp}
                onChange={(event) => setNewToken((prev) => ({ ...prev, hp: event.target.value }))}
                placeholder="HP"
              />
              <input
                className="entry-input"
                value={newToken.maxHp}
                onChange={(event) => setNewToken((prev) => ({ ...prev, maxHp: event.target.value }))}
                placeholder="HP Max"
              />
              <input
                className="entry-input"
                value={newToken.body}
                onChange={(event) => setNewToken((prev) => ({ ...prev, body: event.target.value }))}
                placeholder="BODY"
              />
              <input
                className="entry-input"
                value={newToken.ref}
                onChange={(event) => setNewToken((prev) => ({ ...prev, ref: event.target.value }))}
                placeholder="REF"
              />
              <input
                className="entry-input"
                value={newToken.dex}
                onChange={(event) => setNewToken((prev) => ({ ...prev, dex: event.target.value }))}
                placeholder="DEX"
              />
              <input
                className="entry-input"
                value={newToken.skill}
                onChange={(event) => setNewToken((prev) => ({ ...prev, skill: event.target.value }))}
                placeholder="Hab"
              />
              <input
                className="entry-input"
                value={newToken.evasion}
                onChange={(event) => setNewToken((prev) => ({ ...prev, evasion: event.target.value }))}
                placeholder="Evasao"
              />
              <input
                className="entry-input"
                value={newToken.move}
                onChange={(event) => setNewToken((prev) => ({ ...prev, move: event.target.value }))}
                placeholder="MOVE"
              />
              <input
                className="entry-input"
                value={newToken.sp}
                onChange={(event) => setNewToken((prev) => ({ ...prev, sp: event.target.value }))}
                placeholder="SP"
              />
              <select
                className="entry-input"
                value={newToken.weaponKey}
                onChange={(event) => setNewToken((prev) => ({ ...prev, weaponKey: event.target.value }))}
              >
                {Object.entries(WEAPONS).map(([key, weapon]) => (
                  <option key={key} value={key}>
                    {weapon.name}
                  </option>
                ))}
              </select>
              <label className="entry-card-text combat-checkbox">
                <input
                  type="checkbox"
                  checked={newToken.autoDodge}
                  onChange={(event) => setNewToken((prev) => ({ ...prev, autoDodge: event.target.checked }))}
                />
                Auto esquiva (REF 8+)
              </label>
            </div>
            <button className="mission-add-btn" onClick={handleAddToken}>ADICIONAR</button>
          </div>

          <div className="entry-card">
            <div className="entry-card-title">Tokens</div>
            {tokens.length === 0 ? (
              <div className="entry-card-text">Nenhum token ainda.</div>
            ) : (
              <div className="entries-list">
                {tokens.map((token) => (
                  <div key={token.id} className="entry-card">
                    <div className="entry-card-title">{token.name}</div>
                    <div className="entry-form compact">
                      <input
                        className="entry-input"
                        value={token.name}
                        onChange={(event) => handleTokenChange(token.id, 'name', event.target.value)}
                      />
                      <input
                        className="entry-input"
                        value={token.hp}
                        onChange={(event) => handleTokenChange(token.id, 'hp', event.target.value)}
                        placeholder="HP"
                      />
                      <input
                        className="entry-input"
                        value={token.maxHp}
                        onChange={(event) => handleTokenChange(token.id, 'maxHp', event.target.value)}
                        placeholder="HP Max"
                      />
                      <input
                        className="entry-input"
                        value={token.body}
                        onChange={(event) => handleTokenChange(token.id, 'body', event.target.value)}
                        placeholder="BODY"
                      />
                      <input
                        className="entry-input"
                        value={token.ref}
                        onChange={(event) => handleTokenChange(token.id, 'ref', event.target.value)}
                        placeholder="REF"
                      />
                      <input
                        className="entry-input"
                        value={token.dex}
                        onChange={(event) => handleTokenChange(token.id, 'dex', event.target.value)}
                        placeholder="DEX"
                      />
                      <input
                        className="entry-input"
                        value={token.skill}
                        onChange={(event) => handleTokenChange(token.id, 'skill', event.target.value)}
                        placeholder="Hab"
                      />
                      <input
                        className="entry-input"
                        value={token.evasion}
                        onChange={(event) => handleTokenChange(token.id, 'evasion', event.target.value)}
                        placeholder="Evasao"
                      />
                      <input
                        className="entry-input"
                        value={token.move}
                        onChange={(event) => handleTokenChange(token.id, 'move', event.target.value)}
                        placeholder="MOVE"
                      />
                      <input
                        className="entry-input"
                        value={token.sp}
                        onChange={(event) => handleTokenChange(token.id, 'sp', event.target.value)}
                        placeholder="SP"
                      />
                      <select
                        className="entry-input"
                        value={token.weaponKey}
                        onChange={(event) => handleTokenChange(token.id, 'weaponKey', event.target.value)}
                      >
                        {Object.entries(WEAPONS).map(([key, weapon]) => (
                          <option key={key} value={key}>
                            {weapon.name}
                          </option>
                        ))}
                      </select>
                      <label className="entry-card-text combat-checkbox">
                        <input
                          type="checkbox"
                          checked={token.autoDodge}
                          onChange={(event) => handleTokenChange(token.id, 'autoDodge', event.target.checked)}
                        />
                        Auto esquiva
                      </label>
                      <input
                        className="entry-input"
                        value={token.color}
                        onChange={(event) => handleTokenChange(token.id, 'color', event.target.value)}
                        placeholder="#cor"
                      />
                      <button
                        className="mission-delete-btn"
                        onClick={() => handleRemoveToken(token.id)}
                      >
                        EXCLUIR
                      </button>
                    </div>
                    <div className="entry-card-text">Pos: {token.x},{token.y}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <details className="combat-rules">
            <summary className="combat-rules-title">Regras Rapidas</summary>
            <div className="combat-rules-body">
              {COMBAT_OVERVIEW.map((item) => (
                <div key={item.title} className="entry-card">
                  <div className="entry-card-title">{item.title}</div>
                  <div className="entry-card-text">{item.text}</div>
                </div>
              ))}

              <div className="entry-card">
                <div className="entry-card-title">Acoes em combate</div>
                <table className="combat-table">
                  <thead>
                    <tr>
                      <th>Acao</th>
                      <th>Descricao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMBAT_ACTIONS.map((row) => (
                      <tr key={row.action}>
                        <td>{row.action}</td>
                        <td>{row.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Combate a distancia (DV)</div>
                <div className="entry-card-text">
                  {RANGED_RESOLUTION.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
                <table className="combat-table">
                  <thead>
                    <tr>
                      <th>Arma</th>
                      <th>0-6m</th>
                      <th>7-12m</th>
                      <th>13-25m</th>
                      <th>26-50m</th>
                      <th>51-100m</th>
                      <th>101-200m</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RANGED_DV_TABLE.map((row) => (
                      <tr key={row.weapon}>
                        <td>{row.weapon}</td>
                        {row.ranges.map((value, idx) => (
                          <td key={`${row.weapon}-${idx}`}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Autofire (DV)</div>
                <table className="combat-table">
                  <thead>
                    <tr>
                      <th>Arma</th>
                      <th>0-6m</th>
                      <th>7-12m</th>
                      <th>13-25m</th>
                      <th>26-50m</th>
                      <th>51-100m</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AUTOFIRE_TABLE.map((row) => (
                      <tr key={row.weapon}>
                        <td>{row.weapon}</td>
                        {row.ranges.map((value, idx) => (
                          <td key={`${row.weapon}-${idx}`}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Modos especiais</div>
                <div className="entries-list">
                  {SPECIAL_FIRE_MODES.map((mode) => (
                    <div key={mode.title} className="entry-card">
                      <div className="entry-card-title">{mode.title}</div>
                      <div className="entry-card-text">{mode.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Municao especial</div>
                <div className="entries-list">
                  {SPECIAL_AMMO.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Combate corpo a corpo</div>
                <div className="entry-card-text">
                  {MELEE_RESOLUTION.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Armas Brancas</div>
                <table className="combat-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Exemplos</th>
                      <th>Dano</th>
                      <th>Maos</th>
                      <th>Ocultavel</th>
                      <th>Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MELEE_WEAPONS_TABLE.map((row) => (
                      <tr key={row.type}>
                        <td>{row.type}</td>
                        <td>{row.examples}</td>
                        <td>{row.damage}</td>
                        <td>{row.hands}</td>
                        <td>{row.concealable}</td>
                        <td>{row.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Briga (Brawling)</div>
                <div className="entries-list">
                  {BRAWLING_RULES.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Agarrar / Estrangular / Derrubar</div>
                <div className="entries-list">
                  {GRAPPLE_ACTIONS.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Artes Marciais</div>
                <div className="entries-list">
                  {MARTIAL_ARTS_STYLES.map((style) => (
                    <div key={style.style} className="entry-card">
                      <div className="entry-card-title">{style.style}</div>
                      <div className="entries-list">
                        {style.moves.map((move) => (
                          <div key={move} className="entry-card-text">
                            {move}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Defesa</div>
                <div className="entries-list">
                  {DEFENSE_RULES.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Cobertura</div>
                <div className="entries-list">
                  {COVER_RULES.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
                <table className="combat-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Grossa HP</th>
                      <th>Fina HP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COVER_MATERIALS.map((row) => (
                      <tr key={row.material}>
                        <td>{row.material}</td>
                        <td>{row.thick}</td>
                        <td>{row.thin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Escudos</div>
                <div className="entries-list">
                  {SHIELD_RULES.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Armadura</div>
                <div className="entries-list">
                  {ARMOR_RULES.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
                <table className="combat-table">
                  <thead>
                    <tr>
                      <th>Armadura</th>
                      <th>SP</th>
                      <th>Penalidade</th>
                      <th>Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ARMOR_TABLE.map((row) => (
                      <tr key={row.armor}>
                        <td>{row.armor}</td>
                        <td>{row.sp}</td>
                        <td>{row.penalty}</td>
                        <td>{row.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Dano e Ferimentos</div>
                <div className="entries-list">
                  {DAMAGE_STEPS.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Estados de Ferimento</div>
                <table className="combat-table">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Limiar</th>
                      <th>Efeitos</th>
                      <th>DV Estabilizacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WOUND_STATES.map((row) => (
                      <tr key={row.state}>
                        <td>{row.state}</td>
                        <td>{row.threshold}</td>
                        <td>{row.effects}</td>
                        <td>{row.dv}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Death Save</div>
                <div className="entries-list">
                  {DEATH_SAVE_RULES.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Lesoes Criticas</div>
                <div className="entries-list">
                  {CRIT_INJURY_RULES.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
                <div className="combat-two-column">
                  <div>
                    <div className="entry-card-title">Corpo (2d6)</div>
                    <table className="combat-table">
                      <thead>
                        <tr>
                          <th>Roll</th>
                          <th>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CRIT_BODY_TABLE.map((row) => (
                          <tr key={row.roll}>
                            <td>{row.roll}</td>
                            <td>{row.result}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="entry-card-title">Cabeca (2d6)</div>
                    <table className="combat-table">
                      <thead>
                        <tr>
                          <th>Roll</th>
                          <th>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CRIT_HEAD_TABLE.map((row) => (
                          <tr key={row.roll}>
                            <td>{row.roll}</td>
                            <td>{row.result}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Estabilizacao</div>
                <div className="entries-list">
                  {STABILIZATION_RULES.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Cura Natural</div>
                <div className="entries-list">
                  {NATURAL_HEALING.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="entry-card">
                <div className="entry-card-title">Tratamento de Lesoes Criticas</div>
                <div className="entries-list">
                  {CRIT_TREATMENT.map((line) => (
                    <div key={line} className="entry-card-text">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

