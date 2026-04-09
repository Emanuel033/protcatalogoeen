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
    <nav className="bg-slate-900 text-white sticky top-0 z-40 shadow-lg" id="main-nav">
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3.5 hover:opacity-90 transition-opacity cursor-pointer">
            {/* ✨ TU LOGO REAL AQUÍ */}
            <div className="h-11 w-11 flex items-center justify-center bg-white rounded-xl shadow-sm p-1 overflow-hidden shrink-0 border border-slate-100">
              <img 
                src="/icons/logo-192.png" 
                alt="Logo La Económica" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[14px] font-bold uppercase tracking-wide text-slate-50 leading-tight">ENVASES LA ECONOMICA DEL NORTE</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Catálogo Digital</p>
            </div>
          </div>
          <div className="flex gap-2 md:hidden">
            <button onClick={handleQR} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg text-slate-300 transition-colors">
              <i className="fa-solid fa-qrcode"></i>
            </button>
            <button onClick={handleTour} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg text-slate-300 transition-colors">
              <i className="fa-solid fa-circle-question"></i>
            </button>
          </div>
        </div>

        {/* Buscador Estilo Apple/Notion */}
        <div className="w-full md:w-[400px] flex gap-2 relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
          <input 
            type="text" 
            id="searchInput"
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Buscar por código, material o familia..." 
            className="w-full py-2.5 pl-10 pr-10 rounded-xl bg-slate-800 text-slate-100 placeholder-slate-400 focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 transition-all text-sm outline-none shadow-inner border border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
          {searchTerm !== '' && (
            <button onClick={clearSearch} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-200/20 hover:bg-slate-200 p-1 rounded-full w-5 h-5 flex items-center justify-center transition-colors">
              <i className="fa-solid fa-xmark text-[10px]"></i>
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
