import React, { useState, useEffect, useRef } from 'react';
import { useAdminContext } from '../context/AdminContext';

export const Topbar = () => {
  const { 
    searchTerm, setSearchTerm, 
    filterType, setFilterType, 
    showOnlyPending, setShowOnlyPending,
    setIsConfigModalOpen 
  } = useAdminContext();

  // Estados para controlar los menús por CLIC en lugar de Hover
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

  // Referencias para cerrar al hacer clic afuera
  const viewMenuRef = useRef(null);
  const toolsMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target)) setIsViewMenuOpen(false);
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target)) setIsToolsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 z-40 relative">
      
      {/* 1. BUSCADOR GLOBAL */}
      <div className="relative w-full md:w-96 shrink-0">
        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs"></i>
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar código, producto o variante..." 
          className="w-full pl-8 pr-4 py-1.5 rounded-md bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 text-sm font-medium transition-all outline-none shadow-inner"
        />
      </div>

      {/* 2. HERRAMIENTAS Y FILTROS */}
      <div className="hidden md:flex items-center gap-1.5">
        
        {/* Dropdown: Vistas y Filtros (POR CLIC) */}
        <div className="relative" ref={viewMenuRef}>
          <button 
            onClick={() => { setIsViewMenuOpen(!isViewMenuOpen); setIsToolsMenuOpen(false); }}
            className={`px-3 py-1.5 rounded-md text-sm font-bold text-slate-600 flex items-center gap-2 transition-colors ${isViewMenuOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100'}`}
          >
            <i className="fas fa-filter text-slate-400 text-xs"></i> Vista <i className={`fas fa-chevron-down text-[9px] opacity-50 transition-transform ${isViewMenuOpen ? 'rotate-180' : ''}`}></i>
          </button>
          
          {isViewMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl w-56 p-2 z-50 animate-fade-in-up">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2 pt-1">Filtrar por Tipo</p>
              
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 font-bold text-xs text-slate-700 outline-none mb-2 cursor-pointer appearance-none"
              >
                <option value="ALL">📦 Todos los artículos</option>
                <option value="PIEZA_BASE">🧊 Piezas Base (Productos)</option>
                <option value="KIT_OFICIAL">📦 Kits Oficiales (Paquetes)</option>
                <option value="KIT_FLEXIBLE">🌐 Kits Web (Paquetes Web)</option>
              </select>
              
              <div className="h-px bg-slate-100 my-1"></div>
              
              <label className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={showOnlyPending}
                  onChange={(e) => setShowOnlyPending(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">Mostrar solo Faltantes</span>
              </label>
            </div>
          )}
        </div>

        {/* Dropdown: Herramientas (POR CLIC) */}
        <div className="relative" ref={toolsMenuRef}>
          <button 
            onClick={() => { setIsToolsMenuOpen(!isToolsMenuOpen); setIsViewMenuOpen(false); }}
            className={`px-3 py-1.5 rounded-md text-sm font-bold text-slate-600 flex items-center gap-2 transition-colors ${isToolsMenuOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100'}`}
          >
            <i className="fas fa-wrench text-slate-400 text-xs"></i> Herramientas <i className={`fas fa-chevron-down text-[9px] opacity-50 transition-transform ${isToolsMenuOpen ? 'rotate-180' : ''}`}></i>
          </button>
          
          {isToolsMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl w-52 p-1.5 z-50 animate-fade-in-up">
              
              <button onClick={() => alert('Exportar Excel Faltantes (Próximamente)')} className="w-full text-left px-3 py-2 hover:bg-orange-50 hover:text-orange-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fas fa-file-excel w-4 text-center text-orange-500"></i> Exportar Faltantes
              </button>
              
              <button onClick={() => alert('Abrir Modal QR Masivo (Próximamente)')} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fas fa-qrcode w-4 text-center text-slate-400"></i> Imprimir QRs (Masivo)
              </button>
              
              <div className="h-px bg-slate-100 my-1"></div>
              
              <button onClick={() => alert('Disparar Webhook Vercel (Próximamente)')} className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fas fa-rocket w-4 text-center text-blue-500"></i> Compilar y Publicar Web
              </button>
              
              <div className="h-px bg-slate-100 my-1"></div>
              
              <button onClick={() => alert('Generar CSV Facebook (Próximamente)')} className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fab fa-facebook w-4 text-center text-blue-600"></i> Descargar CSV Meta
              </button>
              
              <button onClick={() => alert('Generar PDF Base de Conocimiento (Próximamente)')} className="w-full text-left px-3 py-2 hover:bg-green-50 hover:text-green-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fab fa-whatsapp w-4 text-center text-green-500"></i> Descargar PDF para IA
              </button>

            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-2"></div>

        {/* Botón Nuevo */}
        <button 
          onClick={() => setIsConfigModalOpen(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md font-bold text-sm transition shadow-sm flex items-center gap-2 active:scale-95"
        >
          <i className="fas fa-plus text-xs"></i> Nuevo
        </button>
        
      </div>
    </div>
  );
};