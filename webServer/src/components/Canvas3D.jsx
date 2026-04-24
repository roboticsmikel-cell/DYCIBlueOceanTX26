import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

import CameraCard from "./CameraCard";
import InfoCard from "./InfoCard";
import DetectionTable from "./DetectionTable";
import SpeakingAssistantPanel from "./SpeakingAssistantPanel";

const API_URL = import.meta.env.VITE_API_URL;
const FALLBACK_IMAGE_PATH = "/images/artifact.jpg";
const FALLBACK_MODEL_PATH = "/models/artifact.glb";

// const ARTIFACT_IMAGE_MAP = {
//   "vase.glb": "/images/vase.jpg",
//   "jar.glb": "/images/jar.jpg",
//   "fuga.glb": "/images/fuga.jpg",
//   "model.glb": "/images/model.jpg",
//   "artifact.glb": "/images/artifact.jpg",
// };

const localImageUrl = useMemo(() => {
  if (!isArtifact) return null;
  return FALLBACK_IMAGE_PATH;
}, [isArtifact]);

function Model({ modelPath, scale = 1.5 }) {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} scale={scale} />;
}

function LoadingPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </mesh>
  );
}

function FallbackModel() {
  const { scene } = useGLTF(FALLBACK_MODEL_PATH);
  return <primitive object={scene} scale={1.5} />;
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

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <FallbackModel />;
    }
    return this.props.children;
  }
}

export default function Canvas3D({ artifact, onBack, onViewData, onStream }) {
  const [details, setDetails] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("image");

  const [modelUrl, setModelUrl] = useState(null);
  const [modelId, setModelId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const pollingRef = useRef(null);

  const isArtifact = artifact?.type === "artifact";
  const isDetection = artifact?.type === "detection";

  const localModelUrl = useMemo(() => {
    if (!isArtifact) return null;
    if (!artifact?.model) return null;
    return artifact.model.startsWith("/models/")
      ? artifact.model
      : `/models/${artifact.model}`;
  }, [artifact, isArtifact]);

  const localImageUrl = useMemo(() => {
    if (!isArtifact) return null;
    if (!artifact?.model) return null;

    const modelName = artifact.model.replace("/models/", "");
    return ARTIFACT_IMAGE_MAP[modelName] || null;
  }, [artifact, isArtifact]);

  useEffect(() => {
    useGLTF.preload(FALLBACK_MODEL_PATH);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    console.log("Selected artifact full:", JSON.stringify(artifact, null, 2));
  }, [artifact]);

  useEffect(() => {
    if (!artifact?.id || !isArtifact) {
      setDetails(null);
      return;
    }

    fetch(`${API_URL}/api/artifacts/${artifact.id}`)
      .then((res) => res.json())
      .then((data) => {
        setDetails(data);
      })
      .catch((err) => {
        console.error("Artifact details fetch error:", err);
      });
  }, [artifact, isArtifact]);

  useEffect(() => {
    setModelUrl(null);
    setModelId(null);
    setProgress(0);
    setIsGenerating(false);
    setError("");
    setViewMode("image");
  }, [artifact?.id, artifact?.type]);

  useEffect(() => {
    if (!artifact) {
      setActiveImage(null);
      return;
    }

    if (isArtifact) {
      setActiveImage(null);
      return;
    }

    if (!isDetection) {
      setActiveImage(null);
      return;
    }

    let intervalId;

    const fetchLatestDetectionImage = () => {
      const latLong =
        artifact.lat_long ||
        (artifact.lat != null && artifact.lng != null
          ? `${artifact.lat},${artifact.lng}`
          : null);

      if (!latLong) {
        console.error("No lat_long available for detection:", artifact);
        setActiveImage(null);
        return;
      }

      const imageUrl = `${API_URL}/api/images/latest/by-location?lat_long=${encodeURIComponent(
        latLong
      )}`;

      console.log("Fetching detection image from:", imageUrl);

      fetch(imageUrl)
        .then(async (res) => {
          console.log("latest detection image status:", res.status);
          if (!res.ok) return null;
          const data = await res.json();
          console.log("Latest detection image response:", data);
          return data;
        })
        .then((data) => {
          if (!data) {
            setActiveImage(null);
            return;
          }

          setActiveImage((prev) => {
            if (prev?.image_id === data.image_id) {
              return prev;
            }

            setModelUrl(null);
            setModelId(null);
            setProgress(0);
            setIsGenerating(false);
            setError("");
            setViewMode("image");

            return data;
          });
        })
        .catch((err) => {
          console.error("Latest detection image fetch error:", err);
          setActiveImage(null);
        });
    };

    fetchLatestDetectionImage();
    intervalId = setInterval(fetchLatestDetectionImage, 2000);

    return () => clearInterval(intervalId);
  }, [artifact, isArtifact, isDetection]);

  useEffect(() => {
    if (isArtifact) return;
    if (!activeImage?.image_id) {
      setModelUrl(null);
      return;
    }

    fetch(`${API_URL}/api/models3d/by-image/${activeImage.image_id}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("3D model by image response:", data);

        const url = data.viewer_url || data.glb_url || null;

        if (data.exists && url) {
          setModelUrl(url);
        } else {
          setModelUrl(null);
        }
      })
      .catch((err) => {
        console.error("3D model fetch error:", err);
        setModelUrl(null);
      });
  }, [activeImage, isArtifact]);

  const startPolling = (newModelId) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/models3d/check/${newModelId}`);
        const data = await res.json();

        console.log("3D polling status response:", data);

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
          setError("");

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
        console.error("3D polling error:", err);
        setError(err.message);
        setIsGenerating(false);

        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 4000);
  };

  const handleGenerate3D = async () => {
    if (isArtifact) return;

    if (!activeImage?.image_id) {
      setError("No image available.");
      return;
    }

    try {
      console.log("Generating 3D for image id:", activeImage.image_id);

      setError("");
      setIsGenerating(true);
      setProgress(0);
      setModelUrl(null);

      const res = await fetch(
        `${API_URL}/api/models3d/generate/${activeImage.image_id}`,
        { method: "POST" }
      );

      const data = await res.json();
      console.log("Generate 3D response:", data);

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setModelId(data.model_id);
      startPolling(data.model_id);
    } catch (err) {
      console.error("Generate 3D error:", err);
      setError(err.message);
      setIsGenerating(false);
    }
  };

  const displayImageSrc = isArtifact
    ? localImageUrl || FALLBACK_IMAGE_PATH
    : activeImage
    ? `${API_URL}/api/images/${activeImage.image_id}?t=${Date.now()}`
    : FALLBACK_IMAGE_PATH;

  const displayModelUrl = isArtifact
  ? localModelUrl || FALLBACK_MODEL_PATH
  : modelUrl || FALLBACK_MODEL_PATH;

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
        {isArtifact && displayModelUrl ? (
          <button
            onClick={() => setViewMode(viewMode === "3d" ? "image" : "3d")}
            className="absolute bottom-4 right-4 z-20 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300"
          >
            {viewMode === "3d" ? "View Image" : "View 3D Model"}
          </button>
        ) : isDetection && modelUrl ? (
          <button
            onClick={() => setViewMode(viewMode === "3d" ? "image" : "3d")}
            className="absolute bottom-4 right-4 z-20 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300"
          >
            {viewMode === "3d" ? "View Image" : "View 3D Model"}
          </button>
        ) : isDetection && activeImage ? (
          <button
            onClick={handleGenerate3D}
            disabled={isGenerating}
            className="absolute right-4 top-4 z-20 rounded border border-cyan-300 bg-black/70 px-3 py-1 text-cyan-300"
          >
            {isGenerating ? `Generating... ${progress}%` : "Generate 3D Model"}
          </button>
        ) : null}

        <div className="h-full w-full">
          {viewMode === "3d" && displayModelUrl ? (
            <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1.2} />

              <ModelErrorBoundary resetKey={displayModelUrl}>
                <Suspense fallback={<LoadingPlaceholder />}>
                  <Model modelPath={displayModelUrl} />
                </Suspense>
              </ModelErrorBoundary>

              <OrbitControls autoRotate autoRotateSpeed={1.2} />
            </Canvas>
          ) : displayImageSrc ? (
            <img
              src={displayImageSrc}
              alt="Artifact"
              className="h-full w-full object-contain"
              onLoad={() => console.log("Image loaded successfully")}
              onError={(e) => console.error("Image failed to load", e)}
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
          {isDetection && <DetectionTable />}
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