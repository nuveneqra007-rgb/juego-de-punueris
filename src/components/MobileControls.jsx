import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useInput } from '../input/InputContext';
import useGameStore from '../store/gameStore';

const MobileControls = () => {
  const inputRef = useInput();
  const touchStartRef = useRef(null);
  const hasMovedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Detectar si es un dispositivo táctil
  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setVisible(isTouchDevice);
  }, []);

  // ── Fullscreen state listener ──────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  // ── Fullscreen Toggle (entrar Y salir) ─────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } else {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    }
  }, []);

  // ── Touch look (zona de la pantalla) ───────────────────────────────────────
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

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMovedRef.current = true;
        const sens = inputRef.current.sensitivity * 0.005;
        inputRef.current.addYaw(deltaX * sens);
        inputRef.current.addPitch(deltaY * sens);
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
        inputRef.current.setFire(true);
        setTimeout(() => { inputRef.current.setFire(false); }, 50);
      }

      try { e.target.releasePointerCapture(e.pointerId); } catch {}
      touchStartRef.current = null;
      hasMovedRef.current = false;
    }
  };

  // ── Fire button ────────────────────────────────────────────────────────────
  const handleFireDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current.setFire(true);
  };

  const handleFireUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current.setFire(false);
  };

  // ── ADS button (toggle on tap) ──────────────────────────────────────────────
  const [adsActive, setAdsActive] = useState(false);
  const handleADSToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !adsActive;
    setAdsActive(next);
    useGameStore.getState().setADS(next);
  };

  // ── Crouch button (toggle) ─────────────────────────────────────────────────
  const handleCrouchToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    useGameStore.getState().toggleCrouch();
  };

  if (!visible) return null;

  const btnBase = {
    position: 'absolute',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    fontFamily: 'var(--font-hud)',
    fontWeight: 700,
    letterSpacing: 1,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    transition: 'transform 0.1s, opacity 0.1s',
    zIndex: 15,
  };

  return (
    <>
      {/* ── Touch Look Zone (toda la pantalla, debajo de los botones) ── */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          left: 0, top: 0,
          width: '100%', height: '100%',
          touchAction: 'none',
          pointerEvents: 'auto',
          zIndex: 10,
        }}
      />

      {/* ── 🔥 FIRE Button (derecha inferior, grande) ── */}
      <div
        onPointerDown={handleFireDown}
        onPointerUp={handleFireUp}
        onPointerCancel={handleFireUp}
        onPointerLeave={handleFireUp}
        style={{
          ...btnBase,
          right: 20,
          bottom: 24,
          width: 72,
          height: 72,
          background: 'rgba(255, 45, 120, 0.2)',
          borderColor: 'rgba(255, 45, 120, 0.6)',
          color: '#ff2d78',
          fontSize: 24,
          boxShadow: '0 0 20px rgba(255, 45, 120, 0.3), inset 0 0 15px rgba(255, 45, 120, 0.1)',
        }}
      >
        🔥
      </div>

      {/* ── 🎯 ADS Button (derecha, encima de fire) — tap toggle ── */}
      <div
        onPointerDown={handleADSToggle}
        style={{
          ...btnBase,
          right: 28,
          bottom: 112,
          width: 52,
          height: 52,
          background: adsActive ? 'rgba(0, 212, 255, 0.35)' : 'rgba(0, 212, 255, 0.15)',
          borderColor: adsActive ? '#00d4ff' : 'rgba(0, 212, 255, 0.5)',
          color: adsActive ? '#fff' : '#00d4ff',
          fontSize: 16,
          boxShadow: adsActive
            ? '0 0 18px rgba(0, 212, 255, 0.5), inset 0 0 10px rgba(0, 212, 255, 0.2)'
            : '0 0 14px rgba(0, 212, 255, 0.2)',
        }}
      >
        🎯
      </div>

      {/* ── 🧎 Crouch Button (izquierda inferior) ── */}
      <div
        onPointerDown={handleCrouchToggle}
        style={{
          ...btnBase,
          left: 20,
          bottom: 24,
          width: 52,
          height: 52,
          background: 'rgba(255, 184, 0, 0.15)',
          borderColor: 'rgba(255, 184, 0, 0.5)',
          color: '#ffb800',
          fontSize: 16,
          boxShadow: '0 0 14px rgba(255, 184, 0, 0.2)',
        }}
      >
        🧎
      </div>

      {/* ── Fullscreen Toggle (arriba izquierda) ── */}
      <div
        onPointerDown={(e) => { e.preventDefault(); toggleFullscreen(); }}
        style={{
          ...btnBase,
          left: 12,
          top: 56,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: isFullscreen ? 'rgba(0, 212, 255, 0.15)' : 'rgba(11, 15, 26, 0.7)',
          borderColor: isFullscreen ? 'rgba(0, 212, 255, 0.5)' : 'rgba(0, 212, 255, 0.25)',
          color: isFullscreen ? '#00d4ff' : 'rgba(0, 212, 255, 0.7)',
          fontSize: 14,
          boxShadow: isFullscreen ? '0 0 10px rgba(0,212,255,0.2)' : 'none',
        }}
      >
        {isFullscreen ? '⛌' : '⛶'}
      </div>

      {/* ── Gyroscope Toggle (arriba izquierda, bajo fullscreen) ── */}
      <div
        onPointerDown={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentState = useGameStore.getState().gyroEnabled;
          const nextState = !currentState;
          
          if (nextState && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
              const permission = await DeviceOrientationEvent.requestPermission();
              if (permission === 'granted') {
                useGameStore.getState().updateSettings({ gyroEnabled: true });
              } else {
                alert("Permiso de giroscopio denegado.");
              }
            } catch (error) {
              console.error(error);
            }
          } else {
            useGameStore.getState().updateSettings({ gyroEnabled: nextState });
          }
        }}
        style={{
          ...btnBase,
          left: 12,
          top: 104,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: useGameStore((s) => s.gyroEnabled) ? 'rgba(0, 212, 255, 0.35)' : 'rgba(11, 15, 26, 0.7)',
          borderColor: useGameStore((s) => s.gyroEnabled) ? '#00d4ff' : 'rgba(0, 212, 255, 0.25)',
          color: useGameStore((s) => s.gyroEnabled) ? '#fff' : 'rgba(0, 212, 255, 0.7)',
          fontSize: 14,
          boxShadow: useGameStore((s) => s.gyroEnabled) ? '0 0 10px rgba(0,212,255,0.4)' : 'none',
        }}
      >
        🔄
      </div>
    </>
  );
};

export default MobileControls;
