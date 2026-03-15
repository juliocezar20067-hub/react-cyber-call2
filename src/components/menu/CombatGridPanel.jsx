import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { playSound } from '../../sound/soundSystem';
import { getStoredState, setStoredState, subscribeStoredState } from '../../lib/stateStorage';
import './Menu.css';

const GRID_SCOPE = 'combat_grid_v3';

const CELL_SIZE = 2;
const CELL_METERS = 2;
const MIN_COLS = 8;
const MAX_COLS = 40;
const MIN_ROWS = 6;
const MAX_ROWS = 30;

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

const DEFAULT_STATE = {
  grid: { cols: 20, rows: 14 },
  tokens: [],
  cells: {},
  coverHpDefault: 20,
  combat: {
    active: false,
    phase: 'setup',
    round: 0,
    turnOrder: [],
    turnIndex: 0,
    hasMoved: false,
    hasActed: false,
    log: [],
  },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;
const rollD6 = (count) => Array.from({ length: count }, () => rollDie(6));
const getBrawlDice = (body) => (body <= 4 ? 1 : body <= 6 ? 2 : body <= 10 ? 3 : 4);
const getRangeBand = (distance) =>
  distance <= 6 ? 0 : distance <= 12 ? 1 : distance <= 25 ? 2 : distance <= 50 ? 3 : distance <= 100 ? 4 : 5;
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const getDistanceMeters = (a, b) => {
  const dx = (a.x - b.x) * CELL_METERS;
  const dy = (a.y - b.y) * CELL_METERS;
  return Math.sqrt(dx * dx + dy * dy);
};

const hasLineOfSight = (start, end, isWall) => {
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
      if (isWall(x0, y0)) return false;
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
};

const buildMoveRange = (start, maxSteps, isBlocked, isOccupied, cols, rows) => {
  const visited = new Set([`${start.x},${start.y}`]);
  const queue = [{ x: start.x, y: start.y, steps: 0 }];
  const reachable = new Set();
  while (queue.length) {
    const cell = queue.shift();
    if (cell.steps > 0) reachable.add(`${cell.x},${cell.y}`);
    if (cell.steps >= maxSteps) continue;
    const neighbors = [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 },
      { x: cell.x + 1, y: cell.y + 1 },
      { x: cell.x + 1, y: cell.y - 1 },
      { x: cell.x - 1, y: cell.y + 1 },
      { x: cell.x - 1, y: cell.y - 1 },
    ];
    neighbors.forEach((neighbor) => {
      if (neighbor.x < 0 || neighbor.y < 0 || neighbor.x >= cols || neighbor.y >= rows) return;
      const key = `${neighbor.x},${neighbor.y}`;
      if (visited.has(key)) return;
      if (isBlocked(neighbor.x, neighbor.y) || isOccupied(neighbor.x, neighbor.y)) return;
      visited.add(key);
      queue.push({ ...neighbor, steps: cell.steps + 1 });
    });
  }
  return reachable;
};

export default function CombatGridPanel({ onBack, campaignId, playerId }) {
  const panelRef = useRef(null);
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const [systemTime, setSystemTime] = useState('00:00:00');
  const displayPlayer = playerId || 'anon';

  useEffect(() => {
    const updateTime = () => {
      setSystemTime(new Date().toLocaleTimeString('pt-BR', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvasWrap = canvasRef.current;
    const panelEl = panelRef.current;
    const tooltipEl = tooltipRef.current;
    if (!canvasWrap || !panelEl || !tooltipEl) return;

    let disposed = false;
    const storageCampaignId = campaignId || 'nightcity-main';
    const storagePlayerId = '__system__';

    let gridCols = DEFAULT_STATE.grid.cols;
    let gridRows = DEFAULT_STATE.grid.rows;
    let tokens = [];
    let cells = {};
    let coverHpDefault = DEFAULT_STATE.coverHpDefault;
    let combat = { ...DEFAULT_STATE.combat };
    let tool = '';
    let selectedTokenId = null;
    let moveRangeSet = new Set();
    let status = '';
    let statusTimer = null;

    const lastSavedRef = { current: '' };
    const applyingRemoteRef = { current: false };

    const snapshotState = () => ({
      grid: { cols: gridCols, rows: gridRows },
      tokens,
      cells,
      coverHpDefault,
      combat,
    });

    const persistState = () => {
      if (applyingRemoteRef.current) return;
      const snapshot = snapshotState();
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSavedRef.current) return;
      lastSavedRef.current = serialized;
      setStoredState({
        campaignId: storageCampaignId,
        playerId: storagePlayerId,
        scope: GRID_SCOPE,
        data: snapshot,
      });
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07070c);
    scene.fog = new THREE.FogExp2(0x07070c, 0.02);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    camera.position.set(gridCols, 18, gridRows + 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    canvasWrap.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set((gridCols * CELL_SIZE) / 2, 0, (gridRows * CELL_SIZE) / 2);
    controls.minDistance = 6;
    controls.maxDistance = 120;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    const ambientLight = new THREE.AmbientLight(0x334455, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xaaccff, 0.8);
    dirLight.position.set(30, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x78e2ff, 0.45, 80);
    pointLight.position.set((gridCols * CELL_SIZE) / 2, 15, (gridRows * CELL_SIZE) / 2);
    scene.add(pointLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const gridGroup = new THREE.Group();
    scene.add(gridGroup);
    const cellGroup = new THREE.Group();
    scene.add(cellGroup);
    const tokenGroup = new THREE.Group();
    scene.add(tokenGroup);
    const moveRangeGroup = new THREE.Group();
    scene.add(moveRangeGroup);
    const effectGroup = new THREE.Group();
    scene.add(effectGroup);
    const highlightGroup = new THREE.Group();
    scene.add(highlightGroup);

    const clearGroup = (group) => {
      while (group.children.length) {
        const child = group.children[0];
        group.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      }
    };

    const buildGrid = () => {
      clearGroup(gridGroup);

      const groundGeo = new THREE.PlaneGeometry(gridCols * CELL_SIZE, gridRows * CELL_SIZE);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a12,
        roughness: 0.9,
        metalness: 0.1,
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set((gridCols * CELL_SIZE) / 2, -0.01, (gridRows * CELL_SIZE) / 2);
      ground.receiveShadow = true;
      ground.userData = { type: 'ground' };
      gridGroup.add(ground);

      const gridLineMat = new THREE.LineBasicMaterial({ color: 0x78e2ff, opacity: 0.18, transparent: true });
      const points = [];
      for (let x = 0; x <= gridCols; x += 1) {
        points.push(new THREE.Vector3(x * CELL_SIZE, 0, 0));
        points.push(new THREE.Vector3(x * CELL_SIZE, 0, gridRows * CELL_SIZE));
      }
      for (let y = 0; y <= gridRows; y += 1) {
        points.push(new THREE.Vector3(0, 0, y * CELL_SIZE));
        points.push(new THREE.Vector3(gridCols * CELL_SIZE, 0, y * CELL_SIZE));
      }
      const gridGeo = new THREE.BufferGeometry().setFromPoints(points);
      const gridLines = new THREE.LineSegments(gridGeo, gridLineMat);
      gridGroup.add(gridLines);

      controls.target.set((gridCols * CELL_SIZE) / 2, 0, (gridRows * CELL_SIZE) / 2);
      pointLight.position.set((gridCols * CELL_SIZE) / 2, 15, (gridRows * CELL_SIZE) / 2);
    };

    const rebuildCells = () => {
      clearGroup(cellGroup);
      Object.entries(cells).forEach(([key, cell]) => {
        const [x, y] = key.split(',').map(Number);
        if (cell.type === 'wall') {
          const geo = new THREE.BoxGeometry(CELL_SIZE * 0.95, CELL_SIZE * 1.5, CELL_SIZE * 0.95);
          const mat = new THREE.MeshStandardMaterial({
            color: 0x222230,
            roughness: 0.7,
            metalness: 0.4,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(x * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE * 0.75, y * CELL_SIZE + CELL_SIZE / 2);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = { type: 'wall', cellKey: key, gx: x, gy: y };

          const edges = new THREE.EdgesGeometry(geo);
          const lineMat = new THREE.LineBasicMaterial({ color: 0x78e2ff, opacity: 0.35, transparent: true });
          mesh.add(new THREE.LineSegments(edges, lineMat));

          cellGroup.add(mesh);
        } else if (cell.type === 'cover') {
          const hp = cell.hp || 0;
          const height = CELL_SIZE * 0.6;
          const geo = new THREE.BoxGeometry(CELL_SIZE * 0.9, height, CELL_SIZE * 0.9);
          const hue = hp > 15 ? 0x4f7f66 : hp > 5 ? 0x846c32 : 0x883b25;
          const mat = new THREE.MeshStandardMaterial({
            color: hue,
            roughness: 0.8,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(x * CELL_SIZE + CELL_SIZE / 2, height / 2, y * CELL_SIZE + CELL_SIZE / 2);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = { type: 'cover', cellKey: key, gx: x, gy: y, hp };

          const edges = new THREE.EdgesGeometry(geo);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xffaa5c, opacity: 0.4, transparent: true });
          mesh.add(new THREE.LineSegments(edges, lineMat));

          cellGroup.add(mesh);
        }
      });
    };

    const rebuildTokens = () => {
      clearGroup(tokenGroup);
      tokens.forEach((token) => {
        const group = new THREE.Group();
        group.userData = { type: 'token', tokenId: token.id };

        const color = new THREE.Color(token.color || '#d43a3a');
        const isDead = (token.hp || 0) <= 0;

        const bodyH = isDead ? 0.3 : 1.4;
        const bodyGeo = new THREE.CylinderGeometry(CELL_SIZE * 0.35, CELL_SIZE * 0.38, bodyH, 12);
        const bodyMat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.4,
          metalness: 0.6,
          emissive: color,
          emissiveIntensity: isDead ? 0.05 : 0.15,
          transparent: isDead,
          opacity: isDead ? 0.4 : 1,
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = bodyH / 2;
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        if (!isDead) {
          const headGeo = new THREE.SphereGeometry(CELL_SIZE * 0.2, 10, 8);
          const headMat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.3,
            metalness: 0.5,
            emissive: color,
            emissiveIntensity: 0.1,
          });
          const headMesh = new THREE.Mesh(headGeo, headMat);
          headMesh.position.y = bodyH + CELL_SIZE * 0.15;
          headMesh.castShadow = true;
          group.add(headMesh);

          const ringGeo = new THREE.RingGeometry(CELL_SIZE * 0.36, CELL_SIZE * 0.42, 16);
          const ringMat = new THREE.MeshBasicMaterial({
            color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.05;
          group.add(ring);

          const hpRatio = Math.max(0, (token.hp || 0) / (token.maxHp || 1));
          const barWidth = CELL_SIZE * 0.8;
          const barGeo = new THREE.PlaneGeometry(barWidth * hpRatio, 0.15);
          const barColor = hpRatio > 0.5 ? 0x00ff96 : hpRatio > 0.25 ? 0xffaa00 : 0xff4141;
          const barMat = new THREE.MeshBasicMaterial({ color: barColor, side: THREE.DoubleSide });
          const barMesh = new THREE.Mesh(barGeo, barMat);
          barMesh.position.set((barWidth * hpRatio - barWidth) / 2, bodyH + CELL_SIZE * 0.45, 0);
          group.add(barMesh);

          const barBgGeo = new THREE.PlaneGeometry(barWidth, 0.15);
          const barBgMat = new THREE.MeshBasicMaterial({
            color: 0x222222,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
          });
          const barBg = new THREE.Mesh(barBgGeo, barBgMat);
          barBg.position.set(0, bodyH + CELL_SIZE * 0.45, -0.01);
          group.add(barBg);
        }

        const isActive = combat.active && combat.turnOrder[combat.turnIndex] === token.id;
        if (isActive && !isDead) {
          const glowGeo = new THREE.RingGeometry(CELL_SIZE * 0.42, CELL_SIZE * 0.52, 20);
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0x00ff96,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
          });
          const glow = new THREE.Mesh(glowGeo, glowMat);
          glow.rotation.x = -Math.PI / 2;
          glow.position.y = 0.06;
          glow.userData.pulse = true;
          group.add(glow);
        }

        group.position.set(token.x * CELL_SIZE + CELL_SIZE / 2, 0, token.y * CELL_SIZE + CELL_SIZE / 2);
        if (isDead) group.rotation.z = Math.PI / 3;

        tokenGroup.add(group);
      });
    };

    const rebuildMoveRange = () => {
      clearGroup(moveRangeGroup);
      if (combat.active && combat.phase === 'move') {
        const current = getCurrentToken();
        if (current) {
          moveRangeSet = buildMoveRange(
            current,
            Number(current.move) || 0,
            (x, y) => isCellBlocked(x, y),
            (x, y) => isCellOccupied(x, y, current.id),
            gridCols,
            gridRows
          );
        }
      } else {
        moveRangeSet = new Set();
      }
      moveRangeSet.forEach((key) => {
        const [x, y] = key.split(',').map(Number);
        const geo = new THREE.PlaneGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x * CELL_SIZE + CELL_SIZE / 2, 0.03, y * CELL_SIZE + CELL_SIZE / 2);
        mesh.userData = { type: 'moveCell', gx: x, gy: y };
        moveRangeGroup.add(mesh);
      });
    };

    const addShotLine = (from, to, isMelee) => {
      const start = new THREE.Vector3(from.x * CELL_SIZE + CELL_SIZE / 2, 1, from.y * CELL_SIZE + CELL_SIZE / 2);
      const end = new THREE.Vector3(to.x * CELL_SIZE + CELL_SIZE / 2, 1, to.y * CELL_SIZE + CELL_SIZE / 2);
      const points = [start, end];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: isMelee ? 0xffffff : 0xff4400,
        opacity: 0.9,
        transparent: true,
      });
      const line = new THREE.Line(geo, mat);
      line.userData.createdAt = Date.now();
      line.userData.ttl = isMelee ? 200 : 300;
      effectGroup.add(line);
    };

    const addHitMarker = (pos) => {
      const geo = new THREE.SphereGeometry(0.5, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x * CELL_SIZE + CELL_SIZE / 2, 1.2, pos.y * CELL_SIZE + CELL_SIZE / 2);
      mesh.userData.createdAt = Date.now();
      mesh.userData.ttl = 500;
      mesh.userData.isHit = true;
      effectGroup.add(mesh);
    };

    const addDamageFloat = (pos, isCrit) => {
      const geo = new THREE.RingGeometry(0.2, 0.6, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: isCrit ? 0xff0000 : 0xff6600,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pos.x * CELL_SIZE + CELL_SIZE / 2, 0.1, pos.y * CELL_SIZE + CELL_SIZE / 2);
      mesh.userData.createdAt = Date.now();
      mesh.userData.ttl = 600;
      mesh.userData.isRing = true;
      effectGroup.add(mesh);
    };

    const addMoveMarker = (pos) => {
      const geo = new THREE.RingGeometry(0.3, 0.5, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x44aaff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pos.x * CELL_SIZE + CELL_SIZE / 2, 0.08, pos.y * CELL_SIZE + CELL_SIZE / 2);
      mesh.userData.createdAt = Date.now();
      mesh.userData.ttl = 500;
      effectGroup.add(mesh);
    };

    const updateEffects = () => {
      const now = Date.now();
      for (let i = effectGroup.children.length - 1; i >= 0; i -= 1) {
        const child = effectGroup.children[i];
        const age = now - child.userData.createdAt;
        if (age > child.userData.ttl) {
          effectGroup.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        } else {
          const progress = age / child.userData.ttl;
          if (child.material) child.material.opacity = (1 - progress) * 0.9;
          if (child.userData.isHit) child.scale.setScalar(1 + progress * 2);
          if (child.userData.isRing) child.scale.setScalar(1 + progress * 4);
        }
      }
    };

    let hoverHighlight = null;
    const updateHoverHighlight = (gx, gy, show) => {
      if (!hoverHighlight) {
        const geo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x00ff96,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
        });
        hoverHighlight = new THREE.Mesh(geo, mat);
        hoverHighlight.rotation.x = -Math.PI / 2;
        hoverHighlight.position.y = 0.02;
        highlightGroup.add(hoverHighlight);
      }
      hoverHighlight.visible = show;
      if (show) {
        hoverHighlight.position.x = gx * CELL_SIZE + CELL_SIZE / 2;
        hoverHighlight.position.z = gy * CELL_SIZE + CELL_SIZE / 2;

        if (tool === 'wall') hoverHighlight.material.color.set(0x333388);
        else if (tool === 'cover') hoverHighlight.material.color.set(0xffaa00);
        else if (tool === 'erase') hoverHighlight.material.color.set(0xff4444);
        else if (combat.phase === 'move' && moveRangeSet.has(`${gx},${gy}`)) hoverHighlight.material.color.set(0x4488ff);
        else if (combat.phase === 'attack') hoverHighlight.material.color.set(0xff6600);
        else hoverHighlight.material.color.set(0x00ff96);
      }
    };

    let targetableHighlights = [];
    const rebuildTargetableHighlights = () => {
      targetableHighlights.forEach((h) => {
        highlightGroup.remove(h);
        h.geometry.dispose();
        h.material.dispose();
      });
      targetableHighlights = [];

      if (!combat.active || combat.phase !== 'attack') return;
      const attacker = getCurrentToken();
      if (!attacker) return;

      tokens.forEach((token) => {
        if (token.id === attacker.id) return;
        if (token.team === attacker.team) return;
        if ((token.hp || 0) <= 0) return;

        const weapon = WEAPONS[attacker.weaponKey] || WEAPONS.pistola;
        const distance = getDistanceMeters(attacker, token);
        const meleeRange = CELL_METERS * Math.SQRT2 + 0.1;
        const inRange = weapon.melee
          ? distance <= meleeRange
          : weapon.rangeType
            ? RANGE_DV[weapon.rangeType]?.[getRangeBand(distance)] != null
            : false;
        const inSight = weapon.melee
          ? true
          : hasLineOfSight(attacker, token, (x, y) => cells[`${x},${y}`]?.type === 'wall');

        if (inRange && inSight) {
          const geo = new THREE.RingGeometry(CELL_SIZE * 0.45, CELL_SIZE * 0.55, 16);
          const mat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(token.x * CELL_SIZE + CELL_SIZE / 2, 0.07, token.y * CELL_SIZE + CELL_SIZE / 2);
          mesh.userData.pulse = true;
          highlightGroup.add(mesh);
          targetableHighlights.push(mesh);
        }
      });
    };

    const getCurrentToken = () => {
      if (!combat.active || !combat.turnOrder.length) return null;
      return tokens.find((token) => token.id === combat.turnOrder[combat.turnIndex]) || null;
    };

    const isCellBlocked = (x, y) => Boolean(cells[`${x},${y}`]);
    const isCellOccupied = (x, y, ignoreId) => tokens.some((token) => token.id !== ignoreId && token.x === x && token.y === y);

    const isTokenInCover = (token) => {
      if (!token) return false;
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          if (!dx && !dy) continue;
          const cell = cells[`${token.x + dx},${token.y + dy}`];
          if (cell?.type === 'cover' && (cell.hp || 1) > 0) return true;
        }
      }
      return false;
    };

    const appendLog = (message, tone = 'info') => {
      combat.log.push({ id: uid(), message, tone });
      if (combat.log.length > 120) combat.log = combat.log.slice(-120);
      renderPanel();
      persistState();
      setTimeout(() => {
        const logBox = panelEl.querySelector('.log-box');
        if (logBox) logBox.scrollTop = logBox.scrollHeight;
      }, 50);
    };

    const findOpenCell = () => {
      const occupied = new Set(tokens.map((token) => `${token.x},${token.y}`));
      for (let y = 0; y < gridRows; y += 1) {
        for (let x = 0; x < gridCols; x += 1) {
          const key = `${x},${y}`;
          if (!occupied.has(key) && !cells[key]) return { x, y };
        }
      }
      return null;
    };

    const checkCombatEnd = () => {
      const alive = tokens.filter((token) => (token.hp || 0) > 0);
      const teams = new Set(alive.map((token) => token.team));
      if (teams.size <= 1 && combat.active) {
        combat.active = false;
        combat.phase = 'setup';
        const winner = alive[0]?.team ? `Time ${alive[0].team}` : 'Nenhum';
        appendLog(`Combate encerrado. Vencedor: ${winner}.`, 'crit');
      }
    };

    const startCombat = () => {
      if (tokens.length === 0) {
        setStatusMsg('Adicione tokens antes.');
        return;
      }
      const alive = tokens.filter((token) => (token.hp || 0) > 0);
      if (!alive.length) {
        setStatusMsg('Nenhum token vivo.');
        return;
      }

      const withInit = alive.map((token) => ({
        id: token.id,
        roll: Number(token.ref || 0) + rollDie(10) + Math.random() * 0.01,
      }));
      const sorted = withInit.sort((a, b) => b.roll - a.roll).map((entry) => entry.id);

      combat = {
        active: true,
        phase: 'action',
        round: 1,
        turnOrder: sorted,
        turnIndex: 0,
        hasMoved: false,
        hasActed: false,
        log: [{ id: uid(), message: 'Combate iniciado!', tone: 'crit' }],
      };
      moveRangeSet = new Set();

      const first = tokens.find((token) => token.id === sorted[0]);
      if (first) appendLog(`Turno de ${first.name}.`);

      fullRefresh();
    };

    const advanceTurn = () => {
      if (!combat.turnOrder.length) return;
      let next = combat.turnIndex + 1;
      let nextRound = combat.round;
      const aliveIds = new Set(tokens.filter((token) => (token.hp || 0) > 0).map((token) => token.id));
      let safety = 0;
      while (safety < combat.turnOrder.length) {
        if (next >= combat.turnOrder.length) {
          next = 0;
          nextRound += 1;
        }
        if (aliveIds.has(combat.turnOrder[next])) break;
        next += 1;
        safety += 1;
      }
      combat.turnIndex = next;
      combat.round = nextRound;
      combat.phase = 'action';
      combat.hasMoved = false;
      combat.hasActed = false;
      moveRangeSet = new Set();

      const token = getCurrentToken();
      if (token) appendLog(`Turno de ${token.name}.`);

      fullRefresh();
    };

    const endTurn = () => {
      const token = getCurrentToken();
      appendLog(`Fim do turno: ${token?.name || '---'}`);
      advanceTurn();
    };

    const resetCombat = () => {
      combat = { ...DEFAULT_STATE.combat };
      moveRangeSet = new Set();
      appendLog('Combate resetado.', 'warn');
      fullRefresh();
    };

    const enterMove = () => {
      if (!combat.active || combat.hasMoved) return;
      const token = getCurrentToken();
      if (!token) return;

      moveRangeSet = buildMoveRange(
        token,
        Number(token.move) || 0,
        (x, y) => isCellBlocked(x, y),
        (x, y) => isCellOccupied(x, y, token.id),
        gridCols,
        gridRows
      );
      combat.phase = 'move';
      fullRefresh();
    };

    const enterAttack = () => {
      if (!combat.active || combat.hasActed) return;
      const token = getCurrentToken();
      if (!token) return;
      combat.phase = 'attack';
      fullRefresh();
    };

    const handleMoveToCell = (gx, gy) => {
      const token = getCurrentToken();
      if (!token) return;
      const key = `${gx},${gy}`;
      if (!moveRangeSet.has(key)) return;

      token.x = gx;
      token.y = gy;
      combat.hasMoved = true;
      combat.phase = 'action';
      moveRangeSet = new Set();

      addMoveMarker({ x: gx, y: gy });
      fullRefresh();
    };

    const handleAttackToken = (targetId) => {
      const attacker = getCurrentToken();
      if (!attacker) return;
      const target = tokens.find((token) => token.id === targetId);
      if (!target) return;
      if (target.id === attacker.id) return;
      if (target.team === attacker.team) return;
      if ((target.hp || 0) <= 0) {
        appendLog('Alvo fora de combate.', 'warn');
        return;
      }

      const weapon = WEAPONS[attacker.weaponKey] || WEAPONS.pistola;
      const distance = getDistanceMeters(attacker, target);

      if (weapon.melee && distance > CELL_METERS * Math.SQRT2 + 0.1) {
        appendLog('Fora do alcance corpo a corpo.', 'warn');
        return;
      }
      if (!weapon.melee) {
        if (!hasLineOfSight(attacker, target, (x, y) => cells[`${x},${y}`]?.type === 'wall')) {
          appendLog('Sem linha de visao.', 'warn');
          return;
        }
      }

      const roll = rollDie(10);
      const attackBase = weapon.melee
        ? Number(attacker.dex || 0) + Number(attacker.skill || 0)
        : Number(attacker.ref || 0) + Number(attacker.skill || 0);
      const attackTotal = attackBase + roll;
      let hit = false;
      let defenseText = '';

      if (weapon.melee) {
        const dr = rollDie(10);
        const dt = Number(target.dex || 0) + Number(target.evasion || 0) + dr;
        defenseText = `DEX+Evasao ${dt}`;
        hit = attackTotal > dt;
      } else if (target.autoDodge && Number(target.ref || 0) >= 8) {
        const dr = rollDie(10);
        const dt = Number(target.dex || 0) + Number(target.evasion || 0) + dr;
        defenseText = `Esquiva ${dt}`;
        hit = attackTotal > dt;
      } else {
        const band = getRangeBand(distance);
        let dv = weapon.rangeType ? RANGE_DV[weapon.rangeType]?.[band] : null;
        if (dv == null) {
          appendLog('Fora do alcance.', 'warn');
          return;
        }
        if (isTokenInCover(target)) dv += 2;
        defenseText = isTokenInCover(target) ? `DV ${dv} (cobertura)` : `DV ${dv}`;
        hit = attackTotal >= dv;
      }

      appendLog(
        `${attacker.name} ataca ${target.name}: ${attackTotal} vs ${defenseText} (${hit ? 'ACERTOU' : 'ERROU'})`,
        hit ? 'heal' : 'dmg'
      );

      addShotLine(attacker, target, weapon.melee);

      if (!hit) {
        combat.hasActed = true;
        combat.phase = 'action';
        fullRefresh();
        return;
      }

      const diceCount = weapon.brawl ? getBrawlDice(Number(attacker.body || 6)) : weapon.dice;
      const rolls = rollD6(diceCount);
      const total = rolls.reduce((sum, value) => sum + value, 0);
      const crit = rolls.filter((value) => value === 6).length >= 2;
      const effectiveSp = weapon.halfSp ? Math.ceil(Number(target.sp || 0) / 2) : Number(target.sp || 0);
      let damage = Math.max(0, total - effectiveSp);
      if (crit) damage += 5;

      target.hp = (Number(target.hp || 0) - damage);
      if (damage > 0) target.sp = Math.max(0, Number(target.sp || 0) - 1);

      addHitMarker(target);
      addDamageFloat(target, crit);

      appendLog(
        `Dano: ${rolls.join(',')} (${total}) SP ${effectiveSp} => ${damage}${crit ? ' CRITICO!' : ''}`,
        crit ? 'crit' : 'info'
      );

      if (target.hp <= 0) {
        appendLog(`${target.name} caiu!`, 'crit');
      }

      combat.hasActed = true;
      combat.phase = 'action';
      checkCombatEnd();
      fullRefresh();
    };

    const setStatusMsg = (msg) => {
      status = msg;
      renderPanel();
      if (statusTimer) window.clearTimeout(statusTimer);
      statusTimer = window.setTimeout(() => {
        status = '';
        renderPanel();
      }, 3000);
    };

    const getGridCoordsFromIntersect = (intersect) => {
      const point = intersect.point;
      const gx = Math.floor(point.x / CELL_SIZE);
      const gy = Math.floor(point.z / CELL_SIZE);
      if (gx < 0 || gy < 0 || gx >= gridCols || gy >= gridRows) return null;
      return { x: gx, y: gy };
    };

    const onCanvasClick = (event) => {
      if (disposed) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const tokenIntersects = raycaster.intersectObjects(tokenGroup.children, true);
      if (tokenIntersects.length > 0) {
        let obj = tokenIntersects[0].object;
        while (obj.parent && obj.parent !== tokenGroup) obj = obj.parent;
        const tokenId = obj.userData?.tokenId;

        if (combat.active && combat.phase === 'attack' && tokenId) {
          handleAttackToken(tokenId);
          return;
        }

        if (tokenId) {
          selectedTokenId = selectedTokenId === tokenId ? null : tokenId;
          renderPanel();
          return;
        }
      }

      if (combat.active && combat.phase === 'move') {
        const moveIntersects = raycaster.intersectObjects(moveRangeGroup.children, true);
        if (moveIntersects.length > 0) {
          const obj = moveIntersects[0].object;
          if (obj.userData?.type === 'moveCell') {
            handleMoveToCell(obj.userData.gx, obj.userData.gy);
            return;
          }
        }
      }

      const groundIntersects = raycaster.intersectObjects(gridGroup.children.concat(cellGroup.children), true);
      if (groundIntersects.length > 0) {
        const coords = getGridCoordsFromIntersect(groundIntersects[0]);
        if (!coords) return;

        if (combat.active && combat.phase !== 'setup') return;
        if (!tool) return;

        const key = `${coords.x},${coords.y}`;
        if (tokens.some((token) => token.x === coords.x && token.y === coords.y)) {
          setStatusMsg('Celula ocupada por token.');
          return;
        }

        if (tool === 'erase') {
          delete cells[key];
        } else if (tool === 'wall') {
          if (cells[key]?.type === 'wall') delete cells[key];
          else cells[key] = { type: 'wall' };
        } else if (tool === 'cover') {
          if (cells[key]?.type === 'cover') delete cells[key];
          else cells[key] = { type: 'cover', hp: coverHpDefault };
        }

        rebuildCells();
        renderPanel();
        persistState();
      }
    };

    const onCanvasMouseMove = (event) => {
      if (disposed) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        gridGroup.children.concat(cellGroup.children).concat(moveRangeGroup.children),
        true
      );

      if (intersects.length > 0) {
        const coords = getGridCoordsFromIntersect(intersects[0]);
        if (coords) updateHoverHighlight(coords.x, coords.y, true);
        else updateHoverHighlight(0, 0, false);
      } else {
        updateHoverHighlight(0, 0, false);
      }

      const tokenIntersects = raycaster.intersectObjects(tokenGroup.children, true);
      if (tokenIntersects.length > 0) {
        let obj = tokenIntersects[0].object;
        while (obj.parent && obj.parent !== tokenGroup) obj = obj.parent;
        const tokenId = obj.userData?.tokenId;
        const token = tokens.find((entry) => entry.id === tokenId);
        if (token) {
          tooltipEl.style.display = 'block';
          tooltipEl.style.left = `${event.clientX + 12}px`;
          tooltipEl.style.top = `${event.clientY - 10}px`;
          const weapon = WEAPONS[token.weaponKey] || WEAPONS.pistola;
          tooltipEl.innerHTML = `
            <b style="color:${token.color}">${token.name}</b> (Time ${token.team})<br>
            HP: ${token.hp}/${token.maxHp} | SP: ${token.sp}<br>
            REF:${token.ref} DEX:${token.dex} BODY:${token.body}<br>
            Arma: ${weapon.name} | MOVE: ${token.move}<br>
            Pos: ${token.x},${token.y}
          `;
          return;
        }
      }
      tooltipEl.style.display = 'none';
    };

    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('mousemove', onCanvasMouseMove);

    const renderPanel = () => {
      const currentToken = getCurrentToken();

      let html = '';

      html += `<div class="card">
        <div class="card-title">COMBATE</div>
        <div class="card-line">
          ${combat.active ? `<b>Rodada ${combat.round}</b> | ` : '<b>Combate desligado</b> | '}
          ${currentToken ? `Turno: <span style="color:${currentToken.color}">${currentToken.name}</span>` : ''}
        </div>
        ${combat.active && combat.phase !== 'setup'
          ? `<span class="phase-tag phase-${combat.phase}">${combat.phase.toUpperCase()}</span>`
          : ''}
        <div class="card-actions" style="margin-top:6px">
          <button class="btn" onclick="startCombat()" ${combat.active ? 'disabled' : ''}>INICIAR</button>
          <button class="btn danger" onclick="resetCombat()">RESETAR</button>
          <button class="btn ${combat.phase === 'move' ? 'active' : ''}" onclick="enterMove()" ${
            !combat.active || combat.hasMoved || !currentToken ? 'disabled' : ''
          }>MOVER</button>
          <button class="btn attack ${combat.phase === 'attack' ? 'active' : ''}" onclick="enterAttack()" ${
            !combat.active || combat.hasActed || !currentToken ? 'disabled' : ''
          }>ATACAR</button>
          <button class="btn" onclick="endTurn()" ${!combat.active || !currentToken ? 'disabled' : ''}>PASSAR</button>
        </div>
      </div>`;

      html += `<div class="card">
        <div class="card-title">FERRAMENTAS</div>
        <div class="card-actions">
          <button class="btn ${tool === 'wall' ? 'active' : ''}" onclick="setTool('wall')">PAREDE</button>
          <button class="btn ${tool === 'cover' ? 'active' : ''}" onclick="setTool('cover')">COBERTURA</button>
          <button class="btn danger ${tool === 'erase' ? 'active' : ''}" onclick="setTool('erase')">APAGAR</button>
          <button class="btn danger" onclick="clearMap()">LIMPAR MAPA</button>
        </div>
        <div class="row" style="margin-top:6px;align-items:center">
          <label>HP Cobertura:</label>
          <input class="input input-sm" type="number" value="${coverHpDefault}" onchange="updateCoverHp(this.value)">
        </div>
        <div class="helper">Ativa: ${tool ? tool.toUpperCase() : 'NENHUMA'}</div>
      </div>`;

      html += `<div class="card">
        <div class="card-title">GRID</div>
        <div class="row" style="align-items:center">
          <input class="input input-sm" id="gridColsInput" type="number" value="${gridCols}" min="${MIN_COLS}" max="${MAX_COLS}">
          <span>x</span>
          <input class="input input-sm" id="gridRowsInput" type="number" value="${gridRows}" min="${MIN_ROWS}" max="${MAX_ROWS}">
          <button class="btn" onclick="applyGridSize()">APLICAR</button>
        </div>
        <div class="helper">Celulas: ${gridCols}x${gridRows} | 1 celula = ${CELL_METERS}m</div>
        <button class="btn" style="margin-top:6px" onclick="centerCamera()">CENTRALIZAR CAMERA</button>
      </div>`;

      html += `<details class="card">
        <summary>ADICIONAR TOKEN</summary>
        <div style="margin-top:6px">
          <div class="row">
            <input class="input" id="nt_name" placeholder="Nome" value="Token">
            <select class="input" id="nt_team">
              <option value="1">Time 1</option>
              <option value="2">Time 2</option>
              <option value="3">Time 3</option>
            </select>
            <input class="input input-sm" id="nt_color" type="color" value="#d43a3a">
          </div>
          <div class="row">
            <input class="input input-sm" id="nt_hp" type="number" value="30" placeholder="HP">
            <input class="input input-sm" id="nt_maxHp" type="number" value="30" placeholder="MaxHP">
            <input class="input input-sm" id="nt_body" type="number" value="6" placeholder="BODY">
            <input class="input input-sm" id="nt_ref" type="number" value="6" placeholder="REF">
          </div>
          <div class="row">
            <input class="input input-sm" id="nt_dex" type="number" value="6" placeholder="DEX">
            <input class="input input-sm" id="nt_skill" type="number" value="6" placeholder="Hab">
            <input class="input input-sm" id="nt_evasion" type="number" value="6" placeholder="Evasao">
            <input class="input input-sm" id="nt_move" type="number" value="6" placeholder="MOVE">
          </div>
          <div class="row">
            <input class="input input-sm" id="nt_sp" type="number" value="7" placeholder="SP">
            <select class="input" id="nt_weapon">
              ${Object.entries(WEAPONS)
                .map(([key, weapon]) => `<option value="${key}">${weapon.name}</option>`)
                .join('')}
            </select>
          </div>
          <label class="checkbox-label">
            <input type="checkbox" id="nt_autoDodge" checked> Auto esquiva (REF 8+)
          </label>
          <button class="btn" onclick="addToken()" style="margin-top:6px;width:100%">ADICIONAR TOKEN</button>
        </div>
      </details>`;

      html += `<div class="card">
        <div class="card-title">TOKENS (${tokens.length})</div>
        <div class="token-list">`;

      if (tokens.length === 0) {
        html += '<div class="helper">Nenhum token.</div>';
      } else {
        const displayTokens = combat.active
          ? combat.turnOrder
              .map((id) => tokens.find((token) => token.id === id))
              .filter(Boolean)
              .concat(tokens.filter((token) => !combat.turnOrder.includes(token.id)))
          : [...tokens];

        displayTokens.forEach((token) => {
          const isDead = (token.hp || 0) <= 0;
          const isActive = combat.active && combat.turnOrder[combat.turnIndex] === token.id;
          const isSelected = selectedTokenId === token.id;
          const hpRatio = Math.max(0, (token.hp || 0) / (token.maxHp || 1));
          const barColor = hpRatio > 0.5 ? '#00ff96' : hpRatio > 0.25 ? '#ffaa00' : '#ff4141';
          const weapon = WEAPONS[token.weaponKey] || WEAPONS.pistola;

          html += `<div class="token-item ${isDead ? 'dead' : ''} ${isSelected ? 'selected' : ''}" onclick="selectToken('${token.id}')" style="border-left:3px solid ${token.color}">
            <div class="token-header">
              <span>${isActive ? '>> ' : ''}<b style="color:${token.color}">${token.name}</b> <span class="helper">(T${token.team})</span></span>
              <span style="color:${barColor}">${token.hp}/${token.maxHp}</span>
            </div>
            <div class="hp-bar"><div class="hp-bar-fill" style="width:${hpRatio * 100}%;background:${barColor}"></div></div>
            <div class="token-meta">REF:${token.ref} DEX:${token.dex} BODY:${token.body} SP:${token.sp} | ${weapon.name} | Pos:${token.x},${token.y}</div>`;

          if (isSelected) {
            html += `<div style="margin-top:6px;border-top:1px solid rgba(120,226,255,0.2);padding-top:4px">
              <div class="row">
                <input class="input" value="${token.name}" onchange="updateToken('${token.id}','name',this.value)">
                <input class="input input-sm" type="color" value="${token.color}" onchange="updateToken('${token.id}','color',this.value)">
              </div>
              <div class="row">
                <input class="input input-sm" type="number" value="${token.hp}" placeholder="HP" onchange="updateToken('${token.id}','hp',Number(this.value))">
                <input class="input input-sm" type="number" value="${token.maxHp}" placeholder="MaxHP" onchange="updateToken('${token.id}','maxHp',Number(this.value))">
                <input class="input input-sm" type="number" value="${token.body}" placeholder="BODY" onchange="updateToken('${token.id}','body',Number(this.value))">
                <input class="input input-sm" type="number" value="${token.ref}" placeholder="REF" onchange="updateToken('${token.id}','ref',Number(this.value))">
              </div>
              <div class="row">
                <input class="input input-sm" type="number" value="${token.dex}" placeholder="DEX" onchange="updateToken('${token.id}','dex',Number(this.value))">
                <input class="input input-sm" type="number" value="${token.skill}" placeholder="Hab" onchange="updateToken('${token.id}','skill',Number(this.value))">
                <input class="input input-sm" type="number" value="${token.evasion}" placeholder="Evasao" onchange="updateToken('${token.id}','evasion',Number(this.value))">
                <input class="input input-sm" type="number" value="${token.move}" placeholder="MOVE" onchange="updateToken('${token.id}','move',Number(this.value))">
              </div>
              <div class="row">
                <input class="input input-sm" type="number" value="${token.sp}" placeholder="SP" onchange="updateToken('${token.id}','sp',Number(this.value))">
                <select class="input" onchange="updateToken('${token.id}','weaponKey',this.value)">
                  ${Object.entries(WEAPONS)
                    .map(([key, weapon]) => `<option value="${key}" ${key === token.weaponKey ? 'selected' : ''}>${weapon.name}</option>`)
                    .join('')}
                </select>
              </div>
              <label class="checkbox-label">
                <input type="checkbox" ${token.autoDodge ? 'checked' : ''} onchange="updateToken('${token.id}','autoDodge',this.checked)"> Auto esquiva
              </label>
              <button class="btn danger" onclick="removeToken('${token.id}')" style="margin-top:4px">EXCLUIR</button>
            </div>`;
          }

          html += '</div>';
        });
      }

      html += '</div></div>';

      html += `<div class="card">
        <div class="card-title">LOG DE COMBATE</div>
        <div class="log-box">`;

      if (combat.log.length === 0) {
        html += '<div class="helper">Sem eventos.</div>';
      } else {
        combat.log.forEach((entry) => {
          html += `<div class="log-line ${entry.tone || ''}">${entry.message}</div>`;
        });
      }

      html += '</div></div>';

      if (status) {
        html += `<div class="status-msg">AVISO: ${status}</div>`;
      }

      html += buildRulesHTML();

      panelEl.innerHTML = html;
    };

    const buildRulesHTML = () => `
      <details class="card">
        <summary>REGRAS RAPIDAS</summary>
        <div class="rules-grid" style="padding:6px 0">
          <div class="card">
            <div class="card-title">Tempo e Turnos</div>
            <div class="helper">Cada rodada ~3s. Turno: 1 Acao de Movimento + 1 Acao.</div>
          </div>
          <div class="card">
            <div class="card-title">Iniciativa</div>
            <div class="helper">REF + 1d10. Ordem decrescente.</div>
          </div>
          <div class="card">
            <div class="card-title">DV por Distancia</div>
            <table class="combat-table">
              <tr><th>Arma</th><th>0-6</th><th>7-12</th><th>13-25</th><th>26-50</th><th>51-100</th><th>101+</th></tr>
              <tr><td>Pistola</td><td>13</td><td>15</td><td>20</td><td>25</td><td>30</td><td>-</td></tr>
              <tr><td>SMG</td><td>15</td><td>13</td><td>15</td><td>20</td><td>25</td><td>30</td></tr>
              <tr><td>Espingarda</td><td>13</td><td>15</td><td>20</td><td>25</td><td>30</td><td>35</td></tr>
              <tr><td>Rifle Assalto</td><td>17</td><td>16</td><td>15</td><td>13</td><td>15</td><td>20</td></tr>
              <tr><td>Rifle Sniper</td><td>30</td><td>25</td><td>25</td><td>20</td><td>15</td><td>16</td></tr>
              <tr><td>Arco</td><td>15</td><td>13</td><td>15</td><td>17</td><td>20</td><td>22</td></tr>
            </table>
          </div>
          <div class="card">
            <div class="card-title">Armas Brancas</div>
            <table class="combat-table">
              <tr><th>Tipo</th><th>Dano</th><th>Maos</th></tr>
              <tr><td>Leve (faca)</td><td>1d6</td><td>1</td></tr>
              <tr><td>Media (facao)</td><td>2d6</td><td>1-2</td></tr>
              <tr><td>Pesada (espada)</td><td>3d6</td><td>1-2</td></tr>
              <tr><td>M.Pesada (motosserra)</td><td>4d6</td><td>2</td></tr>
            </table>
          </div>
          <div class="card">
            <div class="card-title">Briga</div>
            <div class="helper">BODY &lt;=4: 1d6 | 5-6: 2d6 | 7-10: 3d6 | 11+: 4d6</div>
          </div>
          <div class="card">
            <div class="card-title">Armadura</div>
            <table class="combat-table">
              <tr><th>Tipo</th><th>SP</th><th>Penalidade</th></tr>
              <tr><td>Couro</td><td>4</td><td>-</td></tr>
              <tr><td>Kevlar</td><td>7</td><td>-</td></tr>
              <tr><td>Blindagem Leve</td><td>11</td><td>-</td></tr>
              <tr><td>Blindagem Media</td><td>12</td><td>-2</td></tr>
              <tr><td>Blindagem Pesada</td><td>13</td><td>-2</td></tr>
              <tr><td>Flak</td><td>15</td><td>-4</td></tr>
              <tr><td>Metalgear</td><td>18</td><td>-4</td></tr>
            </table>
          </div>
          <div class="card">
            <div class="card-title">Ferimentos</div>
            <div class="helper">Leve: sem efeito | Grave (&lt;50% HP): -2 acoes | Mortal (&lt;1 HP): Death Save por turno.</div>
          </div>
        </div>
      </details>
    `;

    const fullRefresh = (skipSave = false) => {
      buildGrid();
      rebuildCells();
      rebuildTokens();
      rebuildMoveRange();
      rebuildTargetableHighlights();
      renderPanel();
      if (!skipSave) persistState();
    };

    const centerCamera = () => {
      controls.target.set((gridCols * CELL_SIZE) / 2, 0, (gridRows * CELL_SIZE) / 2);
      camera.position.set(gridCols, 18, gridRows + 12);
      controls.update();
    };

    const applySharedState = (data) => {
      if (disposed) return;
      const merged = {
        ...DEFAULT_STATE,
        ...data,
        grid: { ...DEFAULT_STATE.grid, ...(data?.grid ?? {}) },
        combat: { ...DEFAULT_STATE.combat, ...(data?.combat ?? {}) },
      };
      gridCols = clamp(Number(merged.grid.cols) || DEFAULT_STATE.grid.cols, MIN_COLS, MAX_COLS);
      gridRows = clamp(Number(merged.grid.rows) || DEFAULT_STATE.grid.rows, MIN_ROWS, MAX_ROWS);
      tokens = Array.isArray(merged.tokens) ? merged.tokens : [];
      cells = merged.cells && typeof merged.cells === 'object' ? merged.cells : {};
      coverHpDefault = Number(merged.coverHpDefault) || DEFAULT_STATE.coverHpDefault;
      combat = {
        ...DEFAULT_STATE.combat,
        ...merged.combat,
        log: Array.isArray(merged.combat?.log) ? merged.combat.log : [],
      };
      if (selectedTokenId && !tokens.find((token) => token.id === selectedTokenId)) {
        selectedTokenId = null;
      }
      applyingRemoteRef.current = true;
      fullRefresh(true);
      applyingRemoteRef.current = false;
      lastSavedRef.current = JSON.stringify(snapshotState());
    };

    const handleResize = () => {
      const width = canvasWrap.clientWidth || 1;
      const height = canvasWrap.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvasWrap);

    const clock = new THREE.Clock();
    let pulseTime = 0;
    let animationFrameId = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      pulseTime += delta;

      controls.update();
      updateEffects();

      const pulseVal = (Math.sin(pulseTime * 4) + 1) / 2;

      tokenGroup.children.forEach((group) => {
        group.children.forEach((child) => {
          if (child.userData?.pulse) {
            child.material.opacity = 0.3 + pulseVal * 0.5;
          }
          if (child.geometry?.type === 'PlaneGeometry') {
            child.lookAt(camera.position);
          }
        });
      });

      targetableHighlights.forEach((highlight) => {
        if (highlight.userData?.pulse) {
          highlight.material.opacity = 0.3 + pulseVal * 0.4;
        }
      });

      moveRangeGroup.children.forEach((cell) => {
        cell.material.opacity = 0.15 + pulseVal * 0.15;
      });

      renderer.render(scene, camera);
    };

    const initialLoad = async () => {
      const stored = await getStoredState({
        campaignId: storageCampaignId,
        playerId: storagePlayerId,
        scope: GRID_SCOPE,
        fallback: DEFAULT_STATE,
      });
      applySharedState(stored || DEFAULT_STATE);
    };

    void initialLoad();

    const unsubscribe = subscribeStoredState({
      campaignId: storageCampaignId,
      playerId: storagePlayerId,
      scope: GRID_SCOPE,
      fallback: DEFAULT_STATE,
      onChange: applySharedState,
    });

    const clearMap = () => {
      cells = {};
      fullRefresh();
      setStatusMsg('Mapa limpo.');
    };

    window.startCombat = startCombat;
    window.resetCombat = resetCombat;
    window.enterMove = enterMove;
    window.enterAttack = enterAttack;
    window.endTurn = endTurn;
    window.setTool = (value) => {
      playSound('button');
      tool = tool === value ? '' : value;
      renderPanel();
    };
    window.applyGridSize = () => {
      const cInput = document.getElementById('gridColsInput');
      const rInput = document.getElementById('gridRowsInput');
      const nextCols = clamp(Number(cInput?.value) || gridCols, MIN_COLS, MAX_COLS);
      const nextRows = clamp(Number(rInput?.value) || gridRows, MIN_ROWS, MAX_ROWS);
      gridCols = nextCols;
      gridRows = nextRows;

      tokens.forEach((token) => {
        token.x = clamp(token.x, 0, nextCols - 1);
        token.y = clamp(token.y, 0, nextRows - 1);
      });

      const newCells = {};
      Object.entries(cells).forEach(([key, value]) => {
        const [x, y] = key.split(',').map(Number);
        if (x < nextCols && y < nextRows) newCells[key] = value;
      });
      cells = newCells;

      fullRefresh();
      setStatusMsg(`Grid: ${nextCols}x${nextRows}`);
    };
    window.addToken = () => {
      playSound('button');
      const name = document.getElementById('nt_name')?.value?.trim() || `Token ${tokens.length + 1}`;
      const cell = findOpenCell();
      if (!cell) {
        setStatusMsg('Sem espaco!');
        return;
      }

      tokens.push({
        id: uid(),
        name,
        team: document.getElementById('nt_team')?.value || '1',
        color: document.getElementById('nt_color')?.value || '#d43a3a',
        hp: Number(document.getElementById('nt_hp')?.value) || 30,
        maxHp: Number(document.getElementById('nt_maxHp')?.value) || 30,
        body: Number(document.getElementById('nt_body')?.value) || 6,
        ref: Number(document.getElementById('nt_ref')?.value) || 6,
        dex: Number(document.getElementById('nt_dex')?.value) || 6,
        skill: Number(document.getElementById('nt_skill')?.value) || 6,
        evasion: Number(document.getElementById('nt_evasion')?.value) || 6,
        move: Number(document.getElementById('nt_move')?.value) || 6,
        sp: Number(document.getElementById('nt_sp')?.value) || 7,
        weaponKey: document.getElementById('nt_weapon')?.value || 'pistola',
        autoDodge: document.getElementById('nt_autoDodge')?.checked ?? true,
        x: cell.x,
        y: cell.y,
      });

      fullRefresh();
      setStatusMsg(`${name} adicionado.`);
    };
    window.removeToken = (id) => {
      tokens = tokens.filter((token) => token.id !== id);
      combat.turnOrder = combat.turnOrder.filter((entry) => entry !== id);
      if (combat.turnIndex >= combat.turnOrder.length) combat.turnIndex = 0;
      if (selectedTokenId === id) selectedTokenId = null;
      fullRefresh();
    };
    window.selectToken = (id) => {
      selectedTokenId = selectedTokenId === id ? null : id;
      renderPanel();
    };
    window.updateToken = (id, field, value) => {
      const token = tokens.find((entry) => entry.id === id);
      if (!token) return;
      token[field] = value;
      fullRefresh();
    };
    window.updateCoverHp = (value) => {
      coverHpDefault = Number(value) || 20;
      persistState();
    };
    window.clearMap = clearMap;
    window.centerCamera = () => {
      playSound('button');
      centerCamera();
    };

    handleResize();
    fullRefresh(true);
    animate();

    return () => {
      disposed = true;
      if (statusTimer) window.clearTimeout(statusTimer);
      unsubscribe?.();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', onCanvasClick);
      renderer.domElement.removeEventListener('mousemove', onCanvasMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      clearGroup(gridGroup);
      clearGroup(cellGroup);
      clearGroup(tokenGroup);
      clearGroup(moveRangeGroup);
      clearGroup(effectGroup);
      clearGroup(highlightGroup);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      delete window.startCombat;
      delete window.resetCombat;
      delete window.enterMove;
      delete window.enterAttack;
      delete window.endTurn;
      delete window.setTool;
      delete window.applyGridSize;
      delete window.addToken;
      delete window.removeToken;
      delete window.selectToken;
      delete window.updateToken;
      delete window.updateCoverHp;
      delete window.clearMap;
      delete window.centerCamera;
    };
  }, [campaignId, playerId]);

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  return (
    <div className="menu-shell combat-shell combat-3d-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">Arena de Combate</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="combat-3d-surface">
        <div className="combat-3d-topbar">
          <span>REDE: ESTAVEL | OPERADOR: {displayPlayer}</span>
          <span>{systemTime}</span>
          <span>ARENA DE COMBATE 3D v2.0</span>
        </div>
        <div className="combat-3d-layout">
          <div className="combat-3d-canvas" ref={canvasRef}></div>
          <div className="combat-3d-panel" ref={panelRef}></div>
        </div>
        <div className="combat-3d-tooltip" ref={tooltipRef}></div>
        <div className="combat-3d-instructions">
          Scroll: Zoom | Arrastar: Orbitar | Shift+Arrastar: Pan | Click Grid: Usar Ferramenta
        </div>
      </div>
    </div>
  );
}

