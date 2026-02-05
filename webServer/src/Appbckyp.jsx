import { useState } from 'react'
import './App.css'

import Map from './components/map.jsx'
// import Map3D from './components/3DMap.jsx'
// import MainHUD from './components/MainHUD.jsx'
import Canvas3D from './components/Canvas3D'


function App() {
  const [selected, setSelected] = useState(null);

  return (
    <>
      {/* <MainHUD size={800} /> */}
      <Map onSelect={setSelected}/>
      <Canvas3D/>
      {/* <Map3D location={selected}/> */}
    </>
  )
}

export default App
