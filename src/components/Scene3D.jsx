import React, { useMemo } from 'react';
import * as THREE from 'three';

// Materiales pre-instanciados fuera del componente
const _matFloor = new THREE.MeshStandardMaterial({
  color:             new THREE.Color(0x080e1a),
  metalness:         0.3,
  roughness:         0.9,
});

const _matWall = new THREE.MeshStandardMaterial({
  color:    new THREE.Color(0x060b15),
  roughness: 1,
});

// Líneas de grid en el suelo via textura procedural
const makeGridTexture = () => {
  const size   = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#080e1a';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0,212,255,0.07)';
  ctx.lineWidth = 1;
  const step = size / 8;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0);   ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i);   ctx.lineTo(size, i); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
};

const Scene3D = () => {
  const gridTex = useMemo(() => makeGridTexture(), []);

  return (
    <>
      {/* Luz ambiente tenue */}
      <ambientLight intensity={0.25} color={0x0a1530} />

      {/* Luz puntual central — simula área de juego iluminada */}
      <pointLight position={[0, 6, -8]} intensity={1.8} color={0x00d4ff} distance={30} decay={2} />
      <pointLight position={[0, 6,  0]} intensity={0.6} color={0x0a1840} distance={20} decay={2} />

      {/* Luz de acento magenta desde abajo */}
      <pointLight position={[0, -3, -6]} intensity={0.4} color={0xff2d78} distance={15} decay={2} />

      {/* Suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -8]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial map={gridTex} color={0x080e1a} metalness={0.2} roughness={0.9} />
      </mesh>

      {/* Techo */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6, -8]}>
        <planeGeometry args={[40, 40]} />
        <primitive object={_matWall} attach="material" />
      </mesh>

      {/* Pared del fondo */}
      <mesh position={[0, 2, -20]}>
        <planeGeometry args={[40, 12]} />
        <primitive object={_matWall} attach="material" />
      </mesh>

      {/* Paredes laterales */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-18, 2, -8]}>
        <planeGeometry args={[40, 12]} />
        <primitive object={_matWall} attach="material" />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[18, 2, -8]}>
        <planeGeometry args={[40, 12]} />
        <primitive object={_matWall} attach="material" />
      </mesh>

      {/* Línea de neón en el suelo (decorativa) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, -8]}>
        <planeGeometry args={[0.04, 30]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, -8]}>
        <planeGeometry args={[30, 0.04]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.35} />
      </mesh>
    </>
  );
};

export default Scene3D;
