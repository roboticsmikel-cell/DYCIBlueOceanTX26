export default function StreamPage({ onBack }) {
  return (
    <div className="relative h-screen w-full bg-[#020617] overflow-hidden">

      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-30 text-sm font-semibold text-cyan-300 mt-4 rounded-xl border border-cyan-300 bg-black/70 p-3 shadow-lg"
      >
        ← Back to Map
      </button>

      <div className="absolute inset-0 p-12">

        <div className="relative h-full w-full
                        border border-cyan-500
                        rounded-3xl
                        shadow-[0_0_60px_rgba(0,255,255,0.4)]
                        overflow-hidden">

          <div className="absolute inset-0 pointer-events-none
                          bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px)]
                          bg-[size:100%_4px]
                          animate-pulse" />

          <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-cyan-400 rounded-tl-3xl" />
          <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-cyan-400 rounded-tr-3xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-cyan-400 rounded-bl-3xl" />
          <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-cyan-400 rounded-br-3xl" />

          <iframe
            src="http://172.20.10.11:5000"
            title="AI Vision Stream"
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="absolute bottom-6 right-8 text-cyan-400 text-sm tracking-widest opacity-80">
        T.U.K.L.A.S. LIVE CAMERA
      </div>
    </div>
  );
}
