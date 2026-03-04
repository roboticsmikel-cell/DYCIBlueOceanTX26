import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useState } from "react";

import CameraCard from "./CameraCard";
import InfoCard from "./InfoCard";
import ImageCard from "./ImageCard";
import AnalysisCard from "./AnalysisCard";
import DetectionTable from "./DetectionTable";
import TypingAssistantPanel from "./TypingAssistantPanel";
import SpeakingAssistantPanel from "./SpeakingAssistantPanel";

function Model({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} scale={1.5} />;
}

export default function Canvas3D({ artifact, onBack, onViewData, onStream }) {
  const [details, setDetails] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    if (!artifact?.id || artifact.type !== "artifact") return;

    fetch(`http://127.0.0.1:8000/api/artifacts/${artifact.id}`)
      .then(res => res.json())
      .then(setDetails)
      .catch(console.error);
  }, [artifact]);

  useEffect(() => {
    if (!artifact?.id || artifact.type !== "artifact") return;

    fetch(`http://127.0.0.1:8000/api/ai-analysis/${artifact.id}`)
      .then(res => res.json())
      .then(data => setAnalysis(data[0] || null))
      .catch(console.error);
  }, [artifact]);

  useEffect(() => {
    if (!artifact?.id || artifact.type !== "artifact") return;

    fetch(`http://127.0.0.1:8000/api/images/latest/${artifact.id}`)
      .then(res => (res.ok ? res.json() : null))
      .then(setActiveImage)
      .catch(console.error);
  }, [artifact]);

  return (
    <div className="relative h-screen w-full bg-black">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 text-cyan-300 border border-cyan-300 px-3 py-1 rounded"
      >
        ← Back to Map
      </button>

      <button
        onClick={onViewData}
        className="absolute top-70 right-10 z-20 text-cyan-300 border border-cyan-300 px-3 py-1 rounded hover:bg-cyan-300"
      >
        View Data
      </button>

      {details && (
        <div className="absolute top-6 right-6 z-20 w-80 pointer-events-none">
          <InfoCard
            category={details.category}
            museum={details.museum}
            collectionTitle={details.collectionTitle}
            dateRange={details.dateRange}
            context={details.context}
            locationName={details.locationName}
            period={details.period}
          />
        </div>
      )}

      {/* {artifact?.type === "artifact" && analysis && (
        <div className="absolute top-5 right-6 z-20 w-80 pointer-events-none">
          <AnalysisCard
            material={analysis.material}
            category={analysis.category}
            estimatedAge={analysis.estimated_age}
            possibleLocation={analysis.possible_location}
            preservationCondition={analysis.preservation_condition}
          />
        </div>
      )} */}

      {artifact?.type === "detection" && (
        <div className="absolute top-5 right-6 z-20 w-80">
          <DetectionTable />
        </div>
      )}

      {artifact && (
        <>
          {/* <TypingAssistantPanel
            collectionId={artifact.id}
            image={activeImage}
          /> */}
          <SpeakingAssistantPanel
            collectionId={artifact.id}
            image={activeImage}
          />
        </>
      )}

      <div className="absolute top-20 left-6 z-20 pointer-events-none">
        <ImageCard image={activeImage} />
      </div>

      <div className="absolute bottom-20 left-6 z-20 pointer-events-none">
        <CameraCard />
      </div>

      <button
        onClick={onStream}
        className="absolute bottom-5 left-6 z-30 text-sm font-semibold text-cyan-300 mt-4 rounded-xl border border-cyan-300 bg-black/70 p-3 shadow-lg">
        View T.U.K.L.A.S. Camera
      </button>

      <Canvas 
        camera={{ position: [0, 2, 5], fov: 50 }}
        gl={{ preserveDrawingBuffer: false }}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000");
        }}
      >
        <ambientLight intensity={0.5} />  
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Model modelPath={`/models/${artifact.model}`} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
