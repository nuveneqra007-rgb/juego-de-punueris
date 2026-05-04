import React, { memo } from 'react';
import { EffectComposer, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { IS_LOW_END, IS_MOBILE } from '../core/DeviceCapabilities';

/**
 * VREffects — Post-processing effects that simulate VR lens characteristics:
 * - Vignette: Darkened edges like VR headset lens falloff
 * - Chromatic Aberration: Subtle color fringing at edges (VR lens distortion)
 *
 * Auto-disabled on low-end devices for performance.
 */
const VREffects = memo(({ enabled = true }) => {
  // Skip entirely on low-end devices
  if (IS_LOW_END || !enabled) return null;

  return (
    <EffectComposer multisampling={IS_MOBILE ? 0 : 4}>
      {/* Vignette — oscurecimiento de bordes como lentes VR */}
      <Vignette
        offset={0.35}
        darkness={0.55}
        blendFunction={BlendFunction.NORMAL}
      />
      {/* Chromatic Aberration — aberración cromática sutil en bordes */}
      <ChromaticAberration
        offset={new THREE.Vector2(0.0008, 0.0008)}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={true}
        modulationOffset={0.5}
      />
    </EffectComposer>
  );
});

VREffects.displayName = 'VREffects';

export default VREffects;
