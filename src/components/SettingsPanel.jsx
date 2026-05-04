import React, { useState, useEffect, useCallback } from 'react';
import useGameStore from '../store/gameStore';
import { useInput } from '../input/InputContext';

const SettingsPanel = ({ onClose }) => {
  const sensitivity       = useGameStore((s) => s.sensitivity);
  const updateSensitivity = useGameStore((s) => s.updateSensitivity);
  const inputRef          = useInput();
  const [localSens, setLocalSens] = useState(sensitivity);

  const handleSensChange = (e) => {
    const val = parseFloat(e.target.value);
    setLocalSens(val);
    updateSensitivity(val);
    inputRef.current.setSensitivity(val);
  };

  const handleClose = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  // Descripción visual de la sensibilidad
  const sensLabel = localSens < 0.8 ? 'BAJA' : localSens < 1.5 ? 'MEDIA' : localSens < 2.2 ? 'ALTA' : 'MUY ALTA';

  return (
    <div className="settings-overlay">
      <div className="settings-card">
        <h2>⚙ AJUSTES</h2>

        <div className="settings-row">
          <div className="settings-label">
            SENSIBILIDAD
            <span>{localSens.toFixed(2)} · {sensLabel}</span>
          </div>
          <input
            type="range" min="0.2" max="3.0" step="0.05"
            value={localSens}
            onChange={handleSensChange}
          />
          {/* Indicadores de rango */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'var(--font-hud)', fontSize: 10,
            color: 'var(--c-text-muted)', marginTop: 4, letterSpacing: 1,
          }}>
            <span>0.2</span><span>MEDIA 1.5</span><span>3.0</span>
          </div>
        </div>

        {/* Toggle FPS */}
        <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="settings-label" style={{ marginBottom: 0 }}>
            MOSTRAR FPS
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useGameStore((s) => s.showFPS)}
              onChange={(e) => useGameStore.getState().updateSettings({ showFPS: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: 'var(--c-primary)', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* Toggle VR Effects */}
        <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="settings-label" style={{ marginBottom: 0 }}>
            EFECTOS VR (Vignette)
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useGameStore((s) => s.vrEffects)}
              onChange={(e) => useGameStore.getState().updateSettings({ vrEffects: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: 'var(--c-primary)', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* Toggle Gyro */}
        <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="settings-label" style={{ marginBottom: 0 }}>
            USAR GIROSCOPIO (Móvil)
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useGameStore((s) => s.gyroEnabled)}
              onChange={(e) => {
                const checked = e.target.checked;
                useGameStore.getState().updateSettings({ gyroEnabled: checked });
                if (checked && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                  DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                      if (permissionState !== 'granted') {
                        useGameStore.getState().updateSettings({ gyroEnabled: false });
                        alert("Permiso de giroscopio denegado.");
                      }
                    })
                    .catch(console.error);
                }
              }}
              style={{ width: 18, height: 18, accentColor: 'var(--c-primary)', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* Tip de uso */}
        <div style={{
          background: 'rgba(0,212,255,0.05)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          color: 'var(--c-text-muted)',
          lineHeight: 1.5,
          marginBottom: 20,
        }}>
          💡 Para móvil recomendamos entre 0.4 y 1.0.<br/>
          Para ratón, entre 0.8 y 2.0.
        </div>

        <button className="btn-primary" onClick={handleClose} style={{ width: '100%' }}>
          GUARDAR Y CERRAR
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;
