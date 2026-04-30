# 🚀 Plan de Implementación: Aim Trainer 3D (FPS) - Mobile First

Este documento detalla la arquitectura, fases de desarrollo y lógica para construir el Aim Trainer 3D solicitado, utilizando **React, Vite y Three.js** (mediante `@react-three/fiber` y `@react-three/drei`).

---

## 🏗️ 1. Arquitectura y Stack Tecnológico

*   **Core:** React + Vite (Rápido empaquetado y HMR).
*   **Motor 3D:** `@react-three/fiber` (R3F) para la integración declarativa de Three.js en React.
*   **Helpers 3D:** `@react-three/drei` (Para controles, texto 3D, texturas, etc.).
*   **Físicas / Colisiones:** Raycaster nativo de Three.js gestionado vía eventos de R3F (`onClick`, `onPointerOver`).
*   **Estado Global:** Zustand (ligero, ideal para mantener sincronizado el HUD, puntuación y configuración sin re-renders innecesarios en el canvas 3D).
*   **Estilos UI:** TailwindCSS o Vanilla CSS Modules (para el HUD y menús superpuestos).

### 📂 Estructura de Directorios Propuesta
```text
src/
├── components/
│   ├── 3d/                 # Componentes de Three.js
│   │   ├── Environment.jsx # Suelo, Pared, Luces
│   │   ├── TargetManager.jsx# Lógica de spawn y ciclo de vida de Targets
│   │   ├── Target.jsx      # Objeto Target individual
│   │   ├── PlayerCamera.jsx# Cámara FPS y lógica de agacharse/ADS
│   │   └── WeaponFX.jsx    # Efectos visuales de disparo/partículas
│   ├── ui/                 # Interfaces 2D superpuestas
│   │   ├── MainMenu.jsx    # Pantalla de inicio
│   │   ├── HUD.jsx         # Puntuación, Tiempo, Precisión, Crosshair
│   │   ├── MobileControls.jsx# Botones táctiles (Disparo, ADS, Crouch)
│   │   └── LandscapeWarning.jsx # Aviso para rotar pantalla
├── store/                  
│   └── useGameStore.js     # Estado global (Zustand)
└── App.jsx                 # Contenedor principal (Gestor de Canvas y UI)
```

---

## 🗓️ 2. Fases de Desarrollo

### Fase 1: Setup del Entorno 3D y Cámara (Día 1)
**Objetivo:** Tener al jugador de pie frente a la pared vacía con estilo minimalista.
*   [ ] Configurar `Canvas` de R3F a pantalla completa.
*   [ ] Crear **Suelo** (`PlaneGeometry` rotado -90º en X) y **Pared Frontal** (`PlaneGeometry` en el eje Z negativo, ej. `z=-10`).
*   [ ] Aplicar materiales básicos tipo "entrenamiento" (cuadrículas oscuras o grises con estética neón sutil).
*   [ ] Configurar `PerspectiveCamera` a la altura típica de los ojos de un FPS (ej. `y = 1.6`).
*   [ ] Implementar sistema de "Look" (PointerLockControls de Drei adaptado para que funcione con toques en móvil deslizando la pantalla).

### Fase 2: Sistema de Objetivos (Targets) (Día 2)
**Objetivo:** Los targets aparecen dinámicamente solo en la pared frontal.
*   [ ] Crear componente `Target.jsx` (una esfera o disco plano `CircleGeometry` pegado a la pared).
*   [ ] Desarrollar `TargetManager.jsx` que controle un array de posiciones activas.
*   [ ] **Lógica de Spawn:** Generar coordenadas `x` e `y` aleatorias dentro de los límites visuales de la pared frontal (`z` constante).
*   [ ] **Ciclo de vida:** Usar `useFrame` o `setTimeout` dentro del componente Target para que se auto-destruya si no recibe disparo en 1-2 segundos.
*   [ ] **Límite:** Mantener siempre entre 5-10 targets simultáneos (usando un temporizador que intente añadir nuevos targets constantemente si hay espacio).

### Fase 3: Mecánicas de Disparo y Registro de Impactos (Día 3)
**Objetivo:** Que el jugador pueda destruir targets y sumar puntos.
*   [ ] **Raycasting FPS:** Proyectar un rayo desde el centro exacto de la cámara (`0, 0` en coordenadas normalizadas).
*   [ ] **Disparo:** Activar el raycast al hacer click (desktop) o presionar el botón virtual (móvil).
*   [ ] **Feedback de Impacto:**
    *   Si colisiona con un `Target`, eliminarlo del Store.
    *   Generar un destello (partículas limitadas) en el punto exacto de la intersección.
    *   Reproducir sonido de "Hit".
*   [ ] **Estado:** Actualizar `hits`, `misses` y calcular la precisión (Accuracy %).

### Fase 4: Controles Móviles, UI y Pantalla Completa (Día 4)
**Objetivo:** HUD completo y controles táctiles funcionales.
*   [ ] Crear componente `HUD` absoluto encima del `<Canvas>` (`pointer-events: none` salvo los botones).
*   [ ] Dibujar **Crosshair** estático en el centro de la pantalla.
*   [ ] **Botones Móviles** (visibles vía media queries):
    *   🔥 **Disparo:** Invoca la función global de raycast.
    *   🎯 **ADS (Mira):** Anima el `fov` (Field of View) de la cámara de 75 a 40 para hacer zoom.
    *   🧎 **Agacharse (Crouch):** Transición suave (ej. usando GSAP o R3F springs) de la posición `y` de la cámara (de `1.6` a `0.8`).
*   [ ] Botón de **Pantalla Completa** (API `document.documentElement.requestFullscreen()`).
*   [ ] Detector de orientación (`window.screen.orientation` o CSS media queries `orientation: portrait`) para mostrar bloqueo pidiendo giro.

### Fase 5: Modos de Juego y Estado Global (Día 5)
**Objetivo:** Lógica de partidas y menús.
*   [ ] Crear `MainMenu` con opciones de:
    *   **Speed:** Tiempo límite de 60s, sumar máxima puntuación.
    *   **Precision:** Fallar 3 veces termina el juego.
    *   **Configuración:** Slider de sensibilidad táctil/ratón.
*   [ ] Transiciones de estado: `MENU` -> `PLAYING` -> `GAME_OVER`.
*   [ ] Asegurar que al empezar el juego, el primer target aparece inmediatamente (< 0.5s).

### Fase 6: Optimización y Pulido (Día 6)
**Objetivo:** 60 FPS estables y "Game Feel" profesional.
*   [ ] **Rendimiento:**
    *   Asegurar que los componentes de la interfaz no re-rendericen el canvas 3D.
    *   Instanciar las mallas (`InstancedMesh`) o usar "Object Pooling" para los targets y partículas si hay caídas de frames.
    *   Limitar texturas a resoluciones bajas con colores vibrantes.
*   [ ] **Haptics:** Añadir `navigator.vibrate([50])` al disparar (si está en móvil).
*   [ ] Añadir post-procesado ligero (Bloom de `@react-three/postprocessing`) para dar toque "Neón/Futurista" si el dispositivo es capaz.

---

## 🧠 3. Lógica Clave (Snippets de Referencia)

### A. Restricción de Aparición en la Pared
```javascript
// La pared está en z = -15. Ancho: 20, Alto: 10
const spawnTarget = () => {
  const x = (Math.random() - 0.5) * 18; // Margen de seguridad
  const y = (Math.random() * 8) + 1; // Desde y=1 hasta y=9
  return { id: uuid(), position: [x, y, -14.9], createdAt: Date.now() };
};
```

### B. Disparo desde el centro (FPS)
En Three.js/R3F, para disparar desde el centro sin depender del ratón en móvil:
```javascript
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const useShoot = () => {
  const { camera, scene } = useThree();
  const raycaster = new THREE.Raycaster();
  
  const shoot = () => {
    // Configurar raycaster desde el centro de la cámara
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Filtrar para encontrar targets
    const hit = intersects.find(obj => obj.object.userData.isTarget);
    if (hit) {
      // Registrar hit
    } else {
      // Registrar miss
    }
  };
  return shoot;
};
```

---

## ✅ 4. Criterios de Aceptación
1.  **Landscape Only:** Mensaje de bloqueo en Portrait móvil.
2.  **Aiming Mobile:** Mover el dedo por la izquierda mueve la cámara; pulsar los botones derechos realiza las acciones.
3.  **No Targets en Suelo:** Validar estrictamente la generación `Y` y `Z`.
4.  **Optimización:** El código se ejecuta dentro de `useFrame` eficientemente, sin bucles pesados.

---
¿Deseas que comencemos implementando la **Fase 1 (Entorno y Configuración de R3F)** o prefieres ajustar alguna especificación de este plan?
