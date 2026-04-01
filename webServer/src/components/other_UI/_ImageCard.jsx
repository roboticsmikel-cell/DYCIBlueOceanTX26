export default function ImageCard({ image }) {
  if (!image) return null;

  const imageUrl = image?.id
    ? `http://127.0.0.1:8000/api/images/${image.id}`
    : `http://127.0.0.1:8000/api/images/14`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#00e5ff]/20 bg-[#111316]/90 p-4 text-[#e2e2e6] shadow-[0_0_24px_rgba(0,229,255,0.08)] backdrop-blur-md">
      {/* scanline */}
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(rgba(195,245,255,0.05)_1px,transparent_1px)] bg-[size:100%_4px]" />

      {/* corner accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-[#c3f5ff]/70" />
        <div className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-[#c3f5ff]/70" />
        <div className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-[#c3f5ff]/70" />
        <div className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-[#c3f5ff]/70" />
      </div>

      {/* glow lines */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-70" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-40" />

      <div className="relative z-10">
        {/* header */}
        <div className="mb-3 flex items-center justify-between border-b border-[#c3f5ff]/10 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#bac9cc]">
              Visual Capture
            </p>
            <h3 className="mt-1 text-sm font-bold uppercase tracking-[0.08em] text-[#c3f5ff]">
              Artifact Image
            </h3>
          </div>

          <div className="h-2 w-2 rounded-full bg-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.8)]" />
        </div>

        {/* image frame */}
        <div className="relative overflow-hidden rounded-xl border border-[#c3f5ff]/20 bg-black shadow-[inset_0_0_18px_rgba(0,229,255,0.06)]">
          {/* inner HUD corners */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute left-2 top-2 h-4 w-4 border-l border-t border-[#c3f5ff]/70" />
            <div className="absolute right-2 top-2 h-4 w-4 border-r border-t border-[#c3f5ff]/70" />
            <div className="absolute bottom-2 left-2 h-4 w-4 border-b border-l border-[#c3f5ff]/70" />
            <div className="absolute bottom-2 right-2 h-4 w-4 border-b border-r border-[#c3f5ff]/70" />
          </div>

          {/* scanline inside image */}
          <div className="pointer-events-none absolute inset-0 z-10 opacity-15 bg-[linear-gradient(rgba(195,245,255,0.05)_1px,transparent_1px)] bg-[size:100%_3px]" />

          <img
            src={imageUrl}
            alt="Artifact"
            className="h-48 w-full object-cover"
          />
        </div>

        {/* footer */}
        <div className="mt-3 flex items-center justify-between border-t border-[#c3f5ff]/10 pt-3">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#bac9cc]">
              Source
            </span>
            <span className="font-mono text-[10px] text-[#c3f5ff]/80">
              API Feed
            </span>
          </div>

          <div className="text-right">
            <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-[#bac9cc]">
              Status
            </span>
            <span className="font-mono text-[10px] uppercase text-[#00e5ff]">
              Loaded
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}