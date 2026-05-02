import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Catalogo from './pages/Catalogo/Catalogo';
import InventarioView from './pages/Inventario/InventarioView';

// 1. Importamos la Vista
import RutasView from './pages/Rutas/RutasView';
// 2. Importamos el Provider específico de ese módulo
import { LogisticaProvider } from './pages/Rutas/context/LogisticaContext';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/auditoria" element={<InventarioView />} />
        
        {/* 3. Envolvemos SOLO esta vista con su Provider y corregimos el typo */}
        <Route 
          path="/rutas" 
          element={
            <LogisticaProvider>
              <RutasView />
            </LogisticaProvider>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;