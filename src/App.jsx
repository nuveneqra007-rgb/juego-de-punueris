import React, { useEffect, useState } from 'react';
import { InputProvider, useInput } from './input/InputContext';
import useGameStore from './store/gameStore';
import { loadSettings } from './utils/storage';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import MobileControls from './components/MobileControls';
import SettingsPanel from './components/SettingsPanel';
import SettingsButton from './components/SettingsButton';

const AppInitializer = () => {
  const inputRef = useInput();
  const updateSensitivity = useGameStore((state) => state.updateSensitivity);
  const updateSettings = useGameStore((state) => state.updateSettings);

  useEffect(() => {
    const saved = loadSettings();
    if (saved) {
      updateSettings(saved);
      if (saved.sensitivity) {
        inputRef.current.setSensitivity(saved.sensitivity);
        updateSensitivity(saved.sensitivity);
      }
    }
  }, [inputRef, updateSensitivity, updateSettings]);

  return null;
};

const MenuScreen = () => (
  <div className="menu-screen">
    <h1>AIM CHAMP</h1>
    <div className="subtitle">Entrenador de puntería 3D</div>
    <button
      onClick={() => useGameStore.getState().startSession(30)}
      style={{ marginTop: 10 }}
    >
      COMENZAR
    </button>
    <div className="subtitle" style={{ marginTop: 16, fontSize: '12px' }}>
      Clic para apuntar · Arrastra para mirar
    </div>
  </div>
);

const SummaryScreen = () => {
  const { score, hits, shots, maxCombo } = useGameStore();
  const accuracy = shots > 0 ? ((hits / shots) * 100).toFixed(1) : '0';

  return (
    <div className="summary-screen">
      <h2>¡Sesión completada!</h2>
      <div className="summary-stat">Puntuación: <span>{score}</span></div>
      <div className="summary-stat">Precisión: <span>{accuracy}%</span></div>
      <div className="summary-stat">Aciertos: <span>{hits}</span> / {shots}</div>
      <div className="summary-stat">Combo máx: <span>{maxCombo}</span></div>
      <button
        onClick={() => useGameStore.getState().startSession(30)}
      >
        JUGAR DE NUEVO
      </button>
    </div>
  );
};

const App = () => {
  const [showSettings, setShowSettings] = useState(false);
  const phase = useGameStore((state) => state.phase);

  return (
    <InputProvider>
      <AppInitializer />
      <div className="app-container">
        <GameCanvas />
        {phase === 'playing' && <HUD />}
        {phase === 'playing' && <MobileControls />}
        <SettingsButton onClick={() => setShowSettings(true)} />
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        {phase === 'menu' && <MenuScreen />}
        {phase === 'summary' && <SummaryScreen />}
      </div>
    </InputProvider>
  );
};

export default App;
