import React, { useRef, useEffect, useState } from 'react';
import { useInput } from '../input/InputContext';

const MobileControls = () => {
  const inputRef = useInput();
  const joystickRef = useRef(null);
  const touchIdRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  // Detectar si es un dispositivo táctil
  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setVisible(isTouchDevice);
  }, []);

  if (!visible) return null;

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (e.target === joystickRef.current || joystickRef.current.contains(e.target)) {
      touchIdRef.current = e.pointerId;
      joystickRef.current.setPointerCapture(e.pointerId);
      startPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e) => {
    if (touchIdRef.current === e.pointerId) {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      // Aplicar sensibilidad
      const sens = inputRef.current.sensitivity * 0.005;
      inputRef.current.addYaw(dx * sens);
      inputRef.current.addPitch(dy * sens);
      // Actualizar punto de inicio para que el movimiento sea incremental
      startPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e) => {
    if (touchIdRef.current === e.pointerId) {
      touchIdRef.current = null;
      try {
        joystickRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return (
    <div className="mobile-controls" style={{ pointerEvents: 'none' }}>
      {/* Zona del joystick (mitad izquierda) */}
      <div
        ref={joystickRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '50%',
          height: '100%',
          touchAction: 'none',
          pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.05)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
        }}
      />
      {/* Botones de acción (derecha) */}
      <div style={{ position: 'absolute', right: 20, bottom: 30, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'auto' }}>
        <button
          onPointerDown={() => inputRef.current.setFire(true)}
          onPointerUp={() => inputRef.current.setFire(false)}
          onPointerCancel={() => inputRef.current.setFire(false)}
          style={{ width: 70, height: 70, borderRadius: '50%', border: '2px solid white', background: 'rgba(255,0,0,0.3)', color: 'white', fontSize: 18, touchAction: 'manipulation', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span role="img" aria-label="fire">🔫</span>
        </button>
        <button
          onPointerDown={() => inputRef.current.setAim(true)}
          onPointerUp={() => inputRef.current.setAim(false)}
          onPointerCancel={() => inputRef.current.setAim(false)}
          style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid white', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 16, touchAction: 'manipulation', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span role="img" aria-label="aim">🎯</span>
        </button>
      </div>
    </div>
  );
};

export default MobileControls;
