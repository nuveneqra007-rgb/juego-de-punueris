import React, { createContext, useContext, useRef, useEffect } from 'react';
import { InputBus } from '../core/InputBus';

export const InputContext = createContext(null);

export const InputProvider = ({ children }) => {
  /**
   * inputRef: estado de input consumido por GameLogic en cada useFrame.
   * Mutaciones directas al ref (sin setState) para cero re-renders.
   */
  const inputRef = useRef({
    deltaYaw:    0,
    deltaPitch:  0,
    fire:        false,
    aim:         false,
    reload:      false,
    sensitivity: 1,

    // Métodos helper usados por MobileControls e InputContext
    addYaw:         (d) => { inputRef.current.deltaYaw   -= d; },
    addPitch:       (d) => { inputRef.current.deltaPitch -= d; },
    setFire:        (v) => { inputRef.current.fire    = v; },
    setAim:         (v) => { inputRef.current.aim     = v; },
    setSensitivity: (v) => { inputRef.current.sensitivity = v; },
    resetLook:      ()  => { inputRef.current.deltaYaw = 0; inputRef.current.deltaPitch = 0; },
  });

  // ── Escritorio: mouse + teclado ────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!document.pointerLockElement) return;
      const sens = inputRef.current.sensitivity * 0.002;
      inputRef.current.deltaYaw   -= e.movementX * sens;
      inputRef.current.deltaPitch -= e.movementY * sens;
    };

    const handleMouseDown = (e) => {
      if (e.button === 0) { inputRef.current.fire = true; }
      if (e.button === 2) { inputRef.current.aim  = true; }
    };

    const handleMouseUp = (e) => {
      if (e.button === 0) { inputRef.current.fire = false; }
      if (e.button === 2) { inputRef.current.aim  = false; }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') inputRef.current.reload = true;
    };
    const handleKeyUp = (e) => {
      if (e.key === 'r' || e.key === 'R') inputRef.current.reload = false;
    };

    const preventContext = (e) => e.preventDefault();

    window.addEventListener('mousemove',   handleMouseMove);
    window.addEventListener('mousedown',   handleMouseDown);
    window.addEventListener('mouseup',     handleMouseUp);
    window.addEventListener('keydown',     handleKeyDown);
    window.addEventListener('keyup',       handleKeyUp);
    window.addEventListener('contextmenu', preventContext);

    return () => {
      window.removeEventListener('mousemove',   handleMouseMove);
      window.removeEventListener('mousedown',   handleMouseDown);
      window.removeEventListener('mouseup',     handleMouseUp);
      window.removeEventListener('keydown',     handleKeyDown);
      window.removeEventListener('keyup',       handleKeyUp);
      window.removeEventListener('contextmenu', preventContext);
    };
  }, []);

  return (
    <InputContext.Provider value={inputRef}>
      {children}
    </InputContext.Provider>
  );
};

export const useInput = () => {
  const ctx = useContext(InputContext);
  if (!ctx) throw new Error('useInput must be used inside InputProvider');
  return ctx;
};
