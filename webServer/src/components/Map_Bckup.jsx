import { useEffect } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Path to your GeoJSON file (can be local or API endpoint)
const GEOJSON_URL = "/data/archaelogy_nmp.geojson";

export default function Map() {
  useEffect(() => {
    window.initMap = () => {
      const map = new window.google.maps.Map(document.getElementById("map"), {
        center: { lat: 14.5995, lng: 120.9842 }, // Manila default
        zoom: 7,
        mapTypeControl: false,
        mapTypeId: 'satellite'
      });

      // Load GeoJSON into Google Maps Data Layer
      map.data.loadGeoJson(GEOJSON_URL);

      // Optional: Style markers by collection
      map.data.setStyle(feature => {
        const collectionId = feature.getProperty("collection_id");

        let color = "#2563eb"; // Default color

        if (collectionId === "burial-jar-collection") color = "#7c3aed";
        if (collectionId === "wooden-coffins") color = "#059669";

        return {
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 1
          }
        };
      });

      // Optional: Info window on click
      const infoWindow = new window.google.maps.InfoWindow();

      map.data.addListener("click", event => {
        const props = event.feature.getProperties();

        infoWindow.setContent(`
          <div style="font-size:14px">
            <strong>${props.location_name}</strong><br/>
            <em>${props.collection_title}</em><br/>
            ${props.period || props.date_range || ""}
          </div>
        `);

        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
      });
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap`;
    script.async = true;
    script.defer = true;

    document.head.appendChild(script);

    return () => {
      delete window.initMap;
    };
  }, []);

  return <div id="map" className="h-205.75 w-full" />;
}
