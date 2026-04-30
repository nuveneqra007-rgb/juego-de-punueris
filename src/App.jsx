import React, { useEffect, useState } from 'react';
import { InputProvider, useInput } from './input/InputContext';
import useGameStore from './store/gameStore';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import MobileControls from './components/MobileControls';
import SettingsPanel from './components/SettingsPanel';
import SettingsButton from './components/SettingsButton';

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

  // Desktop: RMB for ADS
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (e.button === 2) useGameStore.getState().setADS(true);
    };
    const handleMouseUp = (e) => {
      if (e.button === 2) useGameStore.getState().setADS(false);
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
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
  { id: 'gridshot', label: 'GRIDSHOT', desc: 'Grid 3×3 · Inmediato al matar', color: '#00d4ff', icon: '⊞' },
  { id: 'flick',   label: 'FLICK',    desc: 'Target extremo · Reacción pura', color: '#ff2d78', icon: '⚡' },
  { id: 'tracking',label: 'TRACKING', desc: 'Sigue el objetivo · Puntos/seg',  color: '#ffb800', icon: '◎' },
  { id: 'speed',   label: 'SPEED',    desc: 'Grid 4×4 acelerado · Targets pequeños', color: '#00ff88', icon: '▸▸' },
];

// ─── MenuScreen ───────────────────────────────────────────────────────────────
const MenuScreen = () => {
  const [selectedMode, setSelectedMode] = useState('gridshot');
  const [duration,     setDuration]     = useState(30);

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
        <h1>AIM CHAMP</h1>
        <div className="title-line" />
        <div className="subtitle">ENTRENADOR DE PUNTERÍA PRO</div>

        {/* Grid de modos */}
        <div className="mode-grid">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`mode-card ${selectedMode === m.id ? 'active' : ''}`}
              style={{ '--mode-color': m.color }}
              onClick={() => setSelectedMode(m.id)}
            >
              <div className="mode-icon">{m.icon}</div>
              <div className="mode-label">{m.label}</div>
              <div className="mode-desc">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Selector de duración */}
        <div className="duration-row">
          {[15, 30, 60].map((d) => (
            <button
              key={d}
              className={`duration-btn ${duration === d ? 'active' : ''}`}
              onClick={() => setDuration(d)}
            >
              {d}s
            </button>
          ))}
        </div>

        <button
          className="btn-primary"
          onClick={() => useGameStore.getState().startSession(duration, selectedMode)}
        >
          COMENZAR
        </button>

        <div className="subtitle" style={{ marginTop: 14, marginBottom: 0 }}>
          Clic / Toca · Arrastra para mirar · C agacharse · RMB mira
        </div>
      </div>
    </div>
  );
};

// ─── SummaryScreen ────────────────────────────────────────────────────────────
const SummaryScreen = () => {
  const score         = useGameStore((s) => s.score);
  const hits          = useGameStore((s) => s.hits);
  const shots         = useGameStore((s) => s.shots);
  const maxCombo      = useGameStore((s) => s.maxCombo);
  const totalReaction = useGameStore((s) => s.totalReactionMs);
  const mode          = useGameStore((s) => s.mode);

  const accuracy    = shots > 0 ? ((hits / shots) * 100).toFixed(1) : '0';
  const avgReaction = hits  > 0 ? Math.round(totalReaction / hits)  : 0;
  const modeData    = MODES.find((m) => m.id === mode) ?? MODES[0];

  const rating = (() => {
    if (accuracy >= 90 && avgReaction < 350) return { label: 'ELITE',     color: '#ff2d78' };
    if (accuracy >= 75 && avgReaction < 550) return { label: 'EXCELENTE', color: '#ffb800' };
    if (accuracy >= 60)                       return { label: 'BIEN',      color: '#00ff88' };
    return                                           { label: 'SIGUE',     color: '#64748b' };
  })();

  return (
    <div className="summary-screen">
      {/* Badge de modo */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: `${modeData.color}18`,
        border: `1px solid ${modeData.color}44`,
        borderRadius: 99, padding: '4px 14px',
        fontFamily: 'var(--font-hud)', fontSize: 11, letterSpacing: 2,
        color: modeData.color, marginBottom: 10,
      }}>
        {modeData.icon} {modeData.label}
      </div>

      <h2>SESIÓN COMPLETADA</h2>

      {/* Rating badge */}
      <div style={{
        fontFamily: 'var(--font-title)',
        fontSize: 'clamp(20px, 3.5vw, 34px)',
        fontWeight: 900,
        color: rating.color,
        textShadow: `0 0 20px ${rating.color}`,
        letterSpacing: 4,
        margin: '10px 0 16px',
        animation: 'pulse 2s ease infinite',
      }}>
        {rating.label}
      </div>

      <div className="summary-divider" />

      {/* Stats */}
      <div style={{ minWidth: 220 }}>
        <div className="summary-stat">Puntuación   <span>{score.toLocaleString()}</span></div>
        <div className="summary-stat">Precisión    <span>{accuracy}%</span></div>
        <div className="summary-stat">Aciertos     <span>{hits} / {shots}</span></div>
        <div className="summary-stat">Combo máx    <span>×{maxCombo}</span></div>
        {hits > 0 && <div className="summary-stat">Reacción avg <span>{avgReaction}ms</span></div>}
      </div>

      <div className="summary-divider" style={{ marginTop: 16 }} />

      {/* Acciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button
          className="btn-primary"
          onClick={() => useGameStore.getState().startSession(30, mode)}
        >
          JUGAR DE NUEVO
        </button>
        <button
          className="btn-ghost"
          onClick={() => useGameStore.setState({ phase: 'menu' })}
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
        {phase === 'menu'    && <MenuScreen />}
        {phase === 'summary' && <SummaryScreen />}
      </div>
    </InputProvider>
  );
};

export default App;
