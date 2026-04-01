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

function HudPanel({ title, children, className = "" }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#00e5ff]/30 bg-[#111316]/85 shadow-[0_0_30px_rgba(0,229,255,0.08)] backdrop-blur-md ${className}`}
    >
      {/* panel corners */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-[#c3f5ff]/80" />
        <div className="absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-[#c3f5ff]/80" />
        <div className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-[#c3f5ff]/80" />
        <div className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-[#c3f5ff]/80" />
      </div>

      {/* scanline */}
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(rgba(195,245,255,0.06)_1px,transparent_1px)] bg-[size:100%_4px]" />

      {/* title bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-[#c3f5ff]/10 px-5 py-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#c3f5ff]">
          {title}
        </div>
        <div className="h-2 w-2 rounded-full bg-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.8)]" />
      </div>

      <div className="relative z-10 h-[calc(100%-49px)] p-4">{children}</div>
    </div>
  );
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
    <div className="relative grid h-screen w-full grid-cols-2 grid-rows-2 gap-4 overflow-hidden bg-[#0c0f12] p-4 text-[#e2e2e6]">
      {/* global background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,229,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,179,0,0.06),transparent_24%)]" />

      {/* TOP LEFT: 3D + BACK BUTTON */}
      <HudPanel title="Artifact Projection" className="min-h-0">
        <div className="relative h-full w-full overflow-hidden rounded-xl border border-[#c3f5ff]/10 bg-black">
          <button
            onClick={onBack}
            className="absolute left-4 top-4 z-20 rounded-xl border border-[#c3f5ff]/40 bg-[#111316]/80 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-[#c3f5ff] shadow-[0_0_20px_rgba(0,229,255,0.12)] transition hover:bg-[#00e5ff]/10 hover:shadow-[0_0_24px_rgba(0,229,255,0.22)]"
          >
            ← Back to Map
          </button>

          <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex flex-col gap-1 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-[#c3f5ff]/60">
            <span>Render: Active</span>
            <span>Orbit: Enabled</span>
            <span>Model: {artifact?.model || "N/A"}</span>
          </div>

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
      </HudPanel>

      {/* TOP RIGHT: DETAILS + VIEW DATA BUTTON */}
      <HudPanel title="Metadata / Analysis" className="min-h-0">
        <div className="flex h-full flex-col justify-between gap-4 overflow-hidden">
          <div className="flex-1 space-y-4 overflow-auto pr-1">
            {details && (
              <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3 shadow-[inset_0_0_18px_rgba(0,229,255,0.03)]">
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

            {analysis && artifact?.type === "artifact" && (
              <div className="rounded-xl border border-[#ffd799]/15 bg-[#1a1c1f]/80 p-3 shadow-[inset_0_0_18px_rgba(255,179,0,0.03)]">
                <AnalysisCard
                  material={analysis.material}
                  category={analysis.category}
                  estimatedAge={analysis.estimated_age}
                  possibleLocation={analysis.possible_location}
                  preservationCondition={analysis.preservation_condition}
                />
              </div>
            )}

            {artifact?.type === "detection" && (
              <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
                <DetectionTable />
              </div>
            )}
          </div>

          <div className="border-t border-[#c3f5ff]/10 pt-4">
            <button
              onClick={onViewData}
              className="rounded-xl border border-[#c3f5ff]/40 bg-[#111316]/80 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-[#c3f5ff] shadow-[0_0_20px_rgba(0,229,255,0.12)] transition hover:bg-[#00e5ff]/10 hover:shadow-[0_0_24px_rgba(0,229,255,0.22)]"
            >
              View Data
            </button>
          </div>
        </div>
      </HudPanel>

      {/* BOTTOM LEFT: IMAGE + TEXT-TO-SPEECH */}
      <HudPanel title="Image / Voice Assistant" className="min-h-0">
        <div className="flex h-full flex-col gap-4 overflow-hidden">
          <div className="flex-1 overflow-auto rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
            <ImageCard image={activeImage} />
          </div>

          <div className="rounded-xl border border-[#ffd799]/15 bg-[#1a1c1f]/80 p-3">
            <SpeakingAssistantPanel
              collectionId={artifact?.id}
              image={activeImage}
            />
          </div>
        </div>
      </HudPanel>

      {/* BOTTOM RIGHT: CAMERA + CAMERA BUTTON */}
      <HudPanel title="Live Camera Feed" className="min-h-0">
        <div className="flex h-full flex-col justify-between gap-4 overflow-hidden">
          <div className="flex-1 overflow-auto rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
            <CameraCard />
          </div>

          <div className="border-t border-[#c3f5ff]/10 pt-4">
            <button
              onClick={onStream}
              className="rounded-xl border border-[#c3f5ff]/40 bg-[#111316]/80 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-[#c3f5ff] shadow-[0_0_20px_rgba(0,229,255,0.12)] transition hover:bg-[#00e5ff]/10 hover:shadow-[0_0_24px_rgba(0,229,255,0.22)]"
            >
              View T.U.K.L.A.S. Camera
            </button>
          </div>
        </div>
      </HudPanel>
    </div>
  );
}