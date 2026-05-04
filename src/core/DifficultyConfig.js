/**
 * DifficultyConfig — Configuración centralizada de niveles de dificultad.
 * Afecta tamaño de targets, velocidad de spawn, velocidad de tracking y bonus por reacción.
 */
import { MODE_EPIC } from './ModeEpicConfig';

export const DIFFICULTIES = {
  easy: {
    id:            'easy',
    label:         'FÁCIL',
    color:         '#00ff88',
    icon:          '◆',
    targetScale:   1.35,       // Targets más grandes
    spawnMult:     1.3,        // Spawn más lento (multiplicador del intervalo)
    speedMult:     0.65,       // Tracking más lento
    scoreMult:     0.8,        // Menor bonus de puntuación
    description:   'Targets grandes, más tiempo',
  },
  normal: {
    id:            'normal',
    label:         'NORMAL',
    color:         '#00d4ff',
    icon:          '◆◆',
    targetScale:   1.0,
    spawnMult:     1.0,
    speedMult:     1.0,
    scoreMult:     1.0,
    description:   'Experiencia estándar',
  },
  hard: {
    id:            'hard',
    label:         'DIFÍCIL',
    color:         '#ff2d78',
    icon:          '◆◆◆',
    targetScale:   0.6,        // Targets mucho más pequeños
    spawnMult:     0.65,       // Spawn mucho más rápido
    speedMult:     1.5,        // Tracking muy rápido
    scoreMult:     1.4,        // Mayor bonus de puntuación
    description:   'Targets pequeños, muy rápido',
  },
};

export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];

export const getDifficulty = (id) => DIFFICULTIES[id] ?? DIFFICULTIES.normal;

export const getModeEpicConfig = (mode, difficultyId) => {
  const baseDiff = getDifficulty(difficultyId);
  const epicConf = MODE_EPIC[mode]?.[difficultyId] || {};
  return { ...baseDiff, ...epicConf };
};
