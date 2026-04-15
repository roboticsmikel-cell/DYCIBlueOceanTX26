import React from "react";

export default function CameraCard() {
  return (
    // <div className="flex h-full flex-col rounded-xl border border-cyan-300 bg-black/70 p-3 shadow-lg">
    <div className="flex h-full flex-col rounded-xl bg-black/70 shadow-lg">
      
      {/* <h3 className="mb-2 text-sm font-semibold text-cyan-300">
        T.U.K.L.A.S. Camera
      </h3> */}

      <div className="aspect-video w-full overflow-hidden rounded-lg border border-cyan-300">
      {/* <div className="aspect-video w-full overflow-hidden"> */}
        {/* <img 
          src="http://10.73.87.47:5000" 
          alt="Live Camera" 
          className="h-48 w-full object-cover"
        /> */}
        <iframe
          src="http://172.20.10.11:5000/website" // LESLIE
          // src="http://192.168.1.168:5000/website" // DYCI STARLINK
          // src="" // FOR AIR-ROAM
          title="Live Camera"
          className="h-full w-full object-cover"
        />
      </div>

    </div>
  );
}