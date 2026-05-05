/**
 * MobileViewportFix — Blindaje contra resize/orientationchange bruscos.
 *
 * Problemas que resuelve:
 * 1. El evento 'resize' dispara ANTES de que el navegador termine la animación → dimensiones 0
 * 2. 'orientationchange' necesita más delay que resize normal
 * 3. En iOS Safari, scrolling muestra/oculta la barra de URL → resize constante
 * 4. Previene gestos multi-touch que causan zoom involuntario
 */

import { IS_MOBILE } from './DeviceCapabilities';

let resizeTimer = null;

/**
 * Calcula y aplica la variable CSS --vh con la altura REAL visible.
 * Esto permite usar calc(var(--vh, 1vh) * 100) en lugar de 100vh.
 */
function setVH() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

/**
 * Inicializa el blindaje de viewport. Llamar UNA vez al arranque, ANTES de montar React.
 */
export function initViewportFix() {
  if (typeof window === 'undefined') return;

  // Aplicar --vh inmediatamente
  setVH();

  // Debounce de resize — espera a que el navegador termine la animación
  const debouncedResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setVH();
      // Emitir evento custom para que GameCanvas re-aplique dimensiones
      window.dispatchEvent(new Event('resize-safe'));
    }, IS_MOBILE ? 150 : 50);
  };

  window.addEventListener('resize', debouncedResize);

  // orientationchange necesita más espera — la animación de rotación dura ~200-300ms
  window.addEventListener('orientationchange', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setVH();
      window.dispatchEvent(new Event('resize-safe'));
    }, 300);
  });

  // ── Prevenir gestos problemáticos en iOS/Android ──────────────────────────
  if (IS_MOBILE) {
    // Bloquear pinch-to-zoom
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });

    // Bloquear zoom con multi-touch
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    // Prevenir el doble-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }
}
