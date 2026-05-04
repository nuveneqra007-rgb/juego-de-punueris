/**
 * Storage utilities — Settings, Best Scores, Ranking & History.
 * All data persisted in localStorage.
 */

// ─── Keys ────────────────────────────────────────────────────────────────────
const KEY_SETTINGS    = 'aim-champ-settings';
const KEY_BEST_SCORES = 'aim-champ-best-scores';
const KEY_RANKING     = 'aim-champ-ranking';
const KEY_HISTORY     = 'aim-champ-history';
const KEY_PLAYER_NAME = 'aim-champ-player-name';

const MAX_RANKING_ENTRIES = 10;
const MAX_HISTORY_ENTRIES = 50;

// ─── Helper ──────────────────────────────────────────────────────────────────
const safeLoad = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const safeSave = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded — silently fail */ }
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const loadSettings = () => safeLoad(KEY_SETTINGS);
export const saveSettings = (settings) => safeSave(KEY_SETTINGS, settings);

// ─── Player Name ─────────────────────────────────────────────────────────────
export const loadPlayerName = () => {
  try {
    return localStorage.getItem(KEY_PLAYER_NAME) || 'Player';
  } catch {
    return 'Player';
  }
};

export const savePlayerName = (name) => {
  try {
    localStorage.setItem(KEY_PLAYER_NAME, name);
  } catch { /* silently fail */ }
};

// ─── Best Scores (per mode+difficulty) ───────────────────────────────────────
// Structure: { "gridshot-normal": { score, accuracy, avgReaction, maxCombo, date }, ... }

export const loadBestScores = () => safeLoad(KEY_BEST_SCORES) || {};

export const getBestScore = (mode, difficulty) => {
  const all = loadBestScores();
  return all[`${mode}-${difficulty}`] || null;
};

/**
 * Saves a new best score if it beats the existing one.
 * @returns {boolean} true if it's a new record
 */
export const saveBestScore = (mode, difficulty, scoreData) => {
  const all = loadBestScores();
  const key = `${mode}-${difficulty}`;
  const existing = all[key];

  if (!existing || scoreData.score > existing.score) {
    all[key] = {
      score:       scoreData.score,
      accuracy:    scoreData.accuracy,
      avgReaction: scoreData.avgReaction,
      maxCombo:    scoreData.maxCombo,
      hits:        scoreData.hits,
      shots:       scoreData.shots,
      date:        new Date().toISOString(),
    };
    safeSave(KEY_BEST_SCORES, all);
    return true;
  }
  return false;
};

// ─── Ranking (Top 10 per mode) ───────────────────────────────────────────────
// Structure: { "gridshot": [{ name, score, accuracy, difficulty, date }, ...], ... }

export const loadRanking = (mode) => {
  const all = safeLoad(KEY_RANKING) || {};
  return all[mode] || [];
};

export const loadAllRankings = () => safeLoad(KEY_RANKING) || {};

/**
 * Adds entry to the ranking for a mode. Keeps top MAX_RANKING_ENTRIES entries.
 * @returns {number} The position (1-indexed), or -1 if didn't make it
 */
export const saveToRanking = (mode, entry) => {
  const all = safeLoad(KEY_RANKING) || {};
  const list = all[mode] || [];

  const newEntry = {
    name:       entry.name,
    score:      entry.score,
    accuracy:   entry.accuracy,
    avgReaction:entry.avgReaction,
    maxCombo:   entry.maxCombo,
    difficulty: entry.difficulty,
    date:       new Date().toISOString(),
  };

  list.push(newEntry);
  list.sort((a, b) => b.score - a.score);

  // Keep only top entries
  all[mode] = list.slice(0, MAX_RANKING_ENTRIES);
  safeSave(KEY_RANKING, all);

  // Return position
  const pos = all[mode].findIndex(
    (e) => e.date === newEntry.date && e.score === newEntry.score
  );
  return pos >= 0 ? pos + 1 : -1;
};

// ─── History (last N games) ──────────────────────────────────────────────────
// Structure: [{ mode, difficulty, score, accuracy, hits, shots, avgReaction, maxCombo, date }, ...]

export const loadHistory = () => safeLoad(KEY_HISTORY) || [];

export const saveToHistory = (entry) => {
  const list = loadHistory();
  list.unshift({
    mode:        entry.mode,
    difficulty:  entry.difficulty,
    score:       entry.score,
    accuracy:    entry.accuracy,
    hits:        entry.hits,
    shots:       entry.shots,
    avgReaction: entry.avgReaction,
    maxCombo:    entry.maxCombo,
    duration:    entry.duration,
    date:        new Date().toISOString(),
  });
  safeSave(KEY_HISTORY, list.slice(0, MAX_HISTORY_ENTRIES));
};
