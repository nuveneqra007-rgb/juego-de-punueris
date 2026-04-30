import React, { useRef, useEffect, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useInput } from '../input/InputContext';
import useGameStore from '../store/gameStore';
import { InputBus } from '../core/InputBus';
import { IS_MOBILE, PIXEL_RATIO, FRAME_MS } from '../core/DeviceCapabilities';
import Scene3D from './Scene3D';
import TargetManager from './Targets';

// ─── Camera heights ───────────────────────────────────────────────────────────
const STAND_HEIGHT  = 1.6;
const CROUCH_HEIGHT = 0.4;
const ADS_FOV       = 45;
const DEFAULT_FOV   = 90;
const LERP_SPEED    = 8;

// ─── GameLogic ────────────────────────────────────────────────────────────────
const GameLogic = () => {
  const inputRef  = useInput();
  const { camera, gl } = useThree();
  const phase     = useGameStore((s) => s.phase);
  const tick      = useGameStore((s) => s.tick);

  const lastFire    = useRef(false);
  const lookState   = useRef({ yaw: 0, pitch: 0 });
  const lastFrameMs = useRef(0);
  const camY        = useRef(STAND_HEIGHT);

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
  useFrame((state, delta) => {
    if (phase !== 'playing') return;

    // FPS throttle en móvil
    if (IS_MOBILE) {
      const now = state.clock.elapsedTime * 1000;
      if (now - lastFrameMs.current < FRAME_MS) return;
      lastFrameMs.current = now;
    }

    // 1. Consumir deltas de look
    lookState.current.yaw   += inputRef.current.deltaYaw;
    lookState.current.pitch += inputRef.current.deltaPitch;
    lookState.current.pitch  = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, lookState.current.pitch));

    inputRef.current.deltaYaw   = 0;
    inputRef.current.deltaPitch = 0;

    // 2. Aplicar rotación a cámara
    camera.rotation.order = 'YXZ';
    camera.rotation.y = lookState.current.yaw;
    camera.rotation.x = lookState.current.pitch;

    // 3. ADS (Aim Down Sights) — interpolar FOV
    const isADS = useGameStore.getState().isADS;
    const targetFov = isADS ? ADS_FOV : DEFAULT_FOV;
    camera.fov += (targetFov - camera.fov) * LERP_SPEED * delta;
    camera.updateProjectionMatrix();

    // 4. Crouch — interpolar altura de cámara
    const isCrouching = useGameStore.getState().isCrouching;
    const targetY = isCrouching ? CROUCH_HEIGHT : STAND_HEIGHT;
    camY.current += (targetY - camY.current) * LERP_SPEED * delta;
    camera.position.y = camY.current;

    // 5. Disparo semiautomático
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

// ─── Subcomponentes memoizados ────────────────────────────────────────────────
const MemoScene = memo(Scene3D);

// ─── GameCanvas ───────────────────────────────────────────────────────────────
const GameCanvas = () => (
  <Canvas
    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    camera={{ fov: DEFAULT_FOV, near: 0.1, far: 400, position: [0, STAND_HEIGHT, 0] }}
    gl={{
      antialias:        !IS_MOBILE,
      powerPreference:  'high-performance',
      stencil:          false,
    }}
    frameloop="always"
    onCreated={({ gl }) => {
      gl.setClearColor(new THREE.Color(0x050810));
      gl.setPixelRatio(PIXEL_RATIO);
    }}
  >
    <GameLogic />
    <MemoScene />
    <TargetManager />
  </Canvas>
);

export default GameCanvas;
