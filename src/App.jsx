import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Catalogo from './pages/Catalogo/Catalogo';
import InventarioView from './pages/Inventario/InventarioView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/auditoria" element={<InventarioView />} />
      </Routes>
    </Router>
  );
}

export default App;