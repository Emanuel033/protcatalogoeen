import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Catalogo from './pages/Catalogo/Catalogo';
import InventarioView from './pages/Inventario/InventarioView';

// Importamos la Vista de Rutas y su Provider
import RutasView from './pages/Rutas/RutasView';
import { LogisticaProvider } from './pages/Rutas/context/LogisticaContext';

// 1. Importamos el componente del Admin (Ajusta la ruta según dónde lo guardaste)
import AdminLayout from './pages/Admin/AdminLayout'; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/auditoria" element={<InventarioView />} />
        
        <Route 
          path="/rutas" 
          element={
            <LogisticaProvider>
              <RutasView />
            </LogisticaProvider>
          } 
        />

        {/* 2. Agregamos la ruta para la nueva vista de Administración */}
        <Route path="/admin" element={<AdminLayout />} />
        
      </Routes>
    </Router>
  );
}

export default App;