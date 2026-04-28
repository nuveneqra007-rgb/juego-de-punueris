import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  // Estado de sesión
  mode: 'gridshot',
  phase: 'menu', // 'menu' | 'playing' | 'paused' | 'summary'
  score: 0,
  shots: 0,
  hits: 0,
  combo: 0,
  maxCombo: 0,
  timeLeft: 30, // segundos
  sensitivity: 1,

  // Configuración persistente (se sincronizará con localStorage)
  settings: {
    sensitivity: 1,
    fov: 90,
    volume: 0.7,
    showFPS: false,
  },

  // Acciones
  setPhase: (phase) => set({ phase }),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  registerShot: (hit) => set((state) => {
    const newHits = hit ? state.hits + 1 : state.hits;
    const newCombo = hit ? state.combo + 1 : 0;
    return {
      shots: state.shots + 1,
      hits: newHits,
      combo: newCombo,
      maxCombo: Math.max(state.maxCombo, newCombo),
    };
  }),
  tick: () => set((state) => {
    if (state.timeLeft <= 1) return { phase: 'summary', timeLeft: 0 };
    return { timeLeft: state.timeLeft - 1 };
  }),
  startSession: (duration = 30) => set({
    phase: 'playing',
    score: 0,
    shots: 0,
    hits: 0,
    combo: 0,
    maxCombo: 0,
    timeLeft: duration,
  }),
  updateSensitivity: (val) => set({ sensitivity: val }),
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
}));

export default useGameStore;
