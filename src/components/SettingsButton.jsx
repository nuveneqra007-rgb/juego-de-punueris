import React from 'react';

const SettingsButton = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      position: 'absolute',
      top: 10,
      right: 10,
      background: 'rgba(255,255,255,0.2)',
      border: '1px solid white',
      borderRadius: 8,
      color: 'white',
      fontSize: 20,
      padding: '5px 12px',
      zIndex: 100,
      touchAction: 'manipulation',
      cursor: 'pointer',
    }}
  >
    ⚙️
  </button>
);

export default SettingsButton;
