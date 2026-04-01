import { useEffect, useRef } from "react";
import CameraCard from "./CameraCard";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DARK_FUTURE_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0b1020" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8aa0c8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#020617" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#111827" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#020617" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#020617" }]
  }
];

const CLASS_COLORS = {
  burial: "#00E5FF",        // neon cyan
  pottery: "#FFB300",       // neon amber
  tool: "#00FF85",          // neon green
  inscription: "#C77DFF",  // neon violet
  default: "#FF3D81"        // neon pink
};

export default function Map({ onSelect, onStream }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    loadGoogleMaps().then(initMap).catch(console.error);
  }, []);

  function loadGoogleMaps() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      if (document.getElementById("google-maps-script")) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;

      document.head.appendChild(script);
    });
  }

  function initMap() {
    if (!mapRef.current || mapInstance.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 14.5995, lng: 120.9842 },
      zoom: 6,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      gestureHandling: "greedy",
      styles: DARK_FUTURE_MAP_STYLE
    });

    mapInstance.current = map;

    const bounds = new google.maps.LatLngBounds();
    let hasValid = false;

    fetch("http://127.0.0.1:8000/api/artifacts")
      .then(res => res.json())
      .then(artifacts => {
        if (!Array.isArray(artifacts)) return;

        artifacts.forEach(a => {
          const lat = Number(a.lat);
          const lng = Number(a.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          const position = { lat, lng };

          const color =
            CLASS_COLORS[a.class_type] || CLASS_COLORS.default;

          const marker = new google.maps.Marker({
            position,
            map,
            title: a.title,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: color,
              strokeOpacity: 0.35,
              strokeWeight: 6
            }
          });

          bounds.extend(position);
          hasValid = true;

          marker.addListener("click", () => {
            onSelect({
              id: a.id,
              title: a.title,
              model: "vase.glb",
              // model: a.model_path,
              type: "artifact"
            });
            console.log(a.model_path);
          });
        });

        if (hasValid) map.fitBounds(bounds);
      })
      .catch(err => {
        console.error("Failed to load artifacts:", err);
      });

    fetch("http://127.0.0.1:8000/api/detections")
      .then(res => res.json())
      .then(detections => {
        if (!Array.isArray(detections)) return;

        detections.forEach(d => {
          const lat = Number(d.lat);
          const lng = Number(d.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          const position = { lat, lng };

          // Neon red/pink for AI detections
          const marker = new google.maps.Marker({
            position,
            map,
            title: d.label,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,                     // slightly smaller than artifacts
              fillColor: "#f7c100ff",       
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeOpacity: 0.7,
              strokeWeight: 2
            }
          });

          bounds.extend(position);
          hasValid = true;

          marker.addListener("click", () => {
            onSelect({
              id: d.id,
              title: d.label,
              model: "jar.glb",
              // model: d.model_h,
              type: "detection"
            });
          });
        });

        if (hasValid) map.fitBounds(bounds);
      })
      .catch(err => {
        console.error("Failed to load detections:", err);
      });
  }

  return (
    <div className="h-screen w-full">
      <div ref={mapRef} className="h-full w-full" />
      {/* <div className="absolute bottom-23 left-6 z-20 pointer-events-none">
        <CameraCard />
      </div> */}
      {/* <button
        onClick={onStream}
        className="absolute bottom-9 left-6 z-30 text-sm font-semibold text-cyan-300 mt-4 rounded-xl border border-cyan-300 bg-black/70 p-3 shadow-lg">
        View T.U.K.L.A.S. Camera
      </button> */}
    </div>
  );
}
