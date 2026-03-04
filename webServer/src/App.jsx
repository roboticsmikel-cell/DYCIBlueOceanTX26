import { useState } from 'react'
import './App.css'

import Map from './components/Map.jsx'
import Canvas3D from './components/Canvas3D'
import DataPage from './components/Data'
import StreamPage from './components/StreamPage'   // ✅ ADD THIS

function App() {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("map");

  return (
    <>
      {view === "map" && (
        <Map
          onSelect={(artifact) => {
            setSelected(artifact);
            setView("3d");
          }}
          onStream={() => setView("stream")}   // ✅ ADD THIS
        />
      )}

      {view === "3d" && selected && (
        <Canvas3D
          artifact={selected}
          onBack={() => {
            setSelected(null);
            setView("map");
          }}
          onViewData={() => setView("data")}
          onStream={() =>setView("stream")}
        />
      )}

      {view === "data" && selected && (
        <DataPage 
          artifact={selected}
          onBack={() => setView("3d")}
        />
      )}

      {view === "stream" && (
        <StreamPage onBack={() => setView("map")} />
      )}
    </>
  );
}

export default App;
