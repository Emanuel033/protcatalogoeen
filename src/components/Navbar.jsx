import React from 'react';
import { useApp } from '../context/AppContext';

function Navbar() {
  // Conectado directamente al cerebro
  const { searchTerm, setSearchTerm } = useApp();

  const handleQR = () => {
    window.dispatchEvent(new Event('open-qr-scanner'));
  };

  const handleTour = () => {
    alert("Ayuda en construcción.");
  };

  const clearSearch = () => {
    setSearchTerm('');
    document.getElementById('searchInput').focus();
  };

  return (
    <nav className="bg-indigo-900 text-white sticky top-0 z-40 shadow-xl" id="main-nav">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="bg-white text-indigo-900 p-2 rounded-xl font-bold h-10 w-10 flex items-center justify-center shadow-sm">
              E
            </div>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-tight">ENVASES LA ECONOMICA DEL NORTE</h1>
              <p className="text-[10px] text-indigo-300 uppercase">Catálogo Digital</p>
            </div>
          </div>
          <div className="flex gap-2 md:hidden">
            <button onClick={handleQR} className="bg-indigo-800 p-2 rounded-full text-indigo-200">
              <i className="fa-solid fa-qrcode"></i>
            </button>
            <button onClick={handleTour} className="bg-indigo-800 p-2 rounded-full text-indigo-200">
              <i className="fa-solid fa-circle-question"></i>
            </button>
          </div>
        </div>

        <div className="w-full md:w-96 flex gap-2 relative">
          <input 
            type="text" 
            id="searchInput"
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Buscar producto..." 
            className="w-full py-2.5 pl-4 pr-10 rounded-xl bg-indigo-100/20 text-white placeholder-indigo-200 focus:bg-white focus:text-slate-800 focus:placeholder-slate-400 transition-all text-sm outline-none shadow-sm border border-transparent focus:border-indigo-300"
          />
          {searchTerm !== '' && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
