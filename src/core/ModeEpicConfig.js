/**
 * Configuración épica por modo y dificultad.
 */
export const MODE_EPIC = {
  gridshot: {
    easy:   { orbital: false },
    normal: { orbital: false },
    hard:   { orbital: true }, // Targets orbitan entre ellos
  },
  tracking: {
    easy:   { hp: 50,  movement: 'linear',  speed: 0.3, recoilMult: 0.5, overheat: false },
    normal: { hp: 100, movement: 'zigzag',  speed: 0.6, recoilMult: 1.5, overheat: false },
    hard:   { hp: 200, movement: 'ghost',   speed: 0.8, recoilMult: 1.0, overheat: true }, // Calentamiento de la AK-47
  },
  flick: {
    easy:   { coneAngle: 90,  decoys: false, bulletTime: false, timeScale: 1.0 },
    normal: { coneAngle: 150, decoys: true,  bulletTime: false, timeScale: 1.0 }, // Señuelos que dan glitch
    hard:   { coneAngle: 180, decoys: false, bulletTime: true,  timeScale: 1.2 }, // Cámara lenta + distracción de partículas
  },
  speed: {
    easy:   { approach: 'depth',      speedMult: 0.5, fovOverride: 85, tunnelVision: false, noRecoil: false },
    normal: { approach: 'horizontal', speedMult: 1.0, fovOverride: 85, tunnelVision: false, noRecoil: false },
    hard:   { approach: 'horizontal', speedMult: 1.8, fovOverride: 90, tunnelVision: true,  noRecoil: true, maxFov: 120, minFov: 70 }, // Warp Speed FOV dinámico
  },
};
