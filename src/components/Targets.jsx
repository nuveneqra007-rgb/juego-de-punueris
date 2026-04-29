/**
 * TargetManager — Gestiona todos los targets del juego.
 *
 * FASE 4 cambios:
 * - Pool de meshes para raycasting pre-alocado (elimina new THREE.Mesh() por disparo)
 * - Segmentos de geometría variables por dispositivo (DeviceCapabilities)
 * - MAX_VISIBLE adaptado al dispositivo
 * - FPS throttle en useFrame mediante FRAME_MS
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../store/gameStore';
import { InputBus } from '../core/InputBus';
import { shoot } from '../core/Shooter';
import { gridShotSpawn, flickSpawn, speedSpawn, trackingPosition } from '../core/SpawnPatterns';
import { GEO_SEGMENTS, MAX_VISIBLE, FRAME_MS, IS_MOBILE } from '../core/DeviceCapabilities';

// ─── Constantes del pool ──────────────────────────────────────────────────────
const MAX_TARGETS = 20;
const HIDDEN_Y    = -999;

// Config por modo
const MODE_CONFIG = {
  gridshot: { limit: MAX_VISIBLE,     interval: 700,  scale: 1.0 },
  flick:    { limit: 1,               interval: 1500, scale: 1.1 },
  speed:    { limit: MAX_VISIBLE + 1, interval: 450,  scale: 0.75 },
  tracking: { limit: 0,               interval: 9999, scale: 1.0 },
};

// ─── Singletons de módulo (CERO allocations en runtime) ──────────────────────
const _geo   = new THREE.SphereGeometry(0.3, GEO_SEGMENTS, GEO_SEGMENTS);
const _mat   = new THREE.MeshStandardMaterial({ color: '#ff2d78', emissive: '#ff2d78', emissiveIntensity: 0.5 });
const _dummy = new THREE.Object3D();

// *** FIX FASE 4: Pool de meshes para raycasting — pre-alocado, sin new en runtime ***
// Antes: new THREE.Mesh(_geo) en cada disparo. Ahora: reutilizamos estos meshes.
const _rayMeshes = Array.from({ length: MAX_TARGETS }, (_, i) => {
  const m = new THREE.Mesh(_geo);
  m.matrixAutoUpdate = false;   // gestionamos la matriz a mano
  m.userData.poolIndex = i;     // índice fijo para siempre
  return m;
});

// ─── TargetManager ────────────────────────────────────────────────────────────
const TargetManager = () => {
  const { camera } = useThree();
  const phase        = useGameStore((s) => s.phase);
  const mode         = useGameStore((s) => s.mode);
  const registerHit  = useGameStore((s) => s.registerHit);
  const registerMiss = useGameStore((s) => s.registerMiss);

  const cfg = MODE_CONFIG[mode] ?? MODE_CONFIG.gridshot;

  // ── Pool ref ───────────────────────────────────────────────────────────────
  const instancedRef = useRef();
  const pool = useRef({
    active:    new Array(MAX_TARGETS).fill(false),
    positions: Array.from({ length: MAX_TARGETS }, () => new THREE.Vector3(0, HIDDEN_Y, 0)),
    spawnTime: new Array(MAX_TARGETS).fill(0),
    gridIdx:   new Array(MAX_TARGETS).fill(-1),
    count:     0,
  });
  const lastFrameMs = useRef(0);   // FPS throttle

  // ── Helpers ────────────────────────────────────────────────────────────────
  const activate = useCallback((slot, pos, gridIdx = -1) => {
    const p = pool.current;
    p.active[slot]    = true;
    p.positions[slot].copy(pos);
    p.spawnTime[slot] = Date.now();
    p.gridIdx[slot]   = gridIdx;
    p.count++;
  }, []);

  const deactivate = useCallback((slot) => {
    const p = pool.current;
    p.active[slot] = false;
    p.positions[slot].set(0, HIDDEN_Y, 0);
    p.gridIdx[slot] = -1;
    p.count--;
  }, []);

  const findFreeSlot = () => pool.current.active.indexOf(false);
  const getOccupiedGridIndices = () => pool.current.gridIdx.filter((g) => g >= 0);

  const resetPool = useCallback(() => {
    const p = pool.current;
    for (let i = 0; i < MAX_TARGETS; i++) {
      p.active[i]  = false;
      p.gridIdx[i] = -1;
      p.positions[i].set(0, HIDDEN_Y, 0);
    }
    p.count = 0;
    if (!instancedRef.current) return;
    for (let i = 0; i < MAX_TARGETS; i++) {
      _dummy.position.set(0, HIDDEN_Y, 0);
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      instancedRef.current.setMatrixAt(i, _dummy.matrix);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  // ── Spawn ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || cfg.limit === 0) { resetPool(); return; }

    const spawnOne = () => {
      if (pool.current.count >= cfg.limit) return;
      const slot = findFreeSlot();
      if (slot === -1) return;

      if (mode === 'gridshot') {
        const r = gridShotSpawn(getOccupiedGridIndices());
        if (r) activate(slot, r.pos, r.gridIdx);
      } else if (mode === 'flick') {
        activate(slot, flickSpawn());
      } else if (mode === 'speed') {
        const r = speedSpawn(getOccupiedGridIndices());
        if (r) activate(slot, r.pos, r.gridIdx);
      } else {
        activate(slot, new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 4,
          -5 - Math.random() * 5
        ));
      }
    };

    spawnOne();
    const id = setInterval(spawnOne, cfg.interval);
    return () => clearInterval(id);
  }, [phase, mode, cfg.limit, cfg.interval, activate, resetPool]);

  // ── Disparo ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleShoot = () => {
      if (!instancedRef.current || pool.current.count === 0) {
        registerMiss();
        return;
      }

      // *** FASE 4: Reutilizar _rayMeshes pre-alocados, NO new THREE.Mesh() ***
      const tempMeshes = [];
      for (let i = 0; i < MAX_TARGETS; i++) {
        if (!pool.current.active[i]) continue;
        const m = _rayMeshes[i];
        m.position.copy(pool.current.positions[i]);
        m.userData.spawnTime = pool.current.spawnTime[i];
        m.updateMatrix();
        m.updateMatrixWorld(true);
        tempMeshes.push(m);
      }

      const hit = shoot(camera, tempMeshes);

      if (hit) {
        const idx      = hit.object.userData.poolIndex;
        const reaction = Date.now() - hit.object.userData.spawnTime;

        if (mode === 'gridshot' || mode === 'speed') {
          const occupied = getOccupiedGridIndices().filter((g) => g !== pool.current.gridIdx[idx]);
          deactivate(idx);
          const slot = findFreeSlot();
          if (slot !== -1) {
            const fn = mode === 'speed' ? speedSpawn : gridShotSpawn;
            const r = fn(occupied);
            if (r) activate(slot, r.pos, r.gridIdx);
          }
        } else {
          deactivate(idx);
        }

        registerHit(reaction);
        InputBus.emit('hit', { reactionMs: reaction });
      } else {
        registerMiss();
        InputBus.emit('miss');
      }
    };

    return InputBus.on('shoot', handleShoot);
  }, [camera, mode, registerHit, registerMiss, activate, deactivate]);

  // ── Frame loop con FPS throttle ────────────────────────────────────────────
  useFrame((state, delta) => {
    if (!instancedRef.current) return;

    // *** FASE 4: Limitar FPS en móvil (FRAME_MS = 1000/TARGET_FPS) ***
    if (IS_MOBILE) {
      const now = state.clock.elapsedTime * 1000;
      if (now - lastFrameMs.current < FRAME_MS) return;
      lastFrameMs.current = now;
    }

    const baseScale = mode === 'speed' ? 0.75 : 1.0;
    const now = Date.now();

    for (let i = 0; i < MAX_TARGETS; i++) {
      _dummy.position.copy(pool.current.positions[i]);

      if (pool.current.active[i]) {
        const age   = now - pool.current.spawnTime[i];
        const scale = Math.min(baseScale, (age / 120) * baseScale);
        _dummy.scale.setScalar(scale);
        _dummy.rotation.y += delta * 1.5;
        _dummy.rotation.x += delta * 0.7;
      } else {
        _dummy.scale.setScalar(0);
      }

      _dummy.updateMatrix();
      instancedRef.current.setMatrixAt(i, _dummy.matrix);
    }

    instancedRef.current.instanceMatrix.needsUpdate = true;
  });

  if (mode === 'tracking') return <TrackingTarget />;

  return <instancedMesh ref={instancedRef} args={[_geo, _mat, MAX_TARGETS]} />;
};

// ─── TrackingTarget ────────────────────────────────────────────────────────────
const _trackGeo = new THREE.SphereGeometry(0.4, GEO_SEGMENTS, GEO_SEGMENTS);
const _trackMat = new THREE.MeshStandardMaterial({ color: '#ffb800', emissive: '#ffb800', emissiveIntensity: 0.5 });
const _trackMesh = new THREE.Mesh(_trackGeo); // singleton para raycasting

const TrackingTarget = () => {
  const { camera } = useThree();
  const phase    = useGameStore((s) => s.phase);
  const addScore = useGameStore((s) => s.addScore);
  const meshRef  = useRef();
  const elapsed  = useRef(0);

  useFrame((_, delta) => {
    if (phase !== 'playing' || !meshRef.current) return;
    elapsed.current += delta;

    const pos = trackingPosition(elapsed.current);
    meshRef.current.position.copy(pos);

    // Actualizar posición del singleton para raycasting
    _trackMesh.position.copy(pos);
    _trackMesh.updateMatrixWorld(true);

    const hit = shoot(camera, [_trackMesh]);
    meshRef.current.material.emissiveIntensity = hit ? 1.2 : 0.5;
    if (hit) addScore(1);
  });

  if (phase !== 'playing') return null;
  return <mesh ref={meshRef} geometry={_trackGeo} material={_trackMat} />;
};

export default TargetManager;
