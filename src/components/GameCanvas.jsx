import React, { useRef, useEffect, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useInput } from '../input/InputContext';
import useGameStore from '../store/gameStore';
import { InputBus } from '../core/InputBus';
import { IS_MOBILE, PIXEL_RATIO, FRAME_MS, IS_LOW_END } from '../core/DeviceCapabilities';
import { soundEngine } from '../core/SoundEngine';
import Scene3D from './Scene3D';
import TargetManager from './Targets';
import VREffects from './VREffects';
import WeaponViewmodel from './WeaponViewmodel';
import { weaponSystem } from '../core/WeaponSystem';
import { createPortal } from '@react-three/fiber';
import { getModeEpicConfig } from '../core/DifficultyConfig';

// ─── Camera heights ───────────────────────────────────────────────────────────
const STAND_HEIGHT  = 1.6;
const CROUCH_HEIGHT = 0.4;
const ADS_FOV       = 45;
const ADS_Z         = -6;    // Avance de cámara hacia la pared al usar mira
const DEFAULT_FOV   = 85;    // VR-style wider FOV (was 90, 85 is the sweet spot)
const LERP_SPEED    = 8;

// ─── Fog Setup (adds depth/atmosphere to open environment) ────────────────────
const FogSetup = () => {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2(0xb0b0b8, 0.008);
    return () => { scene.fog = null; };
  }, [scene]);
  return null;
};

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
  const camZ        = useRef(0);

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

  // ── Timer de sesión y Weapon System ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') {
      weaponSystem.reset();
      return;
    }
    
    // Set weapon based on current mode
    const difficulty = useGameStore.getState().difficulty;
    const epicConf = getModeEpicConfig(useGameStore.getState().mode, difficulty);
    weaponSystem.setMode(useGameStore.getState().mode, epicConf);
    
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
      weaponSystem.reset();
    };
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

    // 3. ADS (Aim Down Sights) — interpolar FOV + avanzar cámara
    const stateStore = useGameStore.getState();
    const isADS = stateStore.isADS;
    const mode = stateStore.mode;
    const epicConf = getModeEpicConfig(mode, stateStore.difficulty);

    // Apply bullet time
    let dt = delta;
    if (stateStore.bulletTimeActive) dt *= 0.3; // 30% speed

    let targetFov = isADS ? ADS_FOV : DEFAULT_FOV;
    
    // Dynamic FOV for Speed Hard
    if (mode === 'speed' && epicConf.tunnelVision) {
      // Base FOV = 90, +5 per 3 hits (calculate from combo?), wait, user said "Por cada 3 aciertos seguidos, el FOV sube +5 (máximo 120)... Si fallas FOV cae a 70"
      const combo = stateStore.combo;
      const misses = stateStore.consecutiveMisses;
      if (misses > 0) {
        targetFov = 70;
      } else {
        targetFov = Math.min(epicConf.maxFov ?? 120, 90 + Math.floor(combo / 3) * 5);
      }
    }

    const targetZ   = isADS ? ADS_Z   : 0;
    
    const prevFov = camera.fov;
    camera.fov += (targetFov - camera.fov) * LERP_SPEED * dt;
    if (Math.abs(prevFov - camera.fov) > 0.01) {
      camera.updateProjectionMatrix();
    }
    
    camZ.current += (targetZ - camZ.current) * LERP_SPEED * dt;
    camera.position.z = camZ.current;

    // 4. Crouch — interpolar altura de cámara
    const isCrouching = stateStore.isCrouching;
    const targetY = isCrouching ? CROUCH_HEIGHT : STAND_HEIGHT;
    camY.current += (targetY - camY.current) * LERP_SPEED * dt;
    camera.position.y = camY.current;

    // 5. Disparo controlado por Weapon System
    const fireInput = inputRef.current.fire;
    const weapon = weaponSystem.weapon;

    if (weapon.automatic) {
      if (fireInput && !weaponSystem.isFiring) {
        weaponSystem.startFiring();
      } else if (!fireInput && weaponSystem.isFiring) {
        weaponSystem.stopFiring();
      }
    } else {
      // Semi-auto
      if (fireInput) {
        if (!lastFire.current) {
          lastFire.current = true;
          weaponSystem.startFiring();
          // weaponSystem.startFiring for semi-auto does one shot. We must stop it immediately to allow next shot.
          weaponSystem.stopFiring();
        }
      } else {
        lastFire.current = false;
      }
    }

    // Update recoil recovery with bullet-time modified dt
    weaponSystem.update(dt);

    // Apply recoil offset to camera pitch for visual kick
    camera.rotation.x += weaponSystem.recoilOffset;
  });

  return (
    <>
      {createPortal(<WeaponViewmodel />, camera)}
    </>
  );
};

// ─── Subcomponentes memoizados ────────────────────────────────────────────────
const MemoScene = memo(Scene3D);

// ─── GameCanvas ───────────────────────────────────────────────────────────────
const GameCanvas = () => {
  const vrEffects = useGameStore((s) => s.vrEffects);
  const glitchActive = useGameStore((s) => s.glitchActive);
  
  const canvasStyle = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    transition: 'filter 0.1s',
  };

  if (glitchActive) {
    canvasStyle.filter = 'hue-rotate(90deg) contrast(150%) brightness(1.5)';
    canvasStyle.animation = 'shake 0.3s cubic-bezier(.36,.07,.19,.97) both infinite';
  }

  return (
    <>
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-2px, 1px, 0); }
          20%, 80% { transform: translate3d(2px, -1px, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 2px, 0); }
          40%, 60% { transform: translate3d(4px, -2px, 0); }
        }
      `}</style>
      <Canvas
        style={canvasStyle}
      camera={{ fov: DEFAULT_FOV, near: 0.1, far: 400, position: [0, STAND_HEIGHT, 0] }}
      shadows={!IS_LOW_END}
      gl={{
        antialias:        !IS_MOBILE,
        powerPreference:  'high-performance',
        stencil:          false,
      }}
      frameloop="always"
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(0xb8bcc5));
        gl.setPixelRatio(PIXEL_RATIO);
        if (!IS_LOW_END) {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }
      }}
    >
      <FogSetup />
      <GameLogic />
      <MemoScene />
      <TargetManager />
      <WeaponViewmodel />
      <VREffects enabled={vrEffects} />
    </Canvas>
    </>
  );
};

export default GameCanvas;
