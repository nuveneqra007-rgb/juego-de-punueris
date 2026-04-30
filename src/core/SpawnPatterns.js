/**
 * Spawn patterns para cada modo de juego.
 * Cada función devuelve posiciones THREE.Vector3 según la lógica del modo.
 * Puras: no dependen de React ni del store.
 *
 * IMPORTANTE: TODOS los targets se generan pegados a la PARED FRONTAL (z = -19.9).
 * La pared está en z = -20, ancho 40, alto 12 (desde y=-2 a y=10, centro y=2).
 * Rango seguro: x ∈ [-16, 16],  y ∈ [-0.5, 5.5]
 */
import * as THREE from 'three';

// ─── Constantes de la pared ──────────────────────────────────────────────────
const WALL_Z     = -19.9;   // Ligeramente delante de la pared (z = -20) para evitar z-fighting
const WALL_MIN_X = -16;
const WALL_MAX_X =  16;
const WALL_MIN_Y = -0.5;
const WALL_MAX_Y =  5.5;

// ─── Gridshot ────────────────────────────────────────────────────────────────
// 9 posiciones fijas en un grid 3×3 pegadas a la pared frontal.
const GRID_POSITIONS = [];
for (let row = -1; row <= 1; row++) {
  for (let col = -1; col <= 1; col++) {
    GRID_POSITIONS.push(new THREE.Vector3(col * 3.5, row * 1.8 + 2, WALL_Z));
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
// Un solo target a la vez. Aparece en posición extrema del FoV, pegado a la pared.
const FLICK_ZONES = [
  new THREE.Vector3(-8,  2,   WALL_Z),
  new THREE.Vector3( 8,  2,   WALL_Z),
  new THREE.Vector3(-6,  4.5, WALL_Z),
  new THREE.Vector3( 6,  4.5, WALL_Z),
  new THREE.Vector3(-6, -0.2, WALL_Z),
  new THREE.Vector3( 6, -0.2, WALL_Z),
  new THREE.Vector3( 0,  5,   WALL_Z),
  new THREE.Vector3( 0, -0.5, WALL_Z),
  new THREE.Vector3(-12, 2,   WALL_Z),
  new THREE.Vector3( 12, 2,   WALL_Z),
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
// Un target que sigue una trayectoria suave pegada a la pared.
export function trackingPosition(t) {
  // Figura 8 (lemniscata) a velocidad variable, restringida a la pared
  const speed = 0.6;
  const x = Math.sin(t * speed) * 6;
  const y = Math.sin(t * speed * 2) * 2 + 2;
  return new THREE.Vector3(x, y, WALL_Z);
}

// ─── Speed (Gridshot acelerado) ──────────────────────────────────────────────
// Grid 4×4, spawn más rápido, targets más pequeños, pegados a la pared.
const SPEED_GRID = [];
for (let row = -1.5; row <= 1.5; row++) {
  for (let col = -1.5; col <= 1.5; col++) {
    SPEED_GRID.push(new THREE.Vector3(col * 2.8, row * 1.5 + 2, WALL_Z));
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
