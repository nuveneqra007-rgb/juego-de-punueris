import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const Crosshair = () => {
  const { camera } = useThree();
  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      const dir = new THREE.Vector3(0, 0, -0.3).applyQuaternion(camera.quaternion);
      groupRef.current.position.copy(camera.position).add(dir);
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.005, 0.03, 0.001]} />
        <meshBasicMaterial color="white" depthTest={false} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.03, 0.005, 0.001]} />
        <meshBasicMaterial color="white" depthTest={false} />
      </mesh>
    </group>
  );
};

export default Crosshair;
