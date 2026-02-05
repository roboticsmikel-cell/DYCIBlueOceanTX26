import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'

import { useGestureStore } from '../store/UseGestureStore'

function Model({ url }) {
  const { scene } = useGLTF(url)

  useFrame(() => {
    const { x, y, pinch } = useGestureStore.getState()

    // Rotate model when pinching
    if (pinch) {
      scene.rotation.y += 0.02
    }
  })

  return <primitive object={scene} scale={1} />
}

const Canvas3D = () => {
  return (
    <Canvas
        camera={{ position: [2, 2, 4], fov: 60 }}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 7]} intensity={1} />

        <Model url="/model.glb" />

        <OrbitControls enableDamping={false} enabled={false} />
      </Canvas>
  )
}

export default Canvas3D