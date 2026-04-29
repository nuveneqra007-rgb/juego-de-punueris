import React, { useRef, useEffect, useState } from 'react';
import { useInput } from '../input/InputContext';

const MobileControls = () => {
  const inputRef = useInput();
  const touchStartRef = useRef(null);
  const hasMovedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  // Detectar si es un dispositivo táctil
  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setVisible(isTouchDevice);
  }, []);

  if (!visible) return null;

  const handlePointerDown = (e) => {
    e.preventDefault();
    touchStartRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
    hasMovedRef.current = false;
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (touchStartRef.current && touchStartRef.current.id === e.pointerId) {
      const deltaX = e.clientX - touchStartRef.current.x;
      const deltaY = e.clientY - touchStartRef.current.y;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMovedRef.current = true;
        // Aplicar sensibilidad
        const sens = inputRef.current.sensitivity * 0.005;
        inputRef.current.addYaw(deltaX * sens);
        inputRef.current.addPitch(deltaY * sens);
        
        // Actualizar referencia
        touchStartRef.current.x = e.clientX;
        touchStartRef.current.y = e.clientY;
      }
    }
  };

  const handlePointerUp = (e) => {
    if (touchStartRef.current && touchStartRef.current.id === e.pointerId) {
      const duration = Date.now() - touchStartRef.current.time;
      const isTap = !hasMovedRef.current && duration < 300;
      
      if (isTap) {
        // Simular un disparo
        inputRef.current.setFire(true);
        // Desactivar el disparo rápido para que el frame lo registre
        setTimeout(() => {
          inputRef.current.setFire(false);
        }, 50);
      }
      
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch {}
      touchStartRef.current = null;
      hasMovedRef.current = false;
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none',
        pointerEvents: 'auto',
        zIndex: 10,
        // sin fondo para que sea invisible
      }}
    />
  );
};

export default MobileControls;
