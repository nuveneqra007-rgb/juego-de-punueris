import React from 'react';

const SettingsButton = ({ onClick }) => (
  <button
    id="settings-btn"
    onClick={onClick}
    aria-label="Ajustes"
    style={{
      position: 'absolute',
      top: 58,            // justo bajo la barra HUD (48px) + margen
      right: 12,
      width: 36, height: 36,
      borderRadius: '50%',
      background: 'rgba(11,15,26,0.7)',
      border: '1px solid rgba(0,212,255,0.2)',
      color: 'rgba(0,212,255,0.7)',
      fontSize: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
      touchAction: 'manipulation',
      zIndex: 100,
      backdropFilter: 'blur(8px)',
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#00d4ff';
      e.currentTarget.style.color = '#00d4ff';
      e.currentTarget.style.boxShadow = '0 0 12px rgba(0,212,255,0.3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)';
      e.currentTarget.style.color = 'rgba(0,212,255,0.7)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    ⚙
  </button>
);

export default SettingsButton;
