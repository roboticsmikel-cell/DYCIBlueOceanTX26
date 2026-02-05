import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useState } from "react";

import CameraCard from "./CameraCard";
import InfoCard from "./InfoCard";
import ImageCard from "./ImageCard";
import AnalysisCard from "./AnalysisCard";
import TypingAssistantPanel from "./TypingAssistantPanel";
import SpeakingAssistantPanel from "./SpeakingAssistantPanel";

function Model() {
  const { scene } = useGLTF("/models/vase.glb");
  return <primitive object={scene} scale={1.5} />;
}

export default function Canvas3D({ artifact, onBack }) {
  const [details, setDetails] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  // ----------------------------
  // Load artifact details
  // ----------------------------
  useEffect(() => {
    if (!artifact?.id) return;

    fetch(`http://127.0.0.1:8000/api/artifacts/${artifact.id}`)
      .then(res => res.json())
      .then(setDetails)
      .catch(console.error);
  }, [artifact]);

  // ----------------------------
  // Load latest AI analysis
  // ----------------------------
  useEffect(() => {
    if (!artifact?.id) return;

    fetch(`http://127.0.0.1:8000/api/ai-analysis/${artifact.id}`)
      .then(res => res.json())
      .then(data => setAnalysis(data[0] || null))
      .catch(console.error);
  }, [artifact]);

  // ----------------------------
  // Load latest image for artifact
  // ----------------------------
  useEffect(() => {
    if (!artifact?.id) return;

    fetch(`http://127.0.0.1:8000/api/images/latest/${artifact.id}`)
      .then(res => (res.ok ? res.json() : null))
      .then(setActiveImage)
      .catch(console.error);
  }, [artifact]);

  return (
    <div className="relative h-screen w-full bg-black">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 text-cyan-300 border border-cyan-300 px-3 py-1 rounded"
      >
        ← Back to Map
      </button>

      {/* Artifact Info */}
      {/* {details && (
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
      )} */}

      {/* AI Analysis */}
      {/* {analysis && (
        <div className="absolute top-56 right-6 z-20 w-80 pointer-events-none">
          <AnalysisCard
            material={analysis.material}
            category={analysis.category}
            estimatedAge={analysis.estimated_age}
            possibleLocation={analysis.possible_location}
            preservationCondition={analysis.preservation_condition}
          />
        </div>
      )} */}

      {/* AI Assistants (share same image) */}
      {artifact && (
        <>
          <TypingAssistantPanel
            collectionId={artifact.id}
            image={activeImage}
          />
          <SpeakingAssistantPanel
            collectionId={artifact.id}
            image={activeImage}
          />
        </>
      )}

      {/* Latest Image */}
      <div className="absolute top-40 left-6 z-20 pointer-events-none">
        <ImageCard image={activeImage} />
      </div>

      {/* Camera Panel */}
      <div className="absolute bottom-5 left-6 z-20 pointer-events-none">
        <CameraCard />
      </div>

      {/* 3D Viewer */}
      <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Model />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
