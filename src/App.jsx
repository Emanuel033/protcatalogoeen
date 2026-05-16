import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Catalogo from './pages/Catalogo/Catalogo';
import InventarioView from './pages/Inventario/InventarioView';

// Importamos la Vista de Rutas y su Provider
import RutasView from './pages/Rutas/RutasView';
import { LogisticaProvider } from './pages/Rutas/context/LogisticaContext';

// Corrección: Importamos ChoferView con su nombre correcto
import AppOperador from './pages/Chofer/AppOperador';

import CentroComando from './pages/Admin/CentroComando';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/inventario" element={<InventarioView />} />
        
        <Route 
          path="/rutas" 
          element={
            <LogisticaProvider>
              <RutasView />
            </LogisticaProvider>
          } 
        />

       {/* La nueva ruta del Admin */}
    <Route path="/admin" element={<CentroComando />} />
        
        {/* Agregamos la ruta para el Chofer */}
        <Route path="/chofer" element={<AppOperador />} />
        
      </Routes>
    </Router>
  );
}

export default App;
