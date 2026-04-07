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
      .then((res) => res.json())
      .then(setDetails)
      .catch(console.error);
  }, [artifact]);

  useEffect(() => {
    if (!artifact?.id || artifact.type !== "artifact") return;

    fetch(`http://127.0.0.1:8000/api/ai-analysis/${artifact.id}`)
      .then((res) => res.json())
      .then((data) => setAnalysis(data[0] || null))
      .catch(console.error);
  }, [artifact]);

  useEffect(() => {
    if (!artifact?.id || artifact.type !== "artifact") return;

    fetch(`http://127.0.0.1:8000/api/images/latest/${artifact.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setActiveImage)
      .catch(console.error);
  }, [artifact]);

  return (
    <div className="grid h-screen w-full gap-4 p-4 grid-cols-1 grid-rows-4 md:grid-cols-2 md:grid-rows-2 bg-black text-white">
      
      {/* TOP LEFT */}
      <button
          onClick={onBack}
          className="absolute top-6 left-6 z-20 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300"
      >
          ← Back to Map
      </button>
      <div className="relative min-h-0 overflow-hidden rounded-xl border border-cyan-500">
        <button
          onClick={onStream}
          className="absolute bottom-4 right-4 z-20 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300"
        >
          View T.U.K.L.A.S. Camera
        </button>

        <div className="h-full w-full">
          <CameraCard />
        </div>
      </div>

      {/* TOP RIGHT */}
      <div className="relative min-h-0 overflow-hidden rounded-xl border border-cyan-500">

        <div className="h-full w-full">
          <Canvas
            camera={{ position: [0, 2, 5], fov: 50 }}
            onCreated={({ gl }) => gl.setClearColor("#000000")}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            {artifact?.model && <Model modelPath={`/models/${artifact.model}`} />}
            <OrbitControls />
          </Canvas>
        </div>
      </div>

      {/* BOTTOM LEFT */}
      <div className="flex min-h-0 flex-col gap-4 rounded-xl border border-cyan-500 overflow-auto">
        {/* <ImageCard image={activeImage} /> */}

        <SpeakingAssistantPanel
          collectionId={artifact?.id}
          image={activeImage}
        />
      </div>

      {/* BOTTOM RIGHT */}
      <div className="flex min-h-0 flex-col justify-between rounded-xl border p-4 border-cyan-500 overflow-auto">
        <div className="flex flex-col gap-4 ">
          {details && (
            <InfoCard
              category={details.category}
              museum={details.museum}
              collectionTitle={details.collectionTitle}
              dateRange={details.dateRange}
              context={details.context}
              locationName={details.locationName}
              period={details.period}
            />
          )}

          {analysis && artifact?.type === "artifact" && (
            <AnalysisCard
              material={analysis.material}
              category={analysis.category}
              estimatedAge={analysis.estimated_age}
              possibleLocation={analysis.possible_location}
              preservationCondition={analysis.preservation_condition}
            />
          )}

          {artifact?.type === "detection" && <DetectionTable />}
        </div>

        <div className="p-4">
          <button
            onClick={onViewData}
            className="rounded border border-cyan-300 px-3 py-1 text-cyan-300"
          >
            View Data
          </button>
        </div>
      </div>
    </div>
  );
}