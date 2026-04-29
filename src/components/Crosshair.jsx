import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Vectores y objetos reutilizables — cero allocations en el loop
const _dir  = new THREE.Vector3();
const _cyan = new THREE.Color(0x00d4ff);
const _white = new THREE.Color(0xffffff);

// Materiales pre-instanciados
const _matMain = new THREE.MeshBasicMaterial({ color: _white, depthTest: false });
const _matDot  = new THREE.MeshBasicMaterial({ color: _cyan,  depthTest: false });

// Geometrías pre-instanciadas
const _geoV   = new THREE.BoxGeometry(0.003, 0.022, 0.001);  // línea vertical
const _geoH   = new THREE.BoxGeometry(0.022, 0.003, 0.001);  // línea horizontal
const _geoDot = new THREE.CircleGeometry(0.002, 6);           // punto central

const Crosshair = () => {
  const { camera } = useThree();
  const groupRef   = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    _dir.set(0, 0, -0.28).applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(_dir);
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  const GAP = 0.007; // espacio entre el punto y las líneas

  return (
    <group ref={groupRef}>
      {/* Punto central */}
      <mesh geometry={_geoDot} material={_matDot} />

      {/* Arriba */}
      <mesh geometry={_geoV} material={_matMain} position={[0,  GAP + 0.011, 0]} />
      {/* Abajo */}
      <mesh geometry={_geoV} material={_matMain} position={[0, -GAP - 0.011, 0]} />
      {/* Izquierda */}
      <mesh geometry={_geoH} material={_matMain} position={[-GAP - 0.011, 0, 0]} />
      {/* Derecha */}
      <mesh geometry={_geoH} material={_matMain} position={[ GAP + 0.011, 0, 0]} />
    </group>
  );
};

export default Crosshair;
