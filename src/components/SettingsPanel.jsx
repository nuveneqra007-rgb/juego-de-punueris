import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import { useInput } from '../input/InputContext';
import { saveSettings } from '../utils/storage';

const SettingsPanel = ({ onClose }) => {
  const { sensitivity, updateSensitivity } = useGameStore();
  const inputRef = useInput();
  const [localSens, setLocalSens] = useState(sensitivity);

  const handleSensChange = (e) => {
    const val = parseFloat(e.target.value);
    setLocalSens(val);
    updateSensitivity(val);
    inputRef.current.setSensitivity(val);
  };

  const handleClose = () => {
    saveSettings({ sensitivity: localSens });
    onClose();
  };

  // Salir con Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  // Liberar pointer lock al abrir ajustes
  useEffect(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      zIndex: 200,
    }}>
      <h2 style={{ fontFamily: 'Arial, sans-serif', marginBottom: 20 }}>Ajustes</h2>
      <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <label style={{ fontFamily: 'monospace', marginBottom: 8 }}>Sensibilidad: {localSens.toFixed(2)}</label>
        <input
          type="range"
          min="0.2"
          max="3.0"
          step="0.01"
          value={localSens}
          onChange={handleSensChange}
          style={{ width: '200px', margin: '10px auto' }}
        />
      </div>
      <button
        onClick={handleClose}
        style={{
          background: '#0af',
          border: 'none',
          color: 'white',
          padding: '10px 30px',
          borderRadius: 5,
          fontSize: 18,
          touchAction: 'manipulation',
          cursor: 'pointer',
          marginTop: 10,
        }}
      >
        CERRAR
      </button>
    </div>
  );
};

export default SettingsPanel;
