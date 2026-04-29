/**
 * Spawn patterns para cada modo de juego.
 * Cada función devuelve posiciones THREE.Vector3 según la lógica del modo.
 * Puras: no dependen de React ni del store.
 */
import * as THREE from 'three';

// ─── Gridshot ────────────────────────────────────────────────────────────────
// 9 posiciones fijas en un grid 3×3 a -6 unidades. Matar una spawna otra.
const GRID_POSITIONS = [];
for (let row = -1; row <= 1; row++) {
  for (let col = -1; col <= 1; col++) {
    GRID_POSITIONS.push(new THREE.Vector3(col * 3.5, row * 1.8, -6));
  }
}

export function gridShotSpawn(occupiedIndices = []) {
  // Elegir una posición del grid que no esté ya ocupada
  const available = GRID_POSITIONS
    .map((_, i) => i)
    .filter((i) => !occupiedIndices.includes(i));
  if (available.length === 0) return null;
  const gridIdx = available[Math.floor(Math.random() * available.length)];
  return { pos: GRID_POSITIONS[gridIdx].clone(), gridIdx };
}

// ─── Flick ───────────────────────────────────────────────────────────────────
// Un solo target a la vez. Aparece en posición extrema del FoV (lejos del centro).
const FLICK_ZONES = [
  new THREE.Vector3(-6, 0, -7),
  new THREE.Vector3( 6, 0, -7),
  new THREE.Vector3(-4, 3, -7),
  new THREE.Vector3( 4, 3, -7),
  new THREE.Vector3(-4,-3, -7),
  new THREE.Vector3( 4,-3, -7),
  new THREE.Vector3( 0, 4, -7),
  new THREE.Vector3( 0,-4, -7),
];

let _lastFlickIdx = -1;
export function flickSpawn() {
  // Nunca repetir la misma posición dos veces seguidas
  let idx;
  do { idx = Math.floor(Math.random() * FLICK_ZONES.length); }
  while (idx === _lastFlickIdx);
  _lastFlickIdx = idx;
  return FLICK_ZONES[idx].clone();
}

// ─── Tracking ────────────────────────────────────────────────────────────────
// Un target que sigue una trayectoria suave. La posición se calcula por tiempo.
export function trackingPosition(t) {
  // Figura 8 (lemniscata) a velocidad variable
  const speed = 0.6;
  const x = Math.sin(t * speed) * 4;
  const y = Math.sin(t * speed * 2) * 1.8;
  const z = -7;
  return new THREE.Vector3(x, y, z);
}

// ─── Speed (Gridshot acelerado) ──────────────────────────────────────────────
// Grid 4×4, spawn más rápido, targets más pequeños (escala 0.7)
const SPEED_GRID = [];
for (let row = -1.5; row <= 1.5; row++) {
  for (let col = -1.5; col <= 1.5; col++) {
    SPEED_GRID.push(new THREE.Vector3(col * 2.8, row * 1.5, -5.5));
  }
}

export function speedSpawn(occupiedIndices = []) {
  const available = SPEED_GRID
    .map((_, i) => i)
    .filter((i) => !occupiedIndices.includes(i));
  if (available.length === 0) return null;
  const gridIdx = available[Math.floor(Math.random() * available.length)];
  return { pos: SPEED_GRID[gridIdx].clone(), gridIdx };
}
