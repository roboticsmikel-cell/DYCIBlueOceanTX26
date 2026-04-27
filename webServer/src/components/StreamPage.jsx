export default function StreamPage({ onBack }) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <iframe
        // src="http://172.20.10.11:5000" // LESLIE
        src="http://192.168.1.110:5000" // AIR ROAM
        // src="http://192.168.1.168:5000/" // DYCI STARLINK
        title="AI Vision Stream"
        className="absolute inset-0 h-full w-full"
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.04)_1px,transparent_1px)] bg-[size:100%_4px]" />

      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-30 rounded-xl border border-cyan-300 bg-black/60 px-4 py-2 text-sm font-semibold text-cyan-300 shadow-lg backdrop-blur-sm transition hover:bg-black/75"
      >
        ← Back to Map
      </button>
    </div>
  );
}