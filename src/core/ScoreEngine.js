/**
 * ScoreEngine — Cálculo de puntuación con todos los factores competitivos.
 * Pura, sin efectos secundarios. Testeable de forma aislada.
 */

/**
 * Calcula los puntos por un acierto.
 * @param {object} params
 * @param {number} params.reactionMs   - Tiempo desde spawn hasta disparo en ms
 * @param {number} params.combo        - Combo actual ANTES de este acierto
 * @param {string} params.mode         - Modo de juego activo
 * @returns {number} Puntos a añadir
 */
export function calcHitScore({ reactionMs, combo, mode }) {
  // Base por modo
  const BASE = { gridshot: 100, flick: 150, tracking: 80, speed: 120 };
  const base = BASE[mode] ?? 100;

  // Factor de velocidad de reacción:
  //   < 300ms  → 1.5x  (excelente)
  //   < 600ms  → 1.0x  (bueno)
  //   < 1200ms → 0.7x  (lento)
  //   > 1200ms → 0.5x  (muy lento)
  let timeFactor;
  if      (reactionMs < 300)  timeFactor = 1.5;
  else if (reactionMs < 600)  timeFactor = 1.0;
  else if (reactionMs < 1200) timeFactor = 0.7;
  else                         timeFactor = 0.5;

  // Factor de combo (cada acierto consecutivo añade 5%, tope en +50%)
  const comboMultiplier = 1 + Math.min(combo, 10) * 0.05;

  return Math.round(base * timeFactor * comboMultiplier);
}

/**
 * Penalización por fallo (negativo).
 * @param {string} mode
 * @returns {number} Puntos negativos (ya es un número negativo)
 */
export function calcMissPenalty(mode) {
  const PENALTY = { gridshot: -10, flick: -20, tracking: -5, speed: -15 };
  return PENALTY[mode] ?? -10;
}

/**
 * Clasifica la velocidad de reacción para mostrar en UI.
 * @param {number} reactionMs
 * @returns {{ label: string, color: string }}
 */
export function classifyReaction(reactionMs) {
  if (reactionMs < 250)  return { label: 'ELITE',    color: '#ff2d78' };
  if (reactionMs < 400)  return { label: 'RÁPIDO',   color: '#00ff88' };
  if (reactionMs < 700)  return { label: 'BIEN',     color: '#00d4ff' };
  if (reactionMs < 1200) return { label: 'LENTO',    color: '#ffb800' };
  return                        { label: 'MUY LENTO', color: '#888'   };
}

/**
 * Puntos para modo Tracking con cadencia (AK-47).
 * @param {object} params
 * @param {number} params.consecutiveHits - Impactos consecutivos actuales
 * @param {number} params.combo - Nivel de combo global
 */
export function calcTrackingScore({ consecutiveHits, combo }) {
  const base = 10;
  const streakBonus = Math.min(consecutiveHits, 10) * 2;
  const comboMult = 1 + Math.min(combo, 10) * 0.05;
  return Math.round((base + streakBonus) * comboMult);
}

/**
 * Bonus por destruir (kill) un target en modo Tracking.
 * @param {object} params
 * @param {number} params.timeToKill - Segundos que tomó destruirlo
 * @param {number} params.combo - Nivel de combo global
 */
export function calcTrackingKillBonus({ timeToKill, combo }) {
  const base = timeToKill < 2 ? 300 : timeToKill < 4 ? 200 : timeToKill < 6 ? 150 : 100;
  const comboMult = 1 + Math.min(combo, 10) * 0.05;
  return Math.round(base * comboMult);
}
