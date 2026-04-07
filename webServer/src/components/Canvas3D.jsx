import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

import CameraCard from "./CameraCard";
import InfoCard from "./InfoCard";
import AnalysisCard from "./AnalysisCard";
import DetectionTable from "./DetectionTable";
import SpeakingAssistantPanel from "./SpeakingAssistantPanel";

function Model({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} scale={1.5} />;
}

export default function Canvas3D({ artifact, onBack, onViewData, onStream }) {
  const [details, setDetails] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  const [modelUrl, setModelUrl] = useState(null);
  const [modelId, setModelId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const pollingRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

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
      .then((data) => {
        setActiveImage(data);
        setModelUrl(null);
        setModelId(null);
        setIsGenerating(false);
        setProgress(0);
        setError("");
      })
      .catch(console.error);
  }, [artifact]);

  useEffect(() => {
    if (!activeImage?.image_id) return;

    fetch(`http://127.0.0.1:8000/api/models3d/by-image/${activeImage.image_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.exists && data.viewer_url) {
          setModelUrl(data.viewer_url);
        } else {
          setModelUrl(null);
        }
      })
      .catch((err) => {
        console.error(err);
        setModelUrl(null);
      });
  }, [activeImage]);

  const startPolling = (newModelId) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/models3d/check/${newModelId}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to check 3D model status.");
        }

        setProgress(data.progress || 0);

        if (data.status === "SUCCEEDED" && data.glb_url) {
          setModelUrl(data.glb_url);
          setIsGenerating(false);
          clearInterval(pollingRef.current);
        }

        if (data.status === "FAILED") {
          setError(data.error || "3D model generation failed.");
          setIsGenerating(false);
          clearInterval(pollingRef.current);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Error while checking model status.");
        setIsGenerating(false);
        clearInterval(pollingRef.current);
      }
    }, 4000);
  };

  const handleGenerate3D = async () => {
    if (!activeImage?.image_id) {
      setError("No image available for 3D generation.");
      return;
    }

    try {
      setError("");
      setIsGenerating(true);
      setProgress(0);
      setModelUrl(null);

      const res = await fetch(
        `http://127.0.0.1:8000/api/models3d/generate/${activeImage.image_id}`,
        { method: "POST" }
      );

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || "Invalid server response" };
      }

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      setModelId(data.model_id);
      startPolling(data.model_id);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate 3D model.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid h-screen w-full grid-cols-1 grid-rows-4 gap-4 bg-black p-4 text-white md:grid-cols-2 md:grid-rows-2">
      {/* TOP LEFT */}
      <button
        onClick={onBack}
        className="absolute left-6 top-6 z-20 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300"
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
        {!modelUrl && activeImage && (
          <button
            onClick={handleGenerate3D}
            disabled={isGenerating}
            className="absolute right-4 top-4 z-20 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? `Generating... ${progress}%` : "Make a 3D model"}
          </button>
        )}

        <div className="h-full w-full">
          {modelUrl ? (
            <Canvas
              camera={{ position: [0, 2, 5], fov: 50 }}
              onCreated={({ gl }) => gl.setClearColor("#000000")}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 5, 5]} intensity={1} />
              <Model modelPath={modelUrl} />
              <OrbitControls />
            </Canvas>
          ) : activeImage ? (
            <img
              src={`http://127.0.0.1:8000/api/images/${activeImage.image_id}`}
              alt={activeImage.image_name || "Artifact"}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No image available
            </div>
          )}
        </div>

        {error && (
          <div className="absolute bottom-4 left-4 right-4 z-20 rounded border border-red-500 bg-black/80 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* BOTTOM LEFT */}
      <div className="flex min-h-0 flex-col gap-4 overflow-auto rounded-xl border border-cyan-500">
        <SpeakingAssistantPanel
          collectionId={artifact?.id}
          image={activeImage}
        />
      </div>

      {/* BOTTOM RIGHT */}
      <div className="relative flex min-h-0 flex-col overflow-auto rounded-xl border border-cyan-500">
        <div className="flex flex-col gap-4 p-4 pb-20">
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

        <button
          onClick={onViewData}
          className="absolute bottom-4 right-4 z-10 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300 backdrop-blur"
        >
          View Data
        </button>
      </div>
    </div>
  );
}