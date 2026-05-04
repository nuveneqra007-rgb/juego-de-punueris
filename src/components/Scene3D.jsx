import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { IS_LOW_END, IS_MOBILE } from '../core/DeviceCapabilities';

// ─── Textura procedural: cuadrícula de perspectiva para el suelo gris ───────
const makeFloorGridTexture = () => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base gris
  ctx.fillStyle = '#6e6e6e';
  ctx.fillRect(0, 0, size, size);

  // Cuadrícula principal
  ctx.strokeStyle = 'rgba(80, 80, 80, 0.7)';
  ctx.lineWidth = 1.5;
  const step = size / 8;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  // Sub-cuadrícula fina
  ctx.strokeStyle = 'rgba(90, 90, 90, 0.35)';
  ctx.lineWidth = 0.5;
  const subStep = step / 4;
  for (let i = 0; i <= size; i += subStep) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = 4;
  return tex;
};

// ─── Textura del panel holográfico (rejilla futurista semi-transparente) ─────
const makeHoloPanelTexture = () => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Fondo transparente (se combinará con material transparent)
  ctx.clearRect(0, 0, size, size);

  // Cuadrícula holográfica cyan
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
  ctx.lineWidth = 1;
  const step = size / 12;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  // Cruz central sutil
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2); ctx.stroke();

  // Borde interior sutil
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.06)';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
};

// ─── Gradient Sky dome ──────────────────────────────────────────────────────
const makeGradientSkyTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Gradiente: más oscuro arriba → más claro en el horizonte
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#8a8e96');   // Parte superior — gris medio
  gradient.addColorStop(0.3, '#a0a4ac'); // Transición
  gradient.addColorStop(0.5, '#b8bcc5'); // Horizonte — gris claro
  gradient.addColorStop(0.7, '#c8ccd5'); // Debajo del horizonte
  gradient.addColorStop(1, '#b0b4bc');   // Suelo reflejado

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
};

// ─── Blob Shadow material (para low-end en vez de sombras reales) ───────────
const _blobShadowGeo = new THREE.CircleGeometry(0.6, 12);
const _blobShadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.15,
  depthWrite: false,
});

// ─── Animated holographic panel shimmer ─────────────────────────────────────
const HoloPanel = ({ panelTex }) => {
  const matRef = useRef();

  useFrame((state) => {
    if (!matRef.current) return;
    // Sutil pulsación de opacidad para efecto holográfico vivo
    const t = state.clock.elapsedTime;
    matRef.current.opacity = 0.18 + Math.sin(t * 0.8) * 0.03;
  });

  return (
    <mesh position={[0, 3, -20]}>
      <planeGeometry args={[40, 12]} />
      <meshStandardMaterial
        ref={matRef}
        map={panelTex}
        color={0x4a8aaa}
        transparent
        opacity={0.18}
        roughness={0.1}
        metalness={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

const Scene3D = () => {
  const floorTex = useMemo(() => makeFloorGridTexture(), []);
  const panelTex = useMemo(() => makeHoloPanelTexture(), []);
  const skyTex = useMemo(() => makeGradientSkyTexture(), []);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          CIELO GRADIENTE — dispersión atmosférica simulada
          ═══════════════════════════════════════════════════════════════════ */}
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[180, 16, 16]} />
        <meshBasicMaterial
          map={skyTex}
          side={THREE.BackSide}
          fog={false}
          depthWrite={false}
        />
      </mesh>

      {/* ═══════════════════════════════════════════════════════════════════
          ILUMINACIÓN — sistema realista con sombras condicionales
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Luz hemisférica — cielo azulado arriba, gris cálido abajo */}
      <hemisphereLight
        skyColor={0x8899bb}
        groundColor={0x666666}
        intensity={0.7}
      />

      {/* Luz direccional principal — simula sol desde arriba-derecha */}
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.8}
        color={0xfff5e6}
        castShadow={!IS_LOW_END}
        shadow-mapSize-width={IS_LOW_END ? 512 : 1024}
        shadow-mapSize-height={IS_LOW_END ? 512 : 1024}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={15}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
      />

      {/* Luz de relleno desde la izquierda */}
      <directionalLight
        position={[-8, 10, 5]}
        intensity={0.4}
        color={0xc0d0ff}
      />

      {/* Luces de acento — zona de targets con tono cyan */}
      <pointLight position={[0, 6, -14]} intensity={2.0} color={0x00d4ff} distance={30} decay={1.5} />
      <pointLight position={[-10, 4, -18]} intensity={1.5} color={0x00d4ff} distance={25} decay={1.5} />
      <pointLight position={[10, 4, -18]} intensity={1.5} color={0x00d4ff} distance={25} decay={1.5} />

      {/* Acento magenta sutil desde abajo */}
      <pointLight position={[0, -1, -16]} intensity={0.6} color={0xff2d78} distance={20} decay={1.5} />

      {/* ═══════════════════════════════════════════════════════════════════
          SUELO GRIS 3D — plano grande con cuadrícula de perspectiva
          ═══════════════════════════════════════════════════════════════════ */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2, -10]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          map={floorTex}
          color={0x808080}
          metalness={0.05}
          roughness={0.85}
        />
      </mesh>

      {/* ═══════════════════════════════════════════════════════════════════
          PANEL HOLOGRÁFICO FLOTANTE — semi-transparente con glow
          El jugador puede ver el horizonte a través del panel.
          ═══════════════════════════════════════════════════════════════════ */}
      <HoloPanel panelTex={panelTex} />

      {/* ─── Marco brillante del panel (glow borders) ─── */}
      {/* Borde superior — más brillante */}
      <mesh position={[0, 9, -19.95]}>
        <planeGeometry args={[40.2, 0.08]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.65} />
      </mesh>
      {/* Glow superior amplio */}
      <mesh position={[0, 9, -19.96]}>
        <planeGeometry args={[40.4, 0.5]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.06} depthWrite={false} />
      </mesh>

      {/* Borde inferior */}
      <mesh position={[0, -3, -19.95]}>
        <planeGeometry args={[40.2, 0.08]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.45} />
      </mesh>
      {/* Glow inferior */}
      <mesh position={[0, -3, -19.96]}>
        <planeGeometry args={[40.4, 0.4]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.04} depthWrite={false} />
      </mesh>

      {/* Borde izquierdo */}
      <mesh position={[-20, 3, -19.95]}>
        <planeGeometry args={[0.08, 12.2]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.5} />
      </mesh>
      {/* Borde derecho */}
      <mesh position={[20, 3, -19.95]}>
        <planeGeometry args={[0.08, 12.2]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.5} />
      </mesh>

      {/* ─── Esquinas iluminadas del panel ─── */}
      {[[-20, 9], [20, 9], [-20, -3], [20, -3]].map(([x, y], i) => (
        <mesh key={`corner-${i}`} position={[x, y, -19.94]}>
          <circleGeometry args={[0.25, 8]} />
          <meshBasicMaterial color={0x00d4ff} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ))}

      {/* ─── Línea de acento magenta en la base ─── */}
      <mesh position={[0, -2.5, -19.95]}>
        <planeGeometry args={[40, 0.06]} />
        <meshBasicMaterial color={0xff2d78} transparent opacity={0.45} />
      </mesh>

      {/* ═══════════════════════════════════════════════════════════════════
          ELEMENTOS DE PROFUNDIDAD — columnas y pilares de referencia
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Columnas junto al panel */}
      {[-22, 22].map((x) => (
        <group key={`col-${x}`}>
          <mesh position={[x, 1.5, -20]} castShadow={!IS_LOW_END}>
            <boxGeometry args={[0.8, 7, 0.8]} />
            <meshStandardMaterial color={0x5a5d65} metalness={0.3} roughness={0.7} />
          </mesh>
          {/* Tapa luminosa */}
          <mesh position={[x, 5.1, -20]}>
            <boxGeometry args={[0.85, 0.12, 0.85]} />
            <meshBasicMaterial color={0x00d4ff} transparent opacity={0.5} />
          </mesh>
          {/* Base */}
          <mesh position={[x, -1.9, -20]}>
            <boxGeometry args={[1.2, 0.2, 1.2]} />
            <meshStandardMaterial color={0x555555} metalness={0.4} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Columnas lejanas para perspectiva */}
      {[-40, -30, 30, 40].map((x) => (
        <mesh key={`far-col-${x}`} position={[x, 0, -35]}>
          <boxGeometry args={[0.5, 4, 0.5]} />
          <meshStandardMaterial color={0x606065} metalness={0.2} roughness={0.8} />
        </mesh>
      ))}

      {/* ─── Líneas de guía en el suelo (perspectiva) ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, -10]}>
        <planeGeometry args={[0.05, 80]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.12} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10, -1.99, -10]}>
        <planeGeometry args={[0.03, 80]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.06} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, -1.99, -10]}>
        <planeGeometry args={[0.03, 80]} />
        <meshBasicMaterial color={0x00d4ff} transparent opacity={0.06} />
      </mesh>
    </>
  );
};

// Exportar blob shadow primitives para que Targets.jsx pueda usarlos en low-end
export { _blobShadowGeo, _blobShadowMat };
export default Scene3D;
