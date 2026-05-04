/**
 * TargetManager — Wall-mounted target system with hit particles.
 * Uses individual mesh components instead of InstancedMesh for reliability.
 */
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../store/gameStore';
import { InputBus } from '../core/InputBus';
import { shoot } from '../core/Shooter';
import { gridShotSpawn, flickSpawn, speedSpawn, speedApproachDepthSpawn, speedApproachHorizontalSpawn, trackingPositionLinear, trackingPositionZigzag, trackingPositionGhost } from '../core/SpawnPatterns';
import { GEO_SEGMENTS, MAX_VISIBLE, FRAME_MS, IS_MOBILE, IS_LOW_END } from '../core/DeviceCapabilities';
import { getModeEpicConfig } from '../core/DifficultyConfig';
import { soundEngine } from '../core/SoundEngine';
import { _blobShadowGeo, _blobShadowMat } from './Scene3D';

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
// epicConfig is passed as prop from parent — NO store subscription here.
const SingleTarget = ({ id, position, spawnTime, baseScale, mode, isDecoy, setMeshRef, epicConfig }) => {
  const meshRef = useRef();
  const ringRef = useRef();

  // For speed mode approach
  const startZ = useRef(position[2]);
  const currentPos = useRef(new THREE.Vector3(...position));

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const age = Date.now() - spawnTime;
    
    // Scale animation
    const s = Math.min(baseScale, (age / 120) * baseScale);
    meshRef.current.scale.setScalar(s);
    
    if (ringRef.current) {
      const pulse = 1 + Math.sin(age * 0.005) * 0.1;
      ringRef.current.scale.setScalar(s * pulse * 1.4);
    }

    // Gridshot Orbital Logic (Hard mode)
    if (mode === 'gridshot' && epicConfig.orbital) {
      const radius = 3.5;
      const speed = 0.5;
      const phase = (id % 10) * Math.PI / 5;
      const angle = (age / 1000) * speed + phase;
      
      const orbX = Math.cos(angle) * radius;
      const orbY = 2 + Math.sin(angle) * radius;
      
      meshRef.current.position.set(orbX, orbY, -19.9);
      if (ringRef.current) {
        ringRef.current.position.set(orbX, orbY, -19.85);
      }
    }

    // Speed mode movement
    if (mode === 'speed' && epicConfig.speedMult) {
      const speed = 15 * (epicConfig.speedMult || 1) * dt;
      if (epicConfig.approach === 'depth') {
        currentPos.current.z += speed;
        if (currentPos.current.z > 5) currentPos.current.z = startZ.current;
      } else if (epicConfig.approach === 'horizontal') {
        const dir = currentPos.current.x > 0 ? -1 : 1;
        currentPos.current.x += dir * speed;
      }
      meshRef.current.position.copy(currentPos.current);
      if (ringRef.current) ringRef.current.position.copy(currentPos.current);
    }
  });

  const color = isDecoy ? '#00ff88' : '#ff2d78';
  const emissiveInt = isDecoy ? 0.6 : 0.35;

  return (
    <group position={position}>
      <mesh 
        ref={(ref) => {
          meshRef.current = ref;
          if (setMeshRef) setMeshRef(id, ref);
        }} 
        geometry={_sphereGeo} 
        userData={{ isTarget: true, targetId: id, isDecoy, spawnTime }} 
        castShadow
      >
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveInt} roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0, 0.05]}>
        <ringGeometry args={[0.5, 0.65, GEO_SEGMENTS * 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ─── HitParticles (Instanced for Performance) ────────────────────────────────
const MAX_PARTICLES = 150; // max visible particles at once
const _particleGeo = new THREE.SphereGeometry(0.05, 4, 4);
const _particleMat = new THREE.MeshBasicMaterial({ color: '#ff2d78' });
const _dummy = new THREE.Object3D();

const HitParticles = () => {
  const meshRef = useRef();
  const particlesRef = useRef([]);

  useEffect(() => {
    const handle = ({ position } = {}) => {
      if (!position) return;
      const count = 6 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        if (particlesRef.current.length >= MAX_PARTICLES) {
          particlesRef.current.shift(); // remove oldest
        }
        particlesRef.current.push({
          x: position.x, y: position.y, z: position.z + 0.2,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5 + 2,
          vz: Math.random() * 3,
          born: Date.now(), s: 0.4 + Math.random() * 0.6,
        });
      }
    };
    return InputBus.on('hit-fx', handle);
  }, []);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const now = Date.now();
    let visibleCount = 0;

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      const life = 1 - (now - p.born) / 500;
      
      if (life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 6 * dt; // gravity

      _dummy.position.set(p.x, p.y, p.z);
      const currentScale = p.s * life;
      _dummy.scale.setScalar(currentScale);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(visibleCount, _dummy.matrix);
      visibleCount++;
    }

    meshRef.current.count = visibleCount;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[_particleGeo, _particleMat, MAX_PARTICLES]} />
  );
};

// ─── TargetManager ────────────────────────────────────────────────────────────
const TargetManager = () => {
  const { camera } = useThree();
  const phase        = useGameStore((s) => s.phase);
  const mode         = useGameStore((s) => s.mode);
  const difficulty   = useGameStore((s) => s.difficulty);
  const registerHit  = useGameStore((s) => s.registerHit);
  const registerMiss = useGameStore((s) => s.registerMiss);

  // Memoize epicConfig so it's stable across renders (only changes when mode/difficulty change)
  const epicConfig = useMemo(() => getModeEpicConfig(mode, difficulty), [mode, difficulty]);

  const cfg = MODE_CONFIG[mode] ?? MODE_CONFIG.gridshot;

  // Targets state: array of { id, position:[x,y,z], spawnTime, gridIdx }
  const [targets, setTargets] = useState([]);
  const targetsRef = useRef([]); // mirror for non-React access
  const meshRefs = useRef({});   // Map<id, meshRef>

  // Keep ref in sync
  useEffect(() => { targetsRef.current = targets; }, [targets]);

  const baseScale = (mode === 'speed' ? 0.75 : 1.0) * (epicConfig.targetScale || 1.0);

  // ── Spawn logic ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || cfg.limit === 0) {
      setTargets([]);
      return;
    }

    const spawnInterval = epicConfig.spawnInterval ?? Math.round(cfg.interval * (epicConfig.spawnMult || 1));

    const spawnOne = () => {
      setTargets(prev => {
        if (prev.length >= cfg.limit) return prev;
        const occupiedGridIdx = prev.map(t => t.gridIdx).filter(g => g >= 0);
        let newTarget = null;

        if (mode === 'gridshot') {
          const r = gridShotSpawn(occupiedGridIdx);
          if (r) newTarget = { id: Date.now() + Math.random(), position: r.pos.toArray(), spawnTime: Date.now(), gridIdx: r.gridIdx, isDecoy: false };
        } else if (mode === 'flick') {
          const isDecoy = epicConfig.decoys && Math.random() < 0.25;
          const p = flickSpawn(epicConfig.coneAngle || 180);
          newTarget = { id: Date.now() + Math.random(), position: p.toArray(), spawnTime: Date.now(), gridIdx: -1, isDecoy };
        } else if (mode === 'speed') {
          let pos;
          if (epicConfig.approach === 'depth') pos = speedApproachDepthSpawn();
          else {
            const result = speedApproachHorizontalSpawn();
            pos = result.pos;
          }
          newTarget = { id: Date.now() + Math.random(), position: pos.toArray(), spawnTime: Date.now(), gridIdx: -1, isDecoy: false };
        }

        if (!newTarget) return prev;
        return [...prev, newTarget];
      });
    };

    spawnOne();
    const id = setInterval(spawnOne, spawnInterval);
    return () => clearInterval(id);
  }, [phase, mode, difficulty, cfg.limit, cfg.interval, epicConfig]);

  // ── Shoot handler ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleShoot = () => {
      if (mode === 'tracking') return; // Handled locally in TrackingTarget
      
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
        const isDecoy = hit.object.userData.isDecoy;
        const reaction = Date.now() - hit.object.userData.spawnTime;
        const hitTarget = currentTargets.find(t => t.id === targetId);
        const hitPos = hitTarget ? new THREE.Vector3(...hitTarget.position) : null;

        if (isDecoy) {
          // Hit a decoy! Penalty!
          useGameStore.getState().addScore(-50);
          useGameStore.getState().setGlitchActive(true);
          soundEngine.playDecoyHit();
          setTimeout(() => useGameStore.getState().setGlitchActive(false), 1500);
          
          setTargets(prev => prev.filter(t => t.id !== targetId));
          InputBus.emit('hit-fx', { position: hitPos });
          return;
        }

        // Remove hit target and spawn replacement
        setTargets(prev => {
          const remaining = prev.filter(t => t.id !== targetId);
          if (mode === 'gridshot') {
            const occ = remaining.map(t => t.gridIdx).filter(g => g >= 0);
            const r = gridShotSpawn(occ);
            if (r) {
              return [...remaining, { id: Date.now() + Math.random(), position: r.pos.toArray(), spawnTime: Date.now(), gridIdx: r.gridIdx, isDecoy: false }];
            }
          } else if (mode === 'speed') {
            let pos;
            if (epicConfig.approach === 'depth') pos = speedApproachDepthSpawn();
            else pos = speedApproachHorizontalSpawn().pos;
            return [...remaining, { id: Date.now() + Math.random(), position: pos.toArray(), spawnTime: Date.now(), gridIdx: -1, isDecoy: false }];
          }
          return remaining;
        });

        registerHit(reaction);
        InputBus.emit('hit', { reactionMs: reaction });
        if (hitPos) InputBus.emit('hit-fx', { position: hitPos });
        if (IS_MOBILE && navigator.vibrate) navigator.vibrate(35);
        
        // Bullet time check (Flick Hard)
        if (mode === 'flick' && epicConfig.bulletTime && reaction < 350) {
          useGameStore.getState().setBulletTimeActive(true);
          soundEngine.playBulletTime();
          setTimeout(() => useGameStore.getState().setBulletTimeActive(false), 500);
          if (hitPos) setTimeout(() => InputBus.emit('hit-fx', { position: hitPos }), 100);
        }

      } else {
        registerMiss();
        InputBus.emit('miss');
      }
    };
    return InputBus.on('shoot', handleShoot);
  }, [camera, mode, difficulty, registerHit, registerMiss, epicConfig]);

  // Register/unregister mesh refs
  const setMeshRef = useCallback((id, ref) => {
    if (ref) meshRefs.current[id] = ref;
    else delete meshRefs.current[id];
  }, []);

  if (mode === 'tracking') return (<><TrackingTarget /><HitParticles /></>);

  return (
    <>
      {targets.map(t => (
        <SingleTarget 
          key={t.id} 
          id={t.id} 
          position={t.position} 
          spawnTime={t.spawnTime} 
          baseScale={baseScale} 
          mode={mode} 
          isDecoy={t.isDecoy}
          setMeshRef={setMeshRef}
          epicConfig={epicConfig}
        />
      ))}
      <HitParticles />
    </>
  );
};

// ─── TrackingTarget ──────────────────────────────────────────────────────────
const _trackGeo  = new THREE.SphereGeometry(0.5, GEO_SEGMENTS, GEO_SEGMENTS);
const _trackMesh = new THREE.Mesh(_trackGeo);
const _trackRingGeo = new THREE.RingGeometry(0.5, 0.65, GEO_SEGMENTS * 2);

const TrackingTarget = () => {
  const { camera } = useThree();
  const phase      = useGameStore((s) => s.phase);
  const difficulty = useGameStore((s) => s.difficulty);
  const mode       = useGameStore((s) => s.mode);

  // Memoize epicConfig for stability
  const epicConfig = useMemo(() => getModeEpicConfig(mode, difficulty), [mode, difficulty]);

  const meshRef    = useRef();
  const matRef     = useRef();
  const ringMeshRef= useRef();
  const ringMatRef = useRef();
  const elapsed    = useRef(0);
  const maxHp      = epicConfig.hp ?? 100;
  const hpRef      = useRef(maxHp);
  const _tempColor = useMemo(() => new THREE.Color(), []);
  
  // Last hit time for regeneration delay
  const lastHitTime = useRef(0);

  // Listen for shots from the weapon system
  useEffect(() => {
    if (phase !== 'playing') return;
    
    const onShoot = () => {
      if (!meshRef.current) return;
      _trackMesh.position.copy(meshRef.current.position);
      _trackMesh.scale.copy(meshRef.current.scale);
      _trackMesh.updateMatrixWorld(true);

      const hit = shoot(camera, [_trackMesh]);
      if (hit) {
        lastHitTime.current = Date.now();
        // Weapon config specifies damage
        const damage = 10; 
        
        useGameStore.getState().registerTrackingHit(damage);
        InputBus.emit('hit-fx', { position: hit.point });
        
        hpRef.current -= damage;
        if (hpRef.current <= 0) {
          // Kill!
          useGameStore.getState().registerTrackingKill();
          // Emit large explosion (many hit-fx)
          for(let i=0; i<3; i++) InputBus.emit('hit-fx', { position: hit.point });
          // Respawn
          elapsed.current += Math.random() * 10; // Jump to random track position
          hpRef.current = maxHp;
        }
      } else {
        useGameStore.getState().registerTrackingMiss();
      }
    };

    return InputBus.on('shoot', onShoot);
  }, [phase, camera, maxHp]);

  // HP Regeneration & Movement
  useFrame((_, delta) => {
    if (phase !== 'playing' || !meshRef.current) return;
    
    elapsed.current += delta * (epicConfig.speedMult || 1);
    
    let pos;
    if (epicConfig.movement === 'ghost') {
      pos = trackingPositionGhost(elapsed.current);
    } else if (epicConfig.movement === 'zigzag') {
      pos = trackingPositionZigzag(elapsed.current);
    } else {
      pos = trackingPositionLinear(elapsed.current);
    }
    
    meshRef.current.position.copy(pos);
    meshRef.current.scale.setScalar(epicConfig.targetScale ?? 1.0);

    const now = Date.now();
    // Regenerate HP if not hit recently (0.5s delay)
    if (now - lastHitTime.current > 500 && hpRef.current < maxHp) {
      hpRef.current = Math.min(maxHp, hpRef.current + 25 * delta); // 25 HP/sec regen
    }

    // Dynamic color based on HP percentage
    const hpPercent = hpRef.current / maxHp;
    _tempColor.setHSL(hpPercent * 0.3, 1, 0.5);
    const isHitFlash = now - lastHitTime.current < 100;

    if (matRef.current) {
      if (isHitFlash) {
        matRef.current.color.setHex(0xffffff);
        matRef.current.emissive.setHex(0xffffff);
        matRef.current.emissiveIntensity = 0.8;
      } else {
        matRef.current.color.copy(_tempColor);
        matRef.current.emissive.copy(_tempColor);
        matRef.current.emissiveIntensity = 0.4;
      }
    }
    
    if (ringMeshRef.current && ringMatRef.current) {
      ringMatRef.current.color.copy(_tempColor);
      ringMeshRef.current.scale.setScalar(1 + (1 - hpPercent) * 0.4); // Scale up as HP drops
    }
  });

  if (phase !== 'playing') return null;

  return (
    <group ref={meshRef}>
      <mesh geometry={_trackGeo} castShadow>
        <meshStandardMaterial
          ref={matRef}
          color="#00ff00"
          emissive="#00ff00"
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* HP Ring */}
      <mesh ref={ringMeshRef} geometry={_trackRingGeo} position={[0, 0, 0.05]}>
        <meshBasicMaterial ref={ringMatRef} color="#00ff00" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export default TargetManager;
