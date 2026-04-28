import React from 'react';

const Scene3D = () => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      {/* Suelo opcional */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </>
  );
};

export default Scene3D;
