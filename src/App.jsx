import React, { useEffect, useState } from 'react';
import { InputProvider, useInput } from './input/InputContext';
import useGameStore from './store/gameStore';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import MobileControls from './components/MobileControls';
import SettingsPanel from './components/SettingsPanel';
import SettingsButton from './components/SettingsButton';
import Countdown from './components/Countdown';
import MenuParticles from './components/MenuParticles';
import RankingPanel from './components/RankingPanel';
import { DIFFICULTIES, DIFFICULTY_ORDER, getDifficulty } from './core/DifficultyConfig';
import { soundEngine } from './core/SoundEngine';
import { getBestScore } from './utils/storage';
import { classifyReaction } from './core/ScoreEngine';
import { IS_MOBILE } from './core/DeviceCapabilities';

// ─── AppInitializer ───────────────────────────────────────────────────────────
const AppInitializer = () => {
  const inputRef              = useInput();
  const loadPersistedSettings = useGameStore((s) => s.loadPersistedSettings);
  const sensitivity           = useGameStore((s) => s.sensitivity);
  useEffect(() => { loadPersistedSettings(); }, [loadPersistedSettings]);
  useEffect(() => { inputRef.current.setSensitivity(sensitivity); }, [sensitivity, inputRef]);

  // Desktop keyboard: C = crouch, RMB = ADS (handled in InputContext)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'c' || e.key === 'C') useGameStore.getState().setCrouch(true);
    };
    const handleKeyUp = (e) => {
      if (e.key === 'c' || e.key === 'C') useGameStore.getState().setCrouch(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Desktop: RMB for ADS + prevent context menu
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (e.button === 2) { e.preventDefault(); useGameStore.getState().setADS(true); }
    };
    const handleMouseUp = (e) => {
      if (e.button === 2) useGameStore.getState().setADS(false);
    };
    const preventContext = (e) => {
      const phase = useGameStore.getState().phase;
      if (phase === 'playing' || phase === 'countdown') e.preventDefault();
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', preventContext);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', preventContext);
    };
  }, []);

  return null;
};

// ─── ExitButton (volver al menú durante partida) ─────────────────────────────
const ExitButton = () => (
  <button
    onClick={() => {
      if (document.pointerLockElement) document.exitPointerLock();
      if (document.fullscreenElement) document.exitFullscreen?.();
      useGameStore.setState({ phase: 'menu', isADS: false, isCrouching: false });
    }}
    style={{
      position: 'absolute', top: 56, left: 12,
      width: 38, height: 38, borderRadius: 8,
      background: 'rgba(11,15,26,0.75)',
      border: '1px solid rgba(255,68,68,0.35)',
      color: 'rgba(255,68,68,0.85)',
      fontSize: 18, fontWeight: 700, lineHeight: 1,
      cursor: 'pointer', zIndex: 100,
      touchAction: 'manipulation',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      transition: 'border-color 0.2s, color 0.2s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,68,68,0.7)'; e.currentTarget.style.color = '#ff4444'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,68,68,0.35)'; e.currentTarget.style.color = 'rgba(255,68,68,0.85)'; }}
  >✕</button>
);

// ─── Datos de modos ───────────────────────────────────────────────────────────
const MODES = [
  { id: 'gridshot', label: 'GRIDSHOT', desc: 'Ritmo y reflejos · Objetivos Orbitales', color: '#00d4ff', icon: '⊞' },
  { id: 'flick',   label: 'FLICK',    desc: 'Precisión quirúrgica · Señuelos y Bullet Time', color: '#ff2d78', icon: '⚡' },
  { id: 'tracking',label: 'TRACKING', desc: 'Control de arma · Calor y Núcleo fantasma',  color: '#ffb800', icon: '◎' },
  { id: 'speed',   label: 'SPEED',    desc: 'Reacción pura · Warp Speed FOV', color: '#00ff88', icon: '▸▸' },
];

// ─── ReactionBar — mini histogram ─────────────────────────────────────────────
const ReactionBar = ({ reactionTimes }) => {
  if (!reactionTimes || reactionTimes.length === 0) return null;

  const buckets = [
    { label: 'ELITE',  max: 250,  color: '#ff2d78', count: 0 },
    { label: 'RÁPIDO', max: 400,  color: '#00ff88', count: 0 },
    { label: 'BIEN',   max: 700,  color: '#00d4ff', count: 0 },
    { label: 'LENTO',  max: 99999, color: '#ffb800', count: 0 },
  ];

  reactionTimes.forEach((rt) => {
    for (const b of buckets) {
      if (rt < b.max) { b.count++; break; }
    }
  });

  const total = reactionTimes.length;

  return (
    <div className="reaction-bar-container">
      <div className="reaction-bar-label">Distribución de Reacción</div>
      <div className="reaction-bar-row">
        {buckets.map((b) => {
          const pct = total > 0 ? ((b.count / total) * 100).toFixed(0) : 0;
          return (
            <div key={b.label} className="reaction-bucket">
              <div className="reaction-bucket-bar-wrap">
                <div
                  className="reaction-bucket-bar"
                  style={{
                    height: `${Math.max(4, (b.count / total) * 100)}%`,
                    background: b.color,
                    boxShadow: `0 0 8px ${b.color}40`,
                  }}
                />
              </div>
              <div className="reaction-bucket-count" style={{ color: b.color }}>{b.count}</div>
              <div className="reaction-bucket-label">{b.label}</div>
              <div className="reaction-bucket-pct">{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── HitTimeline — visual timeline of hits/misses ─────────────────────────────
const HitTimeline = ({ hitTimeline }) => {
  if (!hitTimeline || hitTimeline.length === 0) return null;

  return (
    <div className="hit-timeline-container">
      <div className="reaction-bar-label">Timeline de Disparos</div>
      <div className="hit-timeline-bar">
        {hitTimeline.map((entry, i) => (
          <div
            key={i}
            className="hit-timeline-dot"
            style={{
              background: entry.hit ? '#00ff88' : '#ff4444',
              boxShadow: `0 0 4px ${entry.hit ? '#00ff8860' : '#ff444460'}`,
              flex: 1,
              maxWidth: 6,
            }}
            title={entry.hit ? `${entry.reaction}ms` : 'Miss'}
          />
        ))}
      </div>
      <div className="hit-timeline-legend">
        <span style={{ color: '#00ff88' }}>● Acierto</span>
        <span style={{ color: '#ff4444' }}>● Fallo</span>
      </div>
    </div>
  );
};

// ─── MenuScreen ───────────────────────────────────────────────────────────────
const MenuScreen = () => {
  const [selectedMode, setSelectedMode] = useState('gridshot');
  const [difficulty, setDifficulty]     = useState('normal');
  const [duration, setDuration]         = useState(30);
  const [showRanking, setShowRanking]   = useState(false);
  const playerName = useGameStore((s) => s.playerName);

  const bestScore = getBestScore(selectedMode, difficulty);

  return (
    <div className="menu-screen" style={{ zIndex: 50 }}>
      {/* Fondo decorativo */}
      <div className="bg-grid" style={{ borderRadius: 0 }} />
      <div className="bg-scanlines" />

      {/* Corners decorativos del viewport */}
      <div className="corner-tl" style={{ position: 'fixed' }} />
      <div className="corner-tr" style={{ position: 'fixed' }} />
      <div className="corner-bl" style={{ position: 'fixed' }} />
      <div className="corner-br" style={{ position: 'fixed' }} />

      {/* Contenido centrado */}
      <div style={{ position: 'relative', zIndex: 3 }}>
        <h1>Aim Trainer</h1>
        <div className="title-line" />
        <div className="subtitle">ENTRENADOR DE PUNTERÍA PRO</div>

        {/* Player Name Input */}
        <div className="player-name-row">
          <label className="player-name-label">JUGADOR</label>
          <input
            type="text"
            className="player-name-input"
            value={playerName}
            maxLength={16}
            onChange={(e) => useGameStore.getState().updateSettings({ playerName: e.target.value })}
            onFocus={() => soundEngine.playUIClick()}
          />
        </div>

        {/* Grid de modos */}
        <div className="mode-grid">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`mode-card ${selectedMode === m.id ? 'active' : ''}`}
              style={{ '--mode-color': m.color }}
              onClick={() => { setSelectedMode(m.id); soundEngine.playUIClick(); }}
            >
              <div className="mode-icon">{m.icon}</div>
              <div className="mode-label">{m.label}</div>
              <div className="mode-desc">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Selector de dificultad */}
        <div className="difficulty-section">
          <div className="section-label">DIFICULTAD</div>
          <div className="difficulty-row">
            {DIFFICULTY_ORDER.map((dId) => {
              const d = DIFFICULTIES[dId];
              return (
                <button
                  key={dId}
                  className={`difficulty-btn ${difficulty === dId ? 'active' : ''}`}
                  style={{ '--diff-color': d.color }}
                  onClick={() => { setDifficulty(dId); soundEngine.playUIClick(); }}
                >
                  <span className="diff-icon">{d.icon}</span>
                  <span className="diff-label">{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector de duración */}
        <div className="duration-row">
          {[15, 30, 60].map((d) => (
            <button
              key={d}
              className={`duration-btn ${duration === d ? 'active' : ''}`}
              onClick={() => { setDuration(d); soundEngine.playUIClick(); }}
            >
              {d}s
            </button>
          ))}
        </div>

        {/* Best score display */}
        {bestScore && (
          <div className="best-score-display">
            <span className="best-score-label">🏆 MEJOR</span>
            <span className="best-score-value">{bestScore.score?.toLocaleString()}</span>
            <span className="best-score-acc">{bestScore.accuracy}%</span>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={() => {
            soundEngine.init();
            // En móvil, entrar a fullscreen para eliminar la barra de navegación
            if (IS_MOBILE && !document.fullscreenElement) {
              const el = document.documentElement;
              const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
              if (req) {
                req.call(el).then(() => {
                  // Esperar a que el fullscreen se estabilice antes de resize
                  setTimeout(() => {
                    window.dispatchEvent(new Event('resize-safe'));
                  }, 300);
                }).catch(() => { /* Fullscreen no disponible, continuar sin él */ });
              }
            }
            useGameStore.getState().startSession(duration, selectedMode, difficulty);
          }}
        >
          COMENZAR
        </button>

        {/* Botones secundarios */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          <button
            className="btn-ghost"
            onClick={() => { setShowRanking(true); soundEngine.playUIClick(); }}
          >
            🏆 RANKING
          </button>
        </div>

        <div className="subtitle" style={{ marginTop: 14, marginBottom: 0 }}>
          Clic / Toca · Arrastra para mirar · C agacharse · RMB mira
        </div>
      </div>

      {showRanking && <RankingPanel onClose={() => setShowRanking(false)} />}
    </div>
  );
};

// ─── SummaryScreen ────────────────────────────────────────────────────────────
const SummaryScreen = () => {
  const score          = useGameStore((s) => s.score);
  const hits           = useGameStore((s) => s.hits);
  const shots          = useGameStore((s) => s.shots);
  const maxCombo       = useGameStore((s) => s.maxCombo);
  const totalReaction  = useGameStore((s) => s.totalReactionMs);
  const mode           = useGameStore((s) => s.mode);
  const difficulty     = useGameStore((s) => s.difficulty);
  const reactionTimes  = useGameStore((s) => s.reactionTimes);
  const hitTimeline    = useGameStore((s) => s.hitTimeline);
  const headshots      = useGameStore((s) => s.headshots);
  const isNewBest      = useGameStore((s) => s.isNewBest);
  const rankPosition   = useGameStore((s) => s.rankPosition);
  const bestScore      = useGameStore((s) => s.bestScore);
  const duration       = useGameStore((s) => s.duration);
  
  // Tracking stats
  const trackingDamageDealt   = useGameStore((s) => s.trackingDamageDealt);
  const trackingTargetsKilled = useGameStore((s) => s.trackingTargetsKilled);
  const trackingShotsHit      = useGameStore((s) => s.trackingShotsHit);
  const trackingShotsFired    = useGameStore((s) => s.trackingShotsFired);
  const isTracking = mode === 'tracking';

  const avgReaction = hits  > 0 ? Math.round(totalReaction / hits)  : 0;
  const modeData    = MODES.find((m) => m.id === mode) ?? MODES[0];
  const diffData    = getDifficulty(difficulty);

  let accuracy;
  if (isTracking) {
    accuracy = trackingShotsFired > 0 ? ((trackingShotsHit / trackingShotsFired) * 100).toFixed(1) : '0';
  } else {
    accuracy = shots > 0 ? ((hits / shots) * 100).toFixed(1) : '0';
  }

  const rating = (() => {
    if (accuracy >= 90 && avgReaction < 350) return { label: 'ELITE',     color: '#ff2d78' };
    if (accuracy >= 75 && avgReaction < 550) return { label: 'EXCELENTE', color: '#ffb800' };
    if (accuracy >= 60)                       return { label: 'BIEN',      color: '#00ff88' };
    return                                           { label: 'SIGUE',     color: '#64748b' };
  })();

  // Calculate min/max reaction
  const minReaction = reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0;
  const maxReaction = reactionTimes.length > 0 ? Math.max(...reactionTimes) : 0;

  return (
    <div className="summary-screen">
      {/* New Record Banner */}
      {isNewBest && (
        <div className="new-record-banner">
          ⭐ ¡NUEVO RÉCORD! ⭐
        </div>
      )}

      {/* Badge de modo + dificultad */}
      <div className="summary-badges">
        <div className="summary-badge" style={{
          background: `${modeData.color}18`,
          border: `1px solid ${modeData.color}44`,
          color: modeData.color,
        }}>
          {modeData.icon} {modeData.label}
        </div>
        <div className="summary-badge" style={{
          background: `${diffData.color}18`,
          border: `1px solid ${diffData.color}44`,
          color: diffData.color,
        }}>
          {diffData.icon} {diffData.label}
        </div>
      </div>

      <h2>SESIÓN COMPLETADA</h2>

      {/* Rating badge */}
      <div className="summary-rating" style={{
        color: rating.color,
        textShadow: `0 0 20px ${rating.color}`,
      }}>
        {rating.label}
      </div>

      {/* Rank position */}
      {rankPosition > 0 && rankPosition <= 3 && (
        <div className="rank-position" style={{ color: rankPosition === 1 ? '#ffd700' : rankPosition === 2 ? '#c0c0c0' : '#cd7f32' }}>
          {rankPosition === 1 ? '🥇' : rankPosition === 2 ? '🥈' : '🥉'} Puesto #{rankPosition}
        </div>
      )}

      <div className="summary-divider" />

      {/* Score principal con comparación */}
      <div className="summary-score-main">
        <div className="summary-score-label">PUNTUACIÓN</div>
        <div className="summary-score-value">{score.toLocaleString()}</div>
        {bestScore && !isNewBest && (
          <div className="summary-score-compare">
            Mejor: {bestScore.score?.toLocaleString()}
            {score > 0 && bestScore.score > 0 && (
              <span style={{ color: score >= bestScore.score ? '#00ff88' : '#ff4444', marginLeft: 6 }}>
                {score >= bestScore.score ? '▲' : '▼'} {Math.abs(score - bestScore.score).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="summary-divider" />

      {/* Stats Grid 2x3 */}
      <div className="summary-stats-grid">
        <div className="summary-stat-card" style={{ '--stat-delay': '0.1s' }}>
          <div className="stat-card-value">{accuracy}<span className="stat-unit">%</span></div>
          <div className="stat-card-label">Precisión</div>
          <div className="stat-card-bar">
            <div className="stat-card-bar-fill" style={{ width: `${accuracy}%`, background: parseFloat(accuracy) >= 80 ? '#00ff88' : parseFloat(accuracy) >= 60 ? '#ffb800' : '#ff4444' }} />
          </div>
        </div>

        <div className="summary-stat-card" style={{ '--stat-delay': '0.15s' }}>
          <div className="stat-card-value">
            {isTracking ? trackingTargetsKilled : hits}
            <span className="stat-unit"> / {isTracking ? trackingShotsFired : shots}</span>
          </div>
          <div className="stat-card-label">{isTracking ? 'Targets Kill' : 'Aciertos'}</div>
        </div>

        <div className="summary-stat-card" style={{ '--stat-delay': '0.2s' }}>
          <div className="stat-card-value">×{maxCombo}</div>
          <div className="stat-card-label">Combo Máx</div>
        </div>

        {isTracking ? (
          <div className="summary-stat-card" style={{ '--stat-delay': '0.25s' }}>
            <div className="stat-card-value">{trackingDamageDealt}</div>
            <div className="stat-card-label">Daño Total</div>
          </div>
        ) : (
          <div className="summary-stat-card" style={{ '--stat-delay': '0.25s' }}>
            <div className="stat-card-value">{avgReaction}<span className="stat-unit">ms</span></div>
            <div className="stat-card-label">Reacción Avg</div>
            {hits > 0 && (
              <div className="stat-card-sub" style={{ color: classifyReaction(avgReaction).color }}>
                {classifyReaction(avgReaction).label}
              </div>
            )}
          </div>
        )}

        <div className="summary-stat-card" style={{ '--stat-delay': '0.3s' }}>
          <div className="stat-card-value">{headshots}</div>
          <div className="stat-card-label">⚡ Headshots</div>
          <div className="stat-card-sub" style={{ color: '#ff2d78' }}>&lt;200ms</div>
        </div>

        <div className="summary-stat-card" style={{ '--stat-delay': '0.35s' }}>
          <div className="stat-card-value">{minReaction}<span className="stat-unit">ms</span></div>
          <div className="stat-card-label">Mejor Reacción</div>
        </div>
      </div>

      {/* Reaction Distribution */}
      <ReactionBar reactionTimes={reactionTimes} />

      {/* Hit Timeline */}
      <HitTimeline hitTimeline={hitTimeline} />

      <div className="summary-divider" style={{ marginTop: 16 }} />

      {/* Acciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button
          className="btn-primary"
          onClick={() => {
            soundEngine.playUIClick();
            useGameStore.getState().startSession(duration, mode, difficulty);
          }}
        >
          JUGAR DE NUEVO
        </button>
        <button
          className="btn-ghost"
          onClick={() => {
            soundEngine.playUIClick();
            useGameStore.setState({ phase: 'menu' });
          }}
        >
          Cambiar modo
        </button>
      </div>
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
const App = () => {
  const [showSettings, setShowSettings] = useState(false);
  const phase = useGameStore((s) => s.phase);

  return (
    <InputProvider>
      <AppInitializer />
      <div className="app-container">
        <GameCanvas />
        {phase === 'playing' && <HUD />}
        {phase === 'playing' && <MobileControls />}
        {phase === 'playing' && <ExitButton />}
        <SettingsButton onClick={() => setShowSettings(true)} />
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        {phase === 'menu' && <MenuParticles />}
        {phase === 'menu'      && <MenuScreen />}
        {phase === 'countdown' && <Countdown />}
        {phase === 'summary'   && <SummaryScreen />}
      </div>
    </InputProvider>
  );
};

export default App;
