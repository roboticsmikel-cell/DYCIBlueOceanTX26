import React from 'react'

export default function CameraCard() {
  return (
    <div className="mt-4 rounded-xl border border-cyan-300 bg-black/70 p-3 shadow-lg">
      <h3 className="mb-2 text-sm font-semibold text-cyan-300">
        T.U.K.L.A.S. Camera
      </h3>

      <div className="overflow-hidden rounded-lg border border-cyan-300">
        {/* <img
          src="http://10.73.87.47:5000"
          alt="Live Camera"
          className="h-48 w-full object-cover"
        /> */}
        <iframe src="http://172.20.10.11:5000" className="h-48 w-full object-cover" alt="Live Camera"/>
      </div>
    </div>
  );
}
