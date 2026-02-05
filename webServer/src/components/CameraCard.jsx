import React from 'react'

export default function CameraCard() {
  return (
    <div className="mt-4 rounded-xl border border-cyan-300 bg-black/70 p-3 shadow-lg">
      <h3 className="mb-2 text-sm font-semibold text-cyan-300">
        Main Server Camera
      </h3>

      <div className="overflow-hidden rounded-lg border border-cyan-300">
        <img
          src="http://192.168.40.108:5000/video"
          alt="Live camera"
          className="h-48 w-full object-cover"
        />
      </div>
    </div>
  );
}
