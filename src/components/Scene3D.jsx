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

// Material para la pared frontal con cuadrícula visible
const _matWallFront = new THREE.MeshStandardMaterial({
  color:    new THREE.Color(0x070c18),
  roughness: 0.95,
  metalness: 0.1,
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

// Textura de cuadrícula para la pared frontal (donde aparecen los targets)
const makeWallGridTexture = () => {
  const size   = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#070c18';
  ctx.fillRect(0, 0, size, size);

  // Cuadrícula sutil pero visible
  ctx.strokeStyle = 'rgba(0,212,255,0.09)';
  ctx.lineWidth = 1;
  const step = size / 10;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0);   ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i);   ctx.lineTo(size, i); ctx.stroke();
  }

  // Cruz central más visible
  ctx.strokeStyle = 'rgba(0,212,255,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(size/2, 0);    ctx.lineTo(size/2, size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, size/2);    ctx.lineTo(size, size/2); ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
};

const Scene3D = () => {
  const gridTex = useMemo(() => makeGridTexture(), []);
  const wallGridTex = useMemo(() => makeWallGridTexture(), []);

  return (
    <>
      {/* Luz ambiente — suficiente para ver todo el escenario */}
      <ambientLight intensity={0.9} color={0x1a2540} />

      {/* Luz direccional apuntando a la pared — ilumina targets */}
      <directionalLight position={[0, 5, 0]} intensity={1.2} color={0xffffff} target-position={[0, 2, -20]} />

      {/* Luz puntual central — simula área de juego iluminada */}
      <pointLight position={[0, 5, -10]} intensity={3.0} color={0x00d4ff} distance={50} decay={1.5} />
      <pointLight position={[0, 5,  0]} intensity={1.0} color={0x0a2860} distance={30} decay={1.5} />

      {/* Luz de acento magenta desde abajo para iluminar la pared */}
      <pointLight position={[0, 0, -15]} intensity={1.0} color={0xff2d78} distance={30} decay={1.5} />

      {/* Luces laterales para iluminar los targets en la pared */}
      <pointLight position={[-10, 3, -16]} intensity={2.0} color={0x00d4ff} distance={30} decay={1.5} />
      <pointLight position={[ 10, 3, -16]} intensity={2.0} color={0x00d4ff} distance={30} decay={1.5} />

      {/* Suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -10]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial map={gridTex} color={0x080e1a} metalness={0.2} roughness={0.9} />
      </mesh>

      {/* Techo */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, -10]}>
        <planeGeometry args={[50, 50]} />
        <primitive object={_matWall} attach="material" />
      </mesh>

      {/* ─── PARED FRONTAL (donde aparecen los targets) ─── */}
      <mesh position={[0, 3, -20]}>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial map={wallGridTex} color={0x0e1525} roughness={0.95} metalness={0.1} />
      </mesh>

      {/* Borde neón de la pared frontal (marco) */}
      {/* Borde superior */}
      <mesh position={[0, 9, -19.95]}>
        <planeGeometry args={[40, 0.04]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.5} />
      </mesh>
      {/* Borde inferior */}
      <mesh position={[0, -3, -19.95]}>
        <planeGeometry args={[40, 0.04]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.3} />
      </mesh>
      {/* Borde izquierdo */}
      <mesh position={[-20, 3, -19.95]}>
        <planeGeometry args={[0.04, 12]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.4} />
      </mesh>
      {/* Borde derecho */}
      <mesh position={[20, 3, -19.95]}>
        <planeGeometry args={[0.04, 12]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.4} />
      </mesh>

      {/* Paredes laterales */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-22, 3, -10]}>
        <planeGeometry args={[50, 12]} />
        <primitive object={_matWall} attach="material" />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[22, 3, -10]}>
        <planeGeometry args={[50, 12]} />
        <primitive object={_matWall} attach="material" />
      </mesh>

      {/* Pared trasera (detrás del jugador) */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, 3, 10]}>
        <planeGeometry args={[50, 12]} />
        <primitive object={_matWall} attach="material" />
      </mesh>

      {/* ─── Líneas de neón decorativas en el suelo ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, -10]}>
        <planeGeometry args={[0.04, 40]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, -10]}>
        <planeGeometry args={[40, 0.04]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.3} />
      </mesh>

      {/* Líneas de neón a lo largo de la base de la pared frontal */}
      <mesh position={[0, -2, -19.95]}>
        <planeGeometry args={[40, 0.06]} />
        <meshBasicMaterial color={0xff2d78} transparent opacity={0.4} />
      </mesh>
    </>
  );
};

export default Scene3D;
