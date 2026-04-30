import { create } from 'zustand';
import { loadSettings, saveSettings } from '../utils/storage';
import { calcHitScore, calcMissPenalty } from '../core/ScoreEngine';

// ─── Slice de sesión de juego ─────────────────────────────────────────────────
const createGameSlice = (set, get) => ({
  phase:           'menu',   // 'menu' | 'playing' | 'summary'
  mode:            'gridshot',
  score:           0,
  shots:           0,
  hits:            0,
  combo:           0,
  maxCombo:        0,
  timeLeft:        30,
  // Stats de reacción
  totalReactionMs: 0,
  lastReactionMs:  0,   // para mostrar en HUD inmediatamente

  // ── Estado de mecánicas FPS ────────────────────────────────────────────────
  isADS:     false,    // Aim Down Sights (mira / zoom)
  isCrouching: false,  // Agachado

  startSession: (duration = 30, mode = 'gridshot') =>
    set({
      phase: 'playing', mode,
      score: 0, shots: 0, hits: 0, combo: 0, maxCombo: 0,
      timeLeft: duration, totalReactionMs: 0, lastReactionMs: 0,
      isADS: false, isCrouching: false,
    }),

  tick: () =>
    set((s) =>
      s.timeLeft <= 1
        ? { phase: 'summary', timeLeft: 0 }
        : { timeLeft: s.timeLeft - 1 }
    ),

  /**
   * Registra un ACIERTO y calcula puntos via ScoreEngine.
   * @param {number} reactionMs - ms desde spawn hasta disparo
   */
  registerHit: (reactionMs) => {
    const { combo, mode, totalReactionMs, hits } = get();
    const points = calcHitScore({ reactionMs, combo, mode });
    set((s) => {
      const newCombo = s.combo + 1;
      return {
        score:           s.score + points,
        shots:           s.shots + 1,
        hits:            s.hits + 1,
        combo:           newCombo,
        maxCombo:        Math.max(s.maxCombo, newCombo),
        totalReactionMs: s.totalReactionMs + reactionMs,
        lastReactionMs:  reactionMs,
      };
    });
    return points; // útil para mostrar +pts flotando
  },

  /**
   * Registra un FALLO, aplica penalización.
   */
  registerMiss: () => {
    const { mode } = get();
    const penalty = calcMissPenalty(mode);
    set((s) => ({
      score:  Math.max(0, s.score + penalty),
      shots:  s.shots + 1,
      combo:  0,
    }));
  },

  // Compatibilidad retroactiva usada por code antiguo (no eliminar todavía)
  registerShot: (hit, reactionMs = 500) => {
    if (hit) get().registerHit(reactionMs);
    else     get().registerMiss();
  },

  addScore: (pts) => set((s) => ({ score: s.score + pts })),

  // ── Mecánicas FPS ─────────────────────────────────────────────────────────
  toggleADS:    () => set((s) => ({ isADS: !s.isADS })),
  setADS:       (v) => set({ isADS: v }),
  toggleCrouch: () => set((s) => ({ isCrouching: !s.isCrouching })),
  setCrouch:    (v) => set({ isCrouching: v }),
});

// ─── Slice de configuración ───────────────────────────────────────────────────
const createSettingsSlice = (set) => ({
  sensitivity: 1,
  fov:         90,
  volume:      0.7,
  showFPS:     false,

  updateSensitivity: (val) => {
    set({ sensitivity: val });
    const snap = useGameStore.getState()._getSettingsSnapshot();
    saveSettings({ ...snap, sensitivity: val });
  },

  updateSettings: (patch) => {
    set(patch);
    const snap = useGameStore.getState()._getSettingsSnapshot();
    saveSettings({ ...snap, ...patch });
  },

  _getSettingsSnapshot: () => {
    const s = useGameStore.getState();
    return { sensitivity: s.sensitivity, fov: s.fov, volume: s.volume, showFPS: s.showFPS };
  },

  loadPersistedSettings: () => {
    const saved = loadSettings();
    if (saved) set(saved);
  },
});

// ─── Store combinado ──────────────────────────────────────────────────────────
const useGameStore = create((set, get) => ({
  ...createGameSlice(set, get),
  ...createSettingsSlice(set, get),
}));

export default useGameStore;
