/**
 * Shooter — Raycaster singleton persistente.
 * Evita instanciar new THREE.Raycaster() en cada disparo (GC pressure).
 * Se usa desde GameLogic en useFrame.
 */
import * as THREE from 'three';

const _raycaster = new THREE.Raycaster();
const _center    = new THREE.Vector2(0, 0);

/**
 * Lanza un rayo desde el centro de la cámara contra una lista de meshes.
 * @param {THREE.Camera} camera
 * @param {THREE.Object3D[]} meshes
 * @returns {THREE.Intersection | null}
 */
export function shoot(camera, meshes) {
  if (!meshes || meshes.length === 0) return null;
  _raycaster.setFromCamera(_center, camera);
  const hits = _raycaster.intersectObjects(meshes, false);
  return hits.length > 0 ? hits[0] : null;
}
