import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useInput } from '../input/InputContext';
import useGameStore from '../store/gameStore';
import Scene3D from './Scene3D';
import Crosshair from './Crosshair';
import Targets from './Targets';

// Componente interno para manejar la cámara y el juego
const GameLogic = () => {
  const inputRef = useInput();
  const { camera, gl } = useThree();
  const { phase, tick } = useGameStore();
  const lastFire = useRef(false);
  const lookState = useRef({ yaw: 0, pitch: 0 });

  // Al montar, pedir Pointer Lock al hacer clic en el canvas (escritorio)
  useEffect(() => {
    const canvas = gl.domElement;
    const requestLock = () => {
      if (phase === 'playing' && !document.pointerLockElement) {
        canvas.requestPointerLock();
      }
    };
    canvas.addEventListener('click', requestLock);
    return () => canvas.removeEventListener('click', requestLock);
  }, [gl, phase]);

  // Iniciar sesión al entrar en playing: timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, tick]);

  // Liberar pointer lock al salir de playing
  useEffect(() => {
    if (phase !== 'playing' && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [phase]);

  useFrame(() => {
    if (phase !== 'playing') return;

    // Consumir deltas de rotación acumulados
    const { deltaYaw, deltaPitch } = inputRef.current;
    lookState.current.yaw += deltaYaw;
    lookState.current.pitch += deltaPitch;

    // Limitar pitch para no dar vueltas completas
    lookState.current.pitch = Math.max(
      -Math.PI / 2.5,
      Math.min(Math.PI / 2.5, lookState.current.pitch)
    );

    // Resetear acumuladores para evitar giros fantasmas
    inputRef.current.deltaYaw = 0;
    inputRef.current.deltaPitch = 0;

    // Aplicar rotación a la cámara
    camera.rotation.order = 'YXZ';
    camera.rotation.y = lookState.current.yaw;
    camera.rotation.x = lookState.current.pitch;

    // Disparo semiautomático (una bala por clic)
    if (inputRef.current.fire) {
      if (!lastFire.current) {
        lastFire.current = true;
        window.dispatchEvent(new CustomEvent('player-shoot'));
      }
    } else {
      lastFire.current = false;
    }
  });

  return null;
};

const GameCanvas = () => {
  return (
    <Canvas
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      camera={{ fov: 90, near: 0.1, far: 1000, position: [0, 0, 0] }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(0x050810));
      }}
    >
      <GameLogic />
      <Scene3D />
      <Crosshair />
      <Targets />
    </Canvas>
  );
};

export default GameCanvas;
