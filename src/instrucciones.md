🎯 Plan Específico — Lo Que Falta Para Completar Aim Champ
Auditoría realizada el 29/04/2026 sobre el código actual en c:\Users\Usuario\Desktop\aim-champ\app Cada tarea tiene archivo afectado, lógica exacta, y estado actual (✅ hecho / 🔴 falta / ⚠️ parcial).

📊 Resumen de Auditoría — Estado Actual
Área	Estado	Detalle
Suelo 3D	✅	Scene3D.jsx — plano con textura grid neón a y=-2
Pared frontal (target wall)	✅	Scene3D.jsx — pared en z=-20 con marco neón y cuadrícula
Paredes laterales + techo	✅	Scene3D.jsx — room completo cerrado
Targets SOLO en pared (no suelo)	✅	SpawnPatterns.js — todos usan WALL_Z = -19.9
Targets visibles (esferas rosa)	✅	Targets.jsx — meshes individuales MeshBasicMaterial #ff2d78
Raycasting / Disparo FPS	✅	Shooter.js + InputBus desde centro de cámara
HUD (Score, Tiempo, Precisión)	✅	HUD.jsx — barra superior con hit markers y combos
Mecánica ADS (zoom FOV)	✅	GameCanvas.jsx — interpola FOV 90 → 45 suavemente
Mecánica Crouch (agacharse)	✅	GameCanvas.jsx — interpola Y 1.6 → 0.4
Partículas de impacto	✅	Targets.jsx — HitParticles con esferas rosa
Vibración háptica móvil	✅	navigator.vibrate(35) en hit handler
Landscape-only (portrait warning)	✅	App.css — CSS overlay @media (orientation: portrait)
Modos de juego (4)	✅	Gridshot, Flick, Tracking, Speed
Botones móviles (🔥🎯🧎)	⚠️	Código existe en MobileControls.jsx, pero solo visible en touch devices
Fullscreen button	⚠️	Solo ENTRA — no tiene opción de SALIR
Crosshair	⚠️	Existe en 3D pero es microscópico/invisible
Botón SALIR al menú	🔴	No existe — jugador atrapado hasta fin del timer
🔴 TAREAS PENDIENTES — 4 Items
TAREA 1: Botón "SALIR" durante la partida
Prioridad: ALTA · Archivo: 
App.jsx

Problema: El jugador no puede volver al menú principal mientras juega. Debe esperar a que el timer llegue a 0.

Solución: Agregar un botón ✕ visible durante phase === 'playing', posicionado en la esquina superior izquierda (debajo del HUD).

Lógica exacta:

jsx
const ExitButton = () => (
  <button
    onClick={() => {
      if (document.pointerLockElement) document.exitPointerLock();
      useGameStore.setState({ phase: 'menu', isADS: false, isCrouching: false });
    }}
    style={{
      position: 'absolute', top: 56, left: 56,
      width: 36, height: 36, borderRadius: 8,
      background: 'rgba(11,15,26,0.7)',
      border: '1px solid rgba(255,68,68,0.35)',
      color: 'rgba(255,68,68,0.8)', fontSize: 16,
      cursor: 'pointer', zIndex: 100,
      touchAction: 'manipulation',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >✕</button>
);
Dónde insertarlo: En el render de App, línea ~220:

diff
{phase === 'playing' && <HUD />}
 {phase === 'playing' && <MobileControls />}
+{phase === 'playing' && <ExitButton />}
TAREA 2: Fullscreen Toggle (entrar Y salir) — Solo móvil
Prioridad: ALTA · Archivo: 
MobileControls.jsx

Problema: El botón ⛶ actual solo llama requestFullscreen(). No hay forma de salir de fullscreen.

Solución: Agregar estado isFullscreen con listener, y toggle bidireccional.

Lógica exacta:

jsx
const [isFullscreen, setIsFullscreen] = useState(false);
useEffect(() => {
  const handler = () => setIsFullscreen(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}, []);
const toggleFullscreen = useCallback(() => {
  if (document.fullscreenElement) {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  } else {
    const el = document.documentElement;
    el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
  }
}, []);
Cambio en el botón: El icono cambia según estado:

diff
-        ⛶
+        {isFullscreen ? '⛌' : '⛶'}
Handlers: Reemplazar requestFullscreen() por toggleFullscreen().

TAREA 3: Crosshair más visible
Prioridad: MEDIA · Archivos: 
HUD.jsx
 + 
Crosshair.jsx

Problema: El crosshair 3D actual (Crosshair.jsx) tiene geometrías de 0.022 unidades a 0.28 de la cámara. Resulta en ~4px en pantalla.

Solución recomendada: Reemplazar por un crosshair CSS/HTML en el HUD (siempre centrado, sin depender del render 3D).

Lógica exacta — Agregar en HUD.jsx:

jsx
{/* Crosshair CSS */}
<div style={{
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none', zIndex: 29,
}}>
  {/* Dot */}
  <div style={{
    width: 4, height: 4, borderRadius: '50%',
    background: '#00d4ff',
    boxShadow: '0 0 6px rgba(0,212,255,0.8)',
  }} />
</div>
Y en GameCanvas.jsx: Eliminar <MemoCrosshair /> del Canvas, o dejar como complemento sutil.

TAREA 4: Pared frontal más visible (opcional)
Prioridad: BAJA · Archivo: 
Scene3D.jsx

Problema: La pared es muy oscura, difícil de distinguir del fondo.

Solución:

Cambiar color de pared frontal 0x070c18 → 0x0e1525
Aumentar opacidad de la cuadrícula en makeWallGridTexture(): rgba(0,212,255,0.05) → rgba(0,212,255,0.09)
Aumentar ambientLight intensity de 0.6 → 0.9
📁 Archivos a Modificar
#	Archivo	Cambio	Tiempo
1	src/App.jsx	Agregar ExitButton componente	5 min
2	src/components/MobileControls.jsx	Toggle fullscreen bidireccional	5 min
3	src/components/HUD.jsx	Crosshair CSS centrado	5 min
3b	src/components/GameCanvas.jsx	Quitar crosshair 3D del Canvas	1 min
4	src/components/Scene3D.jsx	Subir brillo pared + ambient (opcional)	2 min
Tiempo total: ~20 minutos

✅ Lo Que NO Se Toca (ya funciona)
Archivo	Función
store/gameStore.js	ADS, Crouch, puntuación, fases
core/SpawnPatterns.js	Spawn WALL_Z=-19.9, grid, flick, tracking, speed
core/Shooter.js	Raycaster singleton
core/InputBus.js	Eventos shoot/hit/miss/hit-fx
core/ScoreEngine.js	Cálculo de puntos y penalties
core/DeviceCapabilities.js	FPS throttle, pixel ratio
input/InputContext.jsx	Mouse + teclado + touch unificado
utils/storage.js	Persistencia localStorage
App.css	Tokens, responsive, portrait warning
¿Apruebas este plan? Si sí, implemento las 4 tareas inmediatamente.

