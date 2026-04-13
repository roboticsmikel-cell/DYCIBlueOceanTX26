import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

import CameraCard from "./CameraCard";
import InfoCard from "./InfoCard";
import AnalysisCard from "./AnalysisCard";
import DetectionTable from "./DetectionTable";
import SpeakingAssistantPanel from "./SpeakingAssistantPanel";

function Model({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} scale={1.5} />;
}

function ModelFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </mesh>
  );
}

class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("3D model render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return <ModelFallback />;
    }
    return this.props.children;
  }
}

const API_URL = import.meta.env.VITE_API_URL;

export default function Canvas3D({ artifact, onBack, onViewData, onStream }) {
  const [details, setDetails] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  const [modelUrl, setModelUrl] = useState(null);
  const [modelId, setModelId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("image");

  const pollingRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (modelUrl) {
      console.log("Model URL:", modelUrl);
    }
  }, [modelUrl]);

  useEffect(() => {
    if (!artifact?.id || artifact.type !== "artifact") return;

    fetch(`${API_URL}/api/artifacts/${artifact.id}`)
      .then((res) => res.json())
      .then(setDetails)
      .catch(console.error);
  }, [artifact]);

  useEffect(() => {
    if (!artifact?.id || artifact.type !== "artifact") return;

    fetch(`${API_URL}/api/ai-analysis/${artifact.id}`)
      .then((res) => res.json())
      .then((data) => setAnalysis(data[0] || null))
      .catch(console.error);
  }, [artifact]);

  useEffect(() => {
    if (!artifact?.id || artifact.type !== "artifact") return;

    fetch(`${API_URL}/api/images/latest/${artifact.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setActiveImage(data);
        setModelUrl(null);
        setModelId(null);
        setIsGenerating(false);
        setProgress(0);
        setError("");
        setViewMode("image");
      })
      .catch(console.error);
  }, [artifact]);

  useEffect(() => {
    if (!activeImage?.image_id) return;

    fetch(`${API_URL}/api/models3d/by-image/${activeImage.image_id}`)
      .then((res) => res.json())
      .then((data) => {
        const url = data.viewer_url || data.glb_url || null;

        if (data.exists && url) {
          setModelUrl(url);
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
        const res = await fetch(`${API_URL}/api/models3d/check/${newModelId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to check status");
        }

        setProgress(data.progress || 0);

        if (data.status === "SUCCEEDED") {
          const url = data.viewer_url || data.glb_url || null;

          if (!url) {
            throw new Error("3D model finished but no model URL was returned.");
          }

          setModelUrl(url);
          setViewMode("3d");
          setIsGenerating(false);

          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }

        if (data.status === "FAILED") {
          setError(data.error || "3D generation failed");
          setIsGenerating(false);

          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
        setIsGenerating(false);

        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 4000);
  };

  const handleGenerate3D = async () => {
    if (!activeImage?.image_id) {
      setError("No image available.");
      return;
    }

    try {
      setError("");
      setIsGenerating(true);
      setProgress(0);
      setModelUrl(null);

      const res = await fetch(
        `${API_URL}/api/models3d/generate/${activeImage.image_id}`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setModelId(data.model_id);
      startPolling(data.model_id);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid h-screen w-full grid-cols-1 grid-rows-4 gap-4 bg-black p-4 text-white md:grid-cols-2 md:grid-rows-2">
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

        <CameraCard />
      </div>

      <div className="relative min-h-0 overflow-hidden rounded-xl border border-cyan-500">
        {modelUrl ? (
          <button
            onClick={() => setViewMode(viewMode === "3d" ? "image" : "3d")}
            className="absolute bottom-4 right-4 z-20 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300"
          >
            {viewMode === "3d" ? "View Image" : "View 3D Model"}
          </button>
        ) : activeImage ? (
          <button
            onClick={handleGenerate3D}
            disabled={isGenerating}
            className="absolute right-4 top-4 z-20 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300"
          >
            {isGenerating ? `Generating... ${progress}%` : "Make a 3D model"}
          </button>
        ) : null}

        <div className="h-full w-full">
          {viewMode === "3d" && modelUrl ? (
            <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1.2} />
              <ModelErrorBoundary>
                <Suspense fallback={<ModelFallback />}>
                  <Model modelPath={modelUrl} />
                </Suspense>
              </ModelErrorBoundary>
              <OrbitControls autoRotate autoRotateSpeed={1.2} />
            </Canvas>
          ) : activeImage ? (
            <img
              src={`${API_URL}/api/images/${activeImage.image_id}`}
              alt="Artifact"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No image available
            </div>
          )}
        </div>

        {error && (
          <div className="absolute bottom-4 left-4 right-4 rounded border border-red-500 bg-black/80 px-3 py-2 text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-4 overflow-auto rounded-xl border border-cyan-500">
        <SpeakingAssistantPanel
          collectionId={artifact?.id}
          image={activeImage}
        />
      </div>

      <div className="relative flex min-h-0 flex-col overflow-auto rounded-xl border border-cyan-500">
        <div className="flex flex-col gap-4 p-4 pb-20">
          {details && <InfoCard {...details} />}
          {analysis && <AnalysisCard {...analysis} />}
          {artifact?.type === "detection" && <DetectionTable />}
        </div>

        <button
          onClick={onViewData}
          className="absolute bottom-4 right-4 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300"
        >
          View Data
        </button>
      </div>
    </div>
  );
}