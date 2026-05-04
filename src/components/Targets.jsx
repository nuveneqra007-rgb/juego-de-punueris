/**
 * TargetManager — Wall-mounted target system with hit particles.
 * Uses individual mesh components instead of InstancedMesh for reliability.
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../store/gameStore';
import { InputBus } from '../core/InputBus';
import { shoot } from '../core/Shooter';
import { gridShotSpawn, flickSpawn, speedSpawn, trackingPosition } from '../core/SpawnPatterns';
import { GEO_SEGMENTS, MAX_VISIBLE, FRAME_MS, IS_MOBILE } from '../core/DeviceCapabilities';
import { getDifficulty } from '../core/DifficultyConfig';
import { soundEngine } from '../core/SoundEngine';

const MAX_TARGETS = 16;
const MODE_CONFIG = {
  gridshot: { limit: MAX_VISIBLE,     interval: 700 },
  flick:    { limit: 1,               interval: 1500 },
  speed:    { limit: MAX_VISIBLE + 1, interval: 450 },
  tracking: { limit: 0,               interval: 9999 },
};

// Shared geometry/material (created once)
const _sphereGeo = new THREE.SphereGeometry(0.5, GEO_SEGMENTS, GEO_SEGMENTS);

// ─── SingleTarget ────────────────────────────────────────────────────────────
const SingleTarget = ({ position, spawnTime, baseScale }) => {
  const meshRef = useRef();
  const ringRef = useRef();

  useFrame(() => {
    if (!meshRef.current) return;
    const age = Date.now() - spawnTime;
    const s = Math.min(baseScale, (age / 120) * baseScale);
    meshRef.current.scale.setScalar(s);
    // Pulsing glow ring
    if (ringRef.current) {
      const pulse = 1 + Math.sin(age * 0.005) * 0.1;
      ringRef.current.scale.setScalar(s * pulse * 1.4);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={_sphereGeo} userData={{ isTarget: true }}>
        <meshBasicMaterial color="#ff2d78" />
      </mesh>
      <mesh ref={ringRef} position={[0, 0, 0.05]}>
        <ringGeometry args={[0.5, 0.65, GEO_SEGMENTS * 2]} />
        <meshBasicMaterial color="#ff2d78" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ─── HitParticles ────────────────────────────────────────────────────────────
const HitParticle = ({ x, y, z, vx, vy, vz, born, s }) => {
  const ref = useRef();
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.x += vx * dt;
    ref.current.position.y += vy * dt;
    ref.current.position.z += vz * dt;
    vy -= 6 * dt; // eslint-disable-line
    const life = 1 - (Date.now() - born) / 500;
    if (life <= 0) { ref.current.visible = false; return; }
    ref.current.scale.setScalar(s * life);
  });
  return (
    <mesh ref={ref} position={[x, y, z]}>
      <sphereGeometry args={[0.05, 4, 4]} />
      <meshBasicMaterial color="#ff2d78" />
    </mesh>
  );
};

const HitParticles = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const handle = ({ position } = {}) => {
      if (!position) return;
      const newP = [];
      const count = 6 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        newP.push({
          id: Date.now() + Math.random(),
          x: position.x, y: position.y, z: position.z + 0.2,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5 + 2,
          vz: Math.random() * 3,
          born: Date.now(), s: 0.4 + Math.random() * 0.6,
        });
      }
      setParticles(prev => [...prev.slice(-20), ...newP]);
      // Clean up after animation
      setTimeout(() => {
        setParticles(prev => prev.filter(p => Date.now() - p.born < 600));
      }, 600);
    };
    return InputBus.on('hit-fx', handle);
  }, []);

  return particles.map(p => <HitParticle key={p.id} {...p} />);
};

// ─── TargetManager ────────────────────────────────────────────────────────────
const TargetManager = () => {
  const { camera } = useThree();
  const phase        = useGameStore((s) => s.phase);
  const mode         = useGameStore((s) => s.mode);
  const difficulty   = useGameStore((s) => s.difficulty);
  const registerHit  = useGameStore((s) => s.registerHit);
  const registerMiss = useGameStore((s) => s.registerMiss);
  const cfg = MODE_CONFIG[mode] ?? MODE_CONFIG.gridshot;
  const diffConfig = getDifficulty(difficulty);

  // Targets state: array of { id, position:[x,y,z], spawnTime, gridIdx }
  const [targets, setTargets] = useState([]);
  const targetsRef = useRef([]); // mirror for non-React access
  const meshRefs = useRef({});   // Map<id, meshRef>

  // Keep ref in sync
  useEffect(() => { targetsRef.current = targets; }, [targets]);

  const baseScale = (mode === 'speed' ? 0.75 : 1.0) * diffConfig.targetScale;

  // ── Spawn logic ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || cfg.limit === 0) {
      setTargets([]);
      return;
    }

    const spawnInterval = Math.round(cfg.interval * diffConfig.spawnMult);

    const spawnOne = () => {
      setTargets(prev => {
        if (prev.length >= cfg.limit) return prev;
        const occupiedGridIdx = prev.map(t => t.gridIdx).filter(g => g >= 0);
        let newTarget = null;

        if (mode === 'gridshot') {
          const r = gridShotSpawn(occupiedGridIdx);
          if (r) newTarget = { id: Date.now() + Math.random(), position: r.pos.toArray(), spawnTime: Date.now(), gridIdx: r.gridIdx };
        } else if (mode === 'flick') {
          const p = flickSpawn();
          newTarget = { id: Date.now() + Math.random(), position: p.toArray(), spawnTime: Date.now(), gridIdx: -1 };
        } else if (mode === 'speed') {
          const r = speedSpawn(occupiedGridIdx);
          if (r) newTarget = { id: Date.now() + Math.random(), position: r.pos.toArray(), spawnTime: Date.now(), gridIdx: r.gridIdx };
        }

        if (!newTarget) return prev;
        return [...prev, newTarget];
      });
    };

    spawnOne();
    const id = setInterval(spawnOne, spawnInterval);
    return () => clearInterval(id);
  }, [phase, mode, difficulty, cfg.limit, cfg.interval, diffConfig.spawnMult]);

  // ── Shoot handler ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleShoot = () => {
      const currentTargets = targetsRef.current;
      if (currentTargets.length === 0) { registerMiss(); return; }

      // Build mesh array for raycasting
      const meshes = [];
      for (const t of currentTargets) {
        const ref = meshRefs.current[t.id];
        if (ref) {
          ref.userData.targetId = t.id;
          ref.userData.spawnTime = t.spawnTime;
          ref.updateMatrixWorld(true);
          meshes.push(ref);
        }
      }

      const hit = shoot(camera, meshes);
      if (hit) {
        const targetId = hit.object.userData.targetId;
        const reaction = Date.now() - hit.object.userData.spawnTime;
        const hitTarget = currentTargets.find(t => t.id === targetId);
        const hitPos = hitTarget ? new THREE.Vector3(...hitTarget.position) : null;

        // Remove hit target and spawn replacement for grid modes
        setTargets(prev => {
          const remaining = prev.filter(t => t.id !== targetId);
          if (mode === 'gridshot' || mode === 'speed') {
            const occ = remaining.map(t => t.gridIdx).filter(g => g >= 0);
            const fn = mode === 'speed' ? speedSpawn : gridShotSpawn;
            const r = fn(occ);
            if (r) {
              return [...remaining, { id: Date.now() + Math.random(), position: r.pos.toArray(), spawnTime: Date.now(), gridIdx: r.gridIdx }];
            }
          }
          return remaining;
        });

        registerHit(reaction);
        InputBus.emit('hit', { reactionMs: reaction });
        if (hitPos) InputBus.emit('hit-fx', { position: hitPos });
        if (IS_MOBILE && navigator.vibrate) navigator.vibrate(35);
      } else {
        registerMiss();
        InputBus.emit('miss');
      }
    };
    return InputBus.on('shoot', handleShoot);
  }, [camera, mode, difficulty, registerHit, registerMiss]);

  // Register/unregister mesh refs
  const setMeshRef = useCallback((id, ref) => {
    if (ref) meshRefs.current[id] = ref;
    else delete meshRefs.current[id];
  }, []);

  if (mode === 'tracking') return (<><TrackingTarget /><HitParticles /></>);

  return (
    <>
      {targets.map(t => (
        <group key={t.id} position={t.position} scale={[baseScale, baseScale, baseScale]}>
          <mesh
            ref={(ref) => setMeshRef(t.id, ref)}
            geometry={_sphereGeo}
          >
            <meshBasicMaterial color="#ff2d78" />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <ringGeometry args={[0.5, 0.7, GEO_SEGMENTS * 2]} />
            <meshBasicMaterial color="#ff2d78" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <HitParticles />
    </>
  );
};

// ─── TrackingTarget ──────────────────────────────────────────────────────────
const _trackGeo  = new THREE.SphereGeometry(0.5, GEO_SEGMENTS, GEO_SEGMENTS);
const _trackMesh = new THREE.Mesh(_trackGeo);

const TrackingTarget = () => {
  const { camera } = useThree();
  const phase      = useGameStore((s) => s.phase);
  const difficulty = useGameStore((s) => s.difficulty);
  const addScore   = useGameStore((s) => s.addScore);
  const meshRef    = useRef();
  const elapsed    = useRef(0);
  const [isHit, setIsHit] = useState(false);
  const diffConfig = getDifficulty(difficulty);

  useFrame((_, delta) => {
    if (phase !== 'playing' || !meshRef.current) return;
    elapsed.current += delta * diffConfig.speedMult;
    const pos = trackingPosition(elapsed.current);
    meshRef.current.position.copy(pos);
    meshRef.current.scale.setScalar(diffConfig.targetScale);
    _trackMesh.position.copy(pos);
    _trackMesh.scale.setScalar(diffConfig.targetScale);
    _trackMesh.updateMatrixWorld(true);
    const hit = shoot(camera, [_trackMesh]);
    setIsHit(!!hit);
    if (hit) addScore(1);
  });

  if (phase !== 'playing') return null;
  return (
    <mesh ref={meshRef} geometry={_trackGeo}>
      <meshBasicMaterial color={isHit ? '#ffffff' : '#ffb800'} />
    </mesh>
  );
};

export default TargetManager;
