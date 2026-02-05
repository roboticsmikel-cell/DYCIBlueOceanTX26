import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

import { useGestureStore } from "../store/UseGestureStore";

function Model({ url }) {
  const ref = useRef(null);
  const { scene } = useGLTF(url);

  useFrame((_, delta) => {
    const { pinch } = useGestureStore.getState();

    // Always rotate slowly (idle motion)
    ref.current.rotation.y += delta * 0.3;

    // Extra rotation when pinching
    if (pinch) {
      ref.current.rotation.y += delta * 1.2;
    }
  });

  return <primitive ref={ref} object={scene} scale={1} />;
}

const Canvas3D = () => {
  return (
    <Canvas
      camera={{ position: [2, 2, 4], fov: 60 }}
      style={{ position: "absolute", inset: 0, zIndex: 1 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 7]} intensity={1.2} />

      <Model url="/model.glb" />

      {/* CAMERA ORBIT = REAL 3D FEEL */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.8}
      />
    </Canvas>
  );
};

export default Canvas3D;
