import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
//import 'leaflet/dist/leaflet.css';
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx' // <--- Importamos esto


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider> {/* <--- Envolvemos App con el Provider */}
      <App />
    </AppProvider>
  </StrictMode>,
)
