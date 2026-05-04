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
export function flickSpawn(coneAngle = 180) {
  let validZones = FLICK_ZONES;
  
  if (coneAngle === 90) {
    validZones = FLICK_ZONES.filter(z => Math.abs(z.x) <= 6 && z.y >= 0);
  } else if (coneAngle === 150) {
    validZones = FLICK_ZONES.filter(z => Math.abs(z.x) <= 8);
  }

  let idx;
  do { idx = Math.floor(Math.random() * validZones.length); }
  while (idx === _lastFlickIdx && validZones.length > 1);
  _lastFlickIdx = idx;
  return validZones[idx].clone();
}

export function trackingPositionLinear(t) {
  const speed = 0.3;
  const x = Math.sin(t * speed) * 8;
  return new THREE.Vector3(x, 2, WALL_Z);
}

export function trackingPositionZigzag(t) {
  const speed = 0.6;
  const x = Math.sin(t * speed) * 8;
  const y = Math.sin(t * speed * 2) * 2 + 2;
  const z = WALL_Z + Math.sin(t * speed * 1.5) * 3; // Profundidad
  return new THREE.Vector3(x, y, z);
}

export function trackingPositionGhost(t) {
  const speed = 0.8;
  const x = Math.sin(t * speed) * 10;
  const y = Math.cos(t * speed * 1.3) * 3 + 2;
  const z = WALL_Z + Math.sin(t * speed * 0.7) * 4;
  return new THREE.Vector3(x, y, z);
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

export function speedApproachDepthSpawn() {
  const x = (Math.random() - 0.5) * 16;
  const y = (Math.random() - 0.5) * 6 + 2;
  return new THREE.Vector3(x, y, -40); // Empieza lejos
}

export function speedApproachHorizontalSpawn() {
  const side = Math.random() > 0.5 ? 1 : -1;
  const x = 20 * side; // Empieza fuera de la pantalla
  const y = (Math.random() - 0.5) * 6 + 2;
  const z = WALL_Z + Math.random() * 5;
  return { pos: new THREE.Vector3(x, y, z), side };
}
