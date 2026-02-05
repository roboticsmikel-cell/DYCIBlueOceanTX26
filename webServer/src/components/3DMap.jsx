import { useEffect } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GEOJSON_URL = '/data/archaeology_nmp.geojson';

export default function Map3D() {
    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            console.error("Google Maps API key is missing.");
            return;
        }

        if (document.querySelector("#google-maps-3d")) return;

        const script = document.createElement("script");
        script.id = "google-maps-3d";
        script.src=`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=beta&libraries=maps3d`;
        script.async = true;
        document.body.appendChild(script);
    }, []);

    return (
        <div className="w-full h-125">
            <gmp-map-3d mode="hybrid" center="14.5995, 120.9842" range="2000" tilt="75" heading="330" style={{width:"100%", height:"100%"}}></gmp-map-3d>
        </div>
    );
};
