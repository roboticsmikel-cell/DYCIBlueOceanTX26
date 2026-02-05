import React from 'react'

const AnalysisCard = ({
  material = "Unknown Material",
  category = "Uncategorized",
  estimatedAge = "Unknown Age",
  possibleLocation = "Unknown Location",
  preservationCondition = "Unknown Condition",
}) => {
  return (
    <div className="relative max-w-sm rounded-xl border border-cyan-400/40 bg-[#020a13]/90 px-4 py-3 shadow-[0_0_25px_rgba(0,229,255,0.15)] backdrop-blur-md">
      <div className="absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-cyan-400 to-transparent" />
      <div className="absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent via-cyan-400 to-transparent" />

      <div className="mb-2">
        <p className="text-[11px] tracking-widest text-cyan-300/80 uppercase">{material}</p>
        <p className="text-[11px] tracking-widest text-cyan-300/80 uppercase">{category}</p>
      </div>

      <p className="text-[11px] text-cyan-300/60 uppercase">{estimatedAge}</p>

      <div className="mt-1 h-px w-full bg-cyan-400/20" />
      <p className="mt-1 text-xs font-medium text-cyan-200/80">{possibleLocation}</p>
      <p className="text-[11px] text-cyan-300/60">{preservationCondition}</p>

    </div>
  )
}

export default AnalysisCard