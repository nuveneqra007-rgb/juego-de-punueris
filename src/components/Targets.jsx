import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../store/gameStore';

const Targets = () => {
  const { camera } = useThree();
  const { phase, registerShot, addScore } = useGameStore();
  const [targets, setTargets] = useState([]);
  const meshRefs = useRef(new Map());

  // Generar blancos periódicamente
  useEffect(() => {
    if (phase !== 'playing') {
      setTargets([]);
      meshRefs.current.clear();
      return;
    }
    const interval = setInterval(() => {
      setTargets(prev => {
        const newTarget = {
          id: Date.now() + Math.random(),
          position: [
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 5,
            -5 - Math.random() * 10
          ]
        };
        const next = [...prev, newTarget];
        // Mantener máximo 6 blancos activos
        if (next.length > 6) {
          const removed = next.slice(0, next.length - 6);
          removed.forEach(t => meshRefs.current.delete(t.id));
          return next.slice(-6);
        }
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [phase]);

  // Escuchar disparos
  useEffect(() => {
    const handleShoot = () => {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      const meshes = [];
      meshRefs.current.forEach((ref) => {
        if (ref) meshes.push(ref);
      });

      if (meshes.length === 0) {
        registerShot(false);
        return;
      }

      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        const targetId = hitObj.userData.id;
        setTargets(prev => prev.filter(t => t.id !== targetId));
        meshRefs.current.delete(targetId);
        registerShot(true);
        addScore(100);
      } else {
        registerShot(false);
      }
    };
    window.addEventListener('player-shoot', handleShoot);
    return () => window.removeEventListener('player-shoot', handleShoot);
  }, [camera, registerShot, addScore]);

  const registerMesh = useCallback((id, ref) => {
    if (ref) meshRefs.current.set(id, ref);
  }, []);

  const unregisterMesh = useCallback((id) => {
    meshRefs.current.delete(id);
  }, []);

  return (
    <>
      {targets.map(t => (
        <Target
          key={t.id}
          id={t.id}
          position={t.position}
          registerMesh={registerMesh}
          unregisterMesh={unregisterMesh}
        />
      ))}
    </>
  );
};

const Target = ({ id, position, registerMesh, unregisterMesh }) => {
  const meshRef = useRef();
  const [scale, setScale] = useState(0.1);

  useEffect(() => {
    // Animar aparición
    const timer = setTimeout(() => setScale(1), 50);
    return () => {
      clearTimeout(timer);
      unregisterMesh(id);
    };
  }, [id, unregisterMesh]);

  const setRef = useCallback((node) => {
    meshRef.current = node;
    registerMesh(id, node);
  }, [id, registerMesh]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
    }
  });

  return (
    <mesh ref={setRef} position={position} userData={{ id }} scale={scale}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
    </mesh>
  );
};

export default Targets;
