import { create } from 'zustand';
import {
  loadSettings, saveSettings,
  loadPlayerName, savePlayerName,
  saveBestScore, getBestScore,
  saveToRanking, saveToHistory,
} from '../utils/storage';
import { calcHitScore, calcMissPenalty } from '../core/ScoreEngine';
import { getDifficulty } from '../core/DifficultyConfig';
import { soundEngine } from '../core/SoundEngine';

// ─── Slice de sesión de juego ─────────────────────────────────────────────────
const createGameSlice = (set, get) => ({
  phase:           'menu',   // 'menu' | 'countdown' | 'playing' | 'summary'
  mode:            'gridshot',
  difficulty:      'normal',
  score:           0,
  shots:           0,
  hits:            0,
  combo:           0,
  maxCombo:        0,
  timeLeft:        30,
  duration:        30,       // duración original de la sesión

  // Stats de reacción
  totalReactionMs: 0,
  lastReactionMs:  0,

  // Extended metrics for end-game stats
  reactionTimes:   [],       // Array de todos los tiempos de reacción individuales
  hitTimeline:     [],       // [{ time, hit: bool, reaction }] orden temporal
  headshots:       0,        // Hits con reacción < 200ms

  // Tracking AK-47 metrics
  trackingDamageDealt: 0,     // Total de daño infligido
  trackingTargetsKilled: 0,   // Targets eliminados (HP → 0)
  trackingTimeOnTarget: 0,    // Segundos con la mira sobre el target (no se usa estrictamente, pero es una métrica)
  trackingAccuracy: 0,        // Se calcula al final
  trackingShotsFired: 0,      // Total de balas disparadas
  trackingShotsHit: 0,        // Balas que impactaron

  // Post-game results
  isNewBest:       false,
  rankPosition:    -1,
  bestScore:       null,     // Best score previo para comparación

  // Epic Mechanics State
  consecutiveMisses: 0,
  glitchActive:    false,
  bulletTimeActive: false,
  tunnelFov:       0,        // 0 means use default FOV

  // ── Estado de mecánicas FPS ────────────────────────────────────────────────
  isADS:     false,
  isCrouching: false,

  /**
   * Inicia sesión → pasa a fase countdown (3-2-1-GO!)
   */
  startSession: (duration = 30, mode = 'gridshot', difficulty = 'normal') => {
    soundEngine.init();
    const best = getBestScore(mode, difficulty);
    set({
      phase: 'countdown', mode, difficulty, duration,
      score: 0, shots: 0, hits: 0, combo: 0, maxCombo: 0,
      timeLeft: duration, totalReactionMs: 0, lastReactionMs: 0,
      reactionTimes: [], hitTimeline: [], headshots: 0,
      trackingDamageDealt: 0, trackingTargetsKilled: 0, trackingTimeOnTarget: 0,
      trackingShotsFired: 0, trackingShotsHit: 0,
      isADS: false, isCrouching: false,
      isNewBest: false, rankPosition: -1, bestScore: best,
      consecutiveMisses: 0, glitchActive: false, bulletTimeActive: false, tunnelFov: 0,
    });
  },

  /**
   * Transición de countdown → playing
   */
  beginPlaying: () => {
    soundEngine.playGameStart();
    set({ phase: 'playing' });
  },

  tick: () =>
    set((s) => {
      if (s.timeLeft <= 6 && s.timeLeft > 1) {
        soundEngine.playTimeWarning();
      }
      if (s.timeLeft <= 1) {
        // End game — auto-save results
        soundEngine.playGameEnd();
        const state = get();
        const accuracy = state.shots > 0 ? parseFloat(((state.hits / state.shots) * 100).toFixed(1)) : 0;
        const avgReaction = state.hits > 0 ? Math.round(state.totalReactionMs / state.hits) : 0;

        const scoreData = {
          score: state.score,
          accuracy,
          avgReaction,
          maxCombo: state.maxCombo,
          hits: state.hits,
          shots: state.shots,
        };

        // Save best score
        const isNewBest = saveBestScore(state.mode, state.difficulty, scoreData);
        if (isNewBest) soundEngine.playNewRecord();

        // Save to ranking
        const playerName = get().playerName || 'Player';
        const rankPos = saveToRanking(state.mode, {
          name: playerName,
          difficulty: state.difficulty,
          ...scoreData,
        });

        // Save to history
        saveToHistory({
          mode: state.mode,
          difficulty: state.difficulty,
          duration: state.duration,
          ...scoreData,
        });

        return { phase: 'summary', timeLeft: 0, isNewBest, rankPosition: rankPos };
      }
      return { timeLeft: s.timeLeft - 1 };
    }),

  /**
   * Registra un ACIERTO y calcula puntos via ScoreEngine.
   * @param {number} reactionMs - ms desde spawn hasta disparo
   */
  registerHit: (reactionMs) => {
    const { combo, mode, difficulty } = get();
    const diffConfig = getDifficulty(difficulty);
    const points = Math.round(calcHitScore({ reactionMs, combo, mode }) * diffConfig.scoreMult);
    const isHeadshot = reactionMs < 200;

    soundEngine.playHit();
    if (combo >= 2) soundEngine.playCombo(combo);

    set((s) => {
      const newCombo = s.combo + 1;
      const elapsed = s.duration - s.timeLeft;
      return {
        score:           s.score + points,
        shots:           s.shots + 1,
        hits:            s.hits + 1,
        combo:           newCombo,
        maxCombo:        Math.max(s.maxCombo, newCombo),
        totalReactionMs: s.totalReactionMs + reactionMs,
        lastReactionMs:  reactionMs,
        reactionTimes:   [...s.reactionTimes, reactionMs],
        hitTimeline:     [...s.hitTimeline, { time: elapsed, hit: true, reaction: reactionMs }],
        headshots:       s.headshots + (isHeadshot ? 1 : 0),
        consecutiveMisses: 0, // Reset misses on hit
      };
    });
    return points;
  },

  /**
   * Registra un FALLO, aplica penalización.
   */
  registerMiss: () => {
    const { mode, duration, timeLeft } = get();
    const penalty = calcMissPenalty(mode);
    soundEngine.playMiss();
    const elapsed = duration - timeLeft;
    set((s) => ({
      score:       Math.max(0, s.score + penalty),
      shots:       s.shots + 1,
      combo:       0,
      hitTimeline: [...s.hitTimeline, { time: elapsed, hit: false, reaction: 0 }],
      consecutiveMisses: s.consecutiveMisses + 1,
    }));
  },

  // Compatibilidad retroactiva
  registerShot: (hit, reactionMs = 500) => {
    if (hit) get().registerHit(reactionMs);
    else     get().registerMiss();
  },

  // ── Métricas de Tracking ──────────────────────────────────────────────────
  registerTrackingHit: (damage) => set((s) => ({
    score: s.score + damage,
    trackingDamageDealt: s.trackingDamageDealt + damage,
    trackingShotsHit: s.trackingShotsHit + 1,
    trackingShotsFired: s.trackingShotsFired + 1,
  })),

  registerTrackingMiss: () => set((s) => ({
    trackingShotsFired: s.trackingShotsFired + 1,
  })),

  registerTrackingKill: () => set((s) => {
    const newCombo = s.combo + 1;
    return {
      trackingTargetsKilled: s.trackingTargetsKilled + 1,
      combo: newCombo,
      maxCombo: Math.max(s.maxCombo, newCombo),
    };
  }),

  addScore: (pts) => set((s) => ({ score: s.score + pts })),

  // ── Mecánicas FPS ─────────────────────────────────────────────────────────
  toggleADS:    () => set((s) => ({ isADS: !s.isADS })),
  setADS:       (v) => set({ isADS: v }),
  toggleCrouch: () => set((s) => ({ isCrouching: !s.isCrouching })),
  setCrouch:    (v) => set({ isCrouching: v }),

  // ── Mecánicas Epic ────────────────────────────────────────────────────────
  setGlitchActive: (v) => set({ glitchActive: v }),
  setBulletTimeActive: (v) => set({ bulletTimeActive: v }),
  setTunnelFov: (v) => set({ tunnelFov: v }),
});

// ─── Slice de configuración ───────────────────────────────────────────────────
const createSettingsSlice = (set) => ({
  sensitivity: 1,
  fov:         85, // VR Default
  volume:      0.7,
  showFPS:     false,
  playerName:  'Player',
  vrEffects:   true,
  gyroEnabled: false,

  updateSensitivity: (val) => {
    set({ sensitivity: val });
    const snap = useGameStore.getState()._getSettingsSnapshot();
    saveSettings({ ...snap, sensitivity: val });
  },

  updateSettings: (patch) => {
    set(patch);
    if (patch.volume !== undefined) soundEngine.setVolume(patch.volume);
    if (patch.playerName !== undefined) savePlayerName(patch.playerName);
    const snap = useGameStore.getState()._getSettingsSnapshot();
    saveSettings({ ...snap, ...patch });
  },

  _getSettingsSnapshot: () => {
    const s = useGameStore.getState();
    return { sensitivity: s.sensitivity, fov: s.fov, volume: s.volume, showFPS: s.showFPS, vrEffects: s.vrEffects, gyroEnabled: s.gyroEnabled };
  },

  loadPersistedSettings: () => {
    const saved = loadSettings();
    if (saved) {
      set(saved);
      if (saved.volume !== undefined) soundEngine.setVolume(saved.volume);
    }
    const name = loadPlayerName();
    if (name) set({ playerName: name });
  },
});

// ─── Store combinado ──────────────────────────────────────────────────────────
const useGameStore = create((set, get) => ({
  ...createGameSlice(set, get),
  ...createSettingsSlice(set, get),
}));

export default useGameStore;
