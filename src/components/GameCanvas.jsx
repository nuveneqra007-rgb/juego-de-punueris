import React, { useRef, useEffect, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useInput } from '../input/InputContext';
import useGameStore from '../store/gameStore';
import { InputBus } from '../core/InputBus';
import { IS_MOBILE, PIXEL_RATIO, FRAME_MS } from '../core/DeviceCapabilities';
import Scene3D from './Scene3D';
import Crosshair from './Crosshair';
import TargetManager from './Targets';

// ─── GameLogic ────────────────────────────────────────────────────────────────
// Componente interno que vive en el contexto R3F.
// Responsabilidad única: leer input, mover cámara, emitir disparos.
const GameLogic = () => {
  const inputRef  = useInput();
  const { camera, gl } = useThree();
  const phase     = useGameStore((s) => s.phase);
  const tick      = useGameStore((s) => s.tick);

  const lastFire    = useRef(false);
  const lookState   = useRef({ yaw: 0, pitch: 0 });
  const lastFrameMs = useRef(0);   // FPS throttle timestamp

  // ── Pointer Lock (solo escritorio) ────────────────────────────────────────
  useEffect(() => {
    if (IS_MOBILE) return;
    const canvas = gl.domElement;
    const requestLock = () => {
      if (phase === 'playing' && !document.pointerLockElement) {
        canvas.requestPointerLock();
      }
    };
    canvas.addEventListener('click', requestLock);
    return () => canvas.removeEventListener('click', requestLock);
  }, [gl, phase]);

  // ── Timer de sesión ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, tick]);

  // ── Liberar Pointer Lock ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [phase]);

  // ── Loop principal ────────────────────────────────────────────────────────
  useFrame((state) => {
    if (phase !== 'playing') return;

    // *** FASE 4: FPS throttle en móvil ***
    if (IS_MOBILE) {
      const now = state.clock.elapsedTime * 1000;
      if (now - lastFrameMs.current < FRAME_MS) return;
      lastFrameMs.current = now;
    }

    // 1. Consumir deltas
    lookState.current.yaw   += inputRef.current.deltaYaw;
    lookState.current.pitch += inputRef.current.deltaPitch;
    lookState.current.pitch  = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, lookState.current.pitch));

    // 2. Resetear acumuladores
    inputRef.current.deltaYaw   = 0;
    inputRef.current.deltaPitch = 0;

    // 3. Aplicar a cámara
    camera.rotation.order = 'YXZ';
    camera.rotation.y = lookState.current.yaw;
    camera.rotation.x = lookState.current.pitch;

    // 4. Disparo semiautomático
    if (inputRef.current.fire) {
      if (!lastFire.current) {
        lastFire.current = true;
        InputBus.emit('shoot');
      }
    } else {
      lastFire.current = false;
    }
  });

  return null;
};

// ─── Subcomponentes memoizados (nunca cambian, nunca deben re-renderizar) ─────
// React.memo garantiza que no se re-creen cuando el padre re-renderiza
const MemoScene    = memo(Scene3D);
const MemoCrosshair = memo(Crosshair);

// ─── GameCanvas ───────────────────────────────────────────────────────────────
const GameCanvas = () => (
  <Canvas
    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    camera={{ fov: 90, near: 0.1, far: 400, position: [0, 0, 0] }}
    gl={{
      antialias:        !IS_MOBILE,
      powerPreference:  'high-performance',
      stencil:          false,
      // depth: true por defecto, no hace falta declararlo
    }}
    // *** FASE 4: "demand" → solo renderiza cuando se llama invalidate() o hay animación.
    //     Durante el menú/resumen esto ahorra TODA la GPU. Durante playing, useFrame
    //     siempre solicita el siguiente frame automáticamente mientras esté activo.
    frameloop="always"   // 'always' porque el canvas siempre está montado y useFrame se encarga
    onCreated={({ gl }) => {
      gl.setClearColor(new THREE.Color(0x050810));
      // *** FASE 4: pixelRatio adaptativo desde DeviceCapabilities ***
      gl.setPixelRatio(PIXEL_RATIO);
    }}
  >
    <GameLogic />
    <MemoScene />
    <MemoCrosshair />
    <TargetManager />
  </Canvas>
);

export default GameCanvas;
