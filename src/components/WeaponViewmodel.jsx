import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { weaponSystem } from '../core/WeaponSystem';
import useGameStore from '../store/gameStore';
import { IS_MOBILE } from '../core/DeviceCapabilities';

// Materiales pre-instanciados
const _matBody = new THREE.MeshStandardMaterial({
  color: '#2a2d34',
  roughness: 0.6,
  metalness: 0.8,
});
const _matAccent = new THREE.MeshStandardMaterial({
  color: '#00d4ff',
  roughness: 0.2,
  metalness: 0.9,
  emissive: '#00d4ff',
  emissiveIntensity: 0.2,
});
const _matWood = new THREE.MeshStandardMaterial({
  color: '#5c3a21',
  roughness: 0.8,
  metalness: 0.1,
});

// Material específico para el cañón de la AK-47 (para el overheat)
const _matBarrel = new THREE.MeshStandardMaterial({
  color: '#2a2d34',
  roughness: 0.6,
  metalness: 0.8,
  emissive: '#ff0000',
  emissiveIntensity: 0,
});

// ─── AK-47 Viewmodel ─────────────────────────────────────────────────────────
const AK47Model = ({ muzzleRef }) => (
  <group>
    {/* Receiver */}
    <mesh material={_matBody} position={[0, -0.02, 0]}>
      <boxGeometry args={[0.04, 0.08, 0.3]} />
    </mesh>
    {/* Handguard (madera/acento) */}
    <mesh material={_matWood} position={[0, -0.01, -0.2]}>
      <boxGeometry args={[0.045, 0.05, 0.15]} />
    </mesh>
    {/* Cañón */}
    <mesh material={_matBarrel} position={[0, 0.01, -0.35]}>
      <cylinderGeometry args={[0.008, 0.008, 0.3]} />
    </mesh>
    {/* Gas tube */}
    <mesh material={_matBarrel} position={[0, 0.03, -0.25]}>
      <cylinderGeometry args={[0.005, 0.005, 0.15]} />
    </mesh>
    {/* Cargador curvo */}
    <group position={[0, -0.06, -0.05]} rotation={[0.2, 0, 0]}>
      <mesh material={_matBody} position={[0, -0.06, 0]}>
        <boxGeometry args={[0.03, 0.12, 0.06]} />
      </mesh>
    </group>
    {/* Grip */}
    <mesh material={_matWood} position={[0, -0.08, 0.1]} rotation={[-0.2, 0, 0]}>
      <boxGeometry args={[0.03, 0.1, 0.04]} />
    </mesh>
    {/* Mira de hierro (trasera) */}
    <mesh material={_matBody} position={[0, 0.03, 0.05]}>
      <boxGeometry args={[0.01, 0.02, 0.02]} />
    </mesh>
    {/* Mira de hierro (delantera) */}
    <mesh material={_matBody} position={[0, 0.03, -0.45]}>
      <boxGeometry args={[0.005, 0.03, 0.01]} />
    </mesh>
    {/* Punto de referencia para Muzzle Flash */}
    <group ref={muzzleRef} position={[0, 0.01, -0.52]} />
  </group>
);

// ─── Pistol Viewmodel ────────────────────────────────────────────────────────
const PistolModel = ({ muzzleRef }) => (
  <group>
    {/* Slide/Barrel */}
    <mesh material={_matBody} position={[0, 0.02, -0.1]}>
      <boxGeometry args={[0.03, 0.04, 0.2]} />
    </mesh>
    {/* Acento cyan */}
    <mesh material={_matAccent} position={[0, 0.02, -0.1]}>
      <boxGeometry args={[0.032, 0.01, 0.18]} />
    </mesh>
    {/* Grip */}
    <mesh material={_matBody} position={[0, -0.05, 0]} rotation={[-0.15, 0, 0]}>
      <boxGeometry args={[0.03, 0.1, 0.05]} />
    </mesh>
    {/* Muzzle Ref */}
    <group ref={muzzleRef} position={[0, 0.02, -0.22]} />
  </group>
);

// ─── Muzzle Flash ────────────────────────────────────────────────────────────
const _flashGeo = new THREE.PlaneGeometry(0.15, 0.15);
const _flashMat1 = new THREE.MeshBasicMaterial({ color: '#ffbb00', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
const _flashMat2 = new THREE.MeshBasicMaterial({ color: '#ffaa00', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });

const MuzzleFlash = ({ visible }) => {
  const flashRef = useRef();
  
  useFrame(() => {
    if (!flashRef.current) return;
    flashRef.current.visible = visible;
    if (visible) {
      flashRef.current.rotation.z = Math.random() * Math.PI * 2;
      const s = 0.5 + Math.random() * 0.5;
      flashRef.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={flashRef} visible={false}>
      <mesh geometry={_flashGeo} material={_flashMat1} />
      <mesh geometry={_flashGeo} material={_flashMat2} rotation={[0, Math.PI / 2, 0]} />
      {visible && !IS_MOBILE && <pointLight color="#ffcc00" intensity={2} distance={5} decay={2} />}
    </group>
  );
};

// Vectores cacheados para evitar allocations en cada frame (120fps opt)
const _akHipPos = new THREE.Vector3(0.3, -0.2, -0.5);
const _akAdsPos = new THREE.Vector3(0, -0.03, -0.4);
const _pistolHipPos = new THREE.Vector3(0.2, -0.15, -0.4);
const _pistolAdsPos = new THREE.Vector3(0, -0.02, -0.3);

// ─── Main Viewmodel Component ────────────────────────────────────────────────
const WeaponViewmodel = () => {
  const { camera } = useThree();
  const groupRef = useRef();
  const muzzleRef = useRef();
  const swayRef = useRef({ time: 0 });
  
  // Usamos un vector temporal para cálculos sin allocs
  const _targetPos = useMemo(() => new THREE.Vector3(), []);

  const isADS = useGameStore((s) => s.isADS);
  const phase = useGameStore((s) => s.phase);

  useFrame((_, delta) => {
    if (phase !== 'playing' || !groupRef.current) return;

    const weapon = weaponSystem.weapon;
    const isAK = weapon.id === 'ak47';

    // 1. Base position (Hip fire vs ADS)
    const hipPos = isAK ? _akHipPos : _pistolHipPos;
    const adsPos = isAK ? _akAdsPos : _pistolAdsPos;

    _targetPos.copy(isADS ? adsPos : hipPos);
    
    // 2. Idle Sway (Solo cuando no estamos apuntando y no estamos disparando mucho)
    swayRef.current.time += delta;
    if (!isADS) {
      _targetPos.x += Math.sin(swayRef.current.time * 1.5) * 0.005;
      _targetPos.y += Math.cos(swayRef.current.time * 3) * 0.005;
    }

    // 3. Recoil Offset (hacia atrás y rotación hacia arriba)
    const recoil = weaponSystem.recoilOffset || 0;
    _targetPos.z += recoil * 2; // Arma retrocede
    
    // Aplicar lerp a la posición final
    groupRef.current.position.lerp(_targetPos, 15 * delta);

    // 4. Rotación (Pitch up por recoil)
    const targetRotX = recoil * 0.5;
    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 20 * delta;

    // 5. Overheat visual (AK47 barrel glow)
    if (isAK) {
      const heat = weaponSystem.heat; // 0 to 1
      _matBarrel.emissiveIntensity = heat * 2.0; // Glows up to 2.0
      // Color from dark to bright red/orange
      _matBarrel.emissive.setHSL(0.05 - heat * 0.05, 1.0, 0.2 + heat * 0.3);
    }

    // 6. Posicionar con la cámara
    groupRef.current.updateMatrix();
  });

  if (phase !== 'playing') return null;

  const weaponId = weaponSystem.weapon.id;

  return (
    // Adjuntamos el group al espacio de la cámara
    <group>
      {/* 
        Para que el viewmodel esté pegado a la cámara, lo renderizamos como hijo
        en la jerarquía global pero copiamos la matriz, o lo envolvemos si la cámara 
        es accesible directamente.
        La mejor forma en R3F es usar createPortal o simplemente ponerlo dentro del HUD/Camera.
        En GameCanvas vamos a poner WeaponViewmodel dentro de un componente que ya está pegado a la cámara.
        O mejor, copiamos el transform de la cámara en cada frame.
      */}
      <group ref={groupRef}>
        {weaponId === 'ak47' && <AK47Model muzzleRef={muzzleRef} />}
        {weaponId === 'pistol' && <PistolModel muzzleRef={muzzleRef} />}
        {muzzleRef.current && (
          <group position={muzzleRef.current.position}>
            <MuzzleFlash visible={weaponSystem.muzzleFlash} />
          </group>
        )}
      </group>
    </group>
  );
};

export default WeaponViewmodel;
