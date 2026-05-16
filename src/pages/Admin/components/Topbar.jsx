import React from 'react';
import { useAdminContext } from '../context/AdminContext';
import { useAdminData } from '../hooks/useAdminData';

export const Topbar = () => {
  // Traemos los estados y funciones del cerebro (Contexto)
  const { 
    setSearchTerm, 
    filterType, 
    setFilterType, 
    showOnlyPending, 
    setShowOnlyPending 
  } = useAdminContext();
  
  // Traemos el rol para ocultar botones si es necesario
  const { userRole } = useAdminData();
  const isAdmin = userRole === 'admin';

  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 z-40 relative">
      
      {/* 1. BARRA DE BÚSQUEDA */}
      <div className="relative w-full md:w-96 shrink-0">
        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs"></i>
        <input 
          type="text" 
          placeholder="Buscar código, producto o categoría..." 
          onChange={(e) => setSearchTerm(e.target.value)} // Reemplaza debouncedSearch
          className="w-full pl-8 pr-4 py-1.5 rounded-md bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 text-sm font-medium transition-all outline-none shadow-inner"
        />
      </div>

      {/* CONTROLES DERECHOS (Ocultos en móvil nativamente por tus clases) */}
      <div className="hidden md:flex items-center gap-1.5">
        
        {/* 2. FILTROS (VISTA) */}
        <div className="relative group">
          <button className="px-3 py-1.5 hover:bg-slate-100 rounded-md text-sm font-bold text-slate-600 flex items-center gap-2 transition-colors">
            <i className="fas fa-filter text-slate-400 text-xs"></i> Vista <i className="fas fa-chevron-down text-[9px] opacity-50"></i>
          </button>
          
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 shadow-xl rounded-xl w-56 p-2 z-50 transform origin-top-right transition-all">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2 pt-1">Filtrar por Tipo</p>
            
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)} 
              className="w-full bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 font-bold text-xs text-slate-700 outline-none mb-2 cursor-pointer appearance-none"
            >
              <option value="ALL">📦 Todos los artículos</option>
              <option value="PIEZA_BASE">Cube Piezas Base</option>
              <option value="KIT_FLEXIBLE">Árbol Web (Kits)</option>
              <option value="KIT_OFICIAL">Cajas Oficiales</option>
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
        </div>

        {/* 3. HERRAMIENTAS (Solo Admin puede ver estas acciones peligrosas) */}
        {isAdmin && (
          <div className="relative group">
            <button className="px-3 py-1.5 hover:bg-slate-100 rounded-md text-sm font-bold text-slate-600 flex items-center gap-2 transition-colors">
              <i className="fas fa-wrench text-slate-400 text-xs"></i> Herramientas <i className="fas fa-chevron-down text-[9px] opacity-50"></i>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 shadow-xl rounded-xl w-52 p-1.5 z-50 transform origin-top-right transition-all">
              
              {/* Funciones pendientes a migrar */}
              <button onClick={() => alert('Exportar excel en construcción')} className="w-full text-left px-3 py-2 hover:bg-orange-50 hover:text-orange-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fas fa-file-excel w-4 text-center text-orange-500"></i> Exportar Faltantes
              </button>
              
              <button onClick={() => alert('Modales QR masivo en construcción')} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fas fa-qrcode w-4 text-center text-slate-400"></i> Imprimir QRs (Masivo)
              </button>
              
              <div className="h-px bg-slate-100 my-1"></div>
              
              <button onClick={() => alert('Deploy Github en construcción')} className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fas fa-rocket w-4 text-center text-blue-500"></i> Compilar y Publicar Web
              </button>
              
              <div className="h-px bg-slate-100 my-1"></div>
              
              <button onClick={() => alert('CSV Meta en construcción')} className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fab fa-facebook w-4 text-center text-blue-600"></i> Descargar CSV Meta
              </button>
              
              <button onClick={() => alert('PDF WhatsApp en construcción')} className="w-full text-left px-3 py-2 hover:bg-green-50 hover:text-green-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fab fa-whatsapp w-4 text-center text-green-500"></i> Descargar PDF para IA
              </button>
            </div>
          </div>
        )}

        <div className="w-px h-5 bg-slate-200 mx-2"></div>

        {/* 4. BOTÓN NUEVO PRODUCTO */}
        {isAdmin && (
          <button 
            onClick={() => alert('Abrir Modal en construcción')} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md font-bold text-sm transition shadow-sm flex items-center gap-2 active:scale-95"
          >
            <i className="fas fa-plus text-xs"></i> Nuevo
          </button>
        )}
        
      </div>
    </div>
  );
};