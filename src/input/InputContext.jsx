import React, { createContext, useContext, useRef, useEffect } from 'react';

export const InputContext = createContext(null);

export const InputProvider = ({ children }) => {
  // Este ref almacena el estado de entrada que se lee en cada frame
  const inputRef = useRef({
    // Rotación delta acumulada (en radianes) — se consume y resetea cada frame
    deltaYaw: 0,
    deltaPitch: 0,
    // Botones
    fire: false,
    aim: false,
    reload: false,
    // Sensibilidad global (se actualiza desde settings)
    sensitivity: 1,
    // Métodos para actualizar (se llaman desde los componentes de entrada)
    addYaw: (delta) => { inputRef.current.deltaYaw += delta; },
    addPitch: (delta) => { inputRef.current.deltaPitch -= delta; }, // invertido por convención
    setFire: (val) => { inputRef.current.fire = val; },
    setAim: (val) => { inputRef.current.aim = val; },
    setSensitivity: (val) => { inputRef.current.sensitivity = val; },
    // Resetear rotación (útil al iniciar sesión)
    resetLook: () => { inputRef.current.deltaYaw = 0; inputRef.current.deltaPitch = 0; }
  });

  // Listener de teclado/ratón (solo en escritorio, pero no interfiere en móvil)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (document.pointerLockElement) {
        // Sensibilidad aplicada al movimiento del ratón
        const sens = inputRef.current.sensitivity * 0.002;
        inputRef.current.deltaYaw += e.movementX * sens;
        inputRef.current.deltaPitch -= e.movementY * sens;
        // Limitar pitch para no dar vueltas completas (se aplica en el frame)
      }
    };

    const handleMouseDown = (e) => {
      if (e.button === 0) { // clic izquierdo -> disparo
        inputRef.current.fire = true;
      } else if (e.button === 2) { // clic derecho -> apuntar
        inputRef.current.aim = true;
      }
    };

    const handleMouseUp = (e) => {
      if (e.button === 0) inputRef.current.fire = false;
      if (e.button === 2) inputRef.current.aim = false;
    };

    const handleKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') inputRef.current.reload = true;
    };
    const handleKeyUp = (e) => {
      if (e.key === 'r' || e.key === 'R') inputRef.current.reload = false;
    };

    // Bloquear menú contextual en canvas
    const preventContext = (e) => e.preventDefault();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('contextmenu', preventContext);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
