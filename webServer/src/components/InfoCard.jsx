import React from 'react'

const InfoCard = ({
  locationName = "Unknown Location",
  collectionTitle = "Untitled Artifact",
  period = "Unknown Period",
  dateRange = "",
  category = "Uncategorized",
  museum = "Unknown Museum",
  context = "No description available."
}) => {
    
    return (
        <div className="relative max-w-sm rounded-xl border border-cyan-400/40 bg-[#020a13]/90 px-4 py-3 shadow-[0_0_25px_rgba(0,229,255,0.15)] backdrop-blur-md">
            <div className="absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-cyan-400 to-transparent" />
            <div className="absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent via-cyan-400 to-transparent" />
            {/* <div className="mb-1 flex items-center justify-between"> */}
            <div className="mb-2">
                <p className="text-[11px] tracking-widest text-cyan-300/80 uppercase">{category}</p>
                <p className="text-[11px] tracking-widest text-cyan-300/80 uppercase">{museum}</p>
            </div>
            <p className="font-semibold text-sm text-cyan-100 leading-tight">{collectionTitle}</p>
            <p className="text-[11px] text-cyan-300/60 uppercase">{dateRange}</p>
            {/* <div className="mb-2 mt-2 p-2 rounded bg-cyan-400/5 text-[11px] text-cyan-200/80"> */}
            <div className="mb-2 mt-2">
                {/* <p className="text-[11px] text-cyan-300/60">{context}</p> */}
                <p className="text-[11px] text-white">{context}</p>
            </div>
            <div className="mt-1 h-px w-full bg-cyan-400/20" />
            <p className="mt-1 text-xs font-medium text-cyan-200/80">{locationName}</p>
            <p className="text-[11px] text-cyan-300/60">{period}</p>
        </div>
    )
}

export default InfoCard
