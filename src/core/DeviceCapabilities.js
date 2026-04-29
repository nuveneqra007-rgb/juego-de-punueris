/**
 * DeviceCapabilities — Singleton de capacidades del dispositivo.
 * Se evalúa UNA sola vez al cargar. Sin React, sin efectos secundarios.
 */

const UA = navigator.userAgent;

export const IS_MOBILE     = /Mobi|Android|iPhone|iPad/i.test(UA);
export const IS_LOW_END    = IS_MOBILE && navigator.hardwareConcurrency <= 4;

// pixelRatio óptimo según capacidad
export const PIXEL_RATIO = IS_LOW_END
  ? Math.min(window.devicePixelRatio, 1.0)
  : IS_MOBILE
    ? Math.min(window.devicePixelRatio, 1.5)
    : Math.min(window.devicePixelRatio, 2.0);

// FPS target según dispositivo
export const TARGET_FPS = IS_LOW_END ? 30 : IS_MOBILE ? 45 : 60;
export const FRAME_MS   = 1000 / TARGET_FPS;

// Segmentos de geometría según capacidad
export const GEO_SEGMENTS = IS_LOW_END ? 6 : IS_MOBILE ? 8 : 12;

// Límite de targets activos según capacidad
export const MAX_VISIBLE = IS_LOW_END ? 4 : IS_MOBILE ? 5 : 6;
