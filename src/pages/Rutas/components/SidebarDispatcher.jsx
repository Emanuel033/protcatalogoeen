import React from 'react';
import PedidoCard from './PedidoCard'; 

const SidebarDispatcher = ({ 
  pedidosFiltrados, 
  filtro, 
  setFiltro, 
  viajeSeleccionado, 
  setViajeSeleccionado,
  busqueda,
  setBusqueda,
  onOpenForm,
  onOpenAdmin,
  onOpenBitacora,
  onToggleSidebar // <-- RECIBIMOS LA FUNCIÓN DE CIERRE
}) => {
  return (
    <div className="w-full h-full bg-white flex flex-col border-r border-slate-200 shadow-xl overflow-hidden">
      
      <div className="p-4 border-b border-slate-200 shrink-0 relative z-20">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-black text-blue-900 flex items-center gap-2">
              <i className="fas fa-truck-fast"></i> Logística EEN
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              DOMINGO, 3 DE MAYO DE 2026
            </p>
          </div>
          {/* BOTÓN PARA COLAPSAR CONECTADO */}
          <button 
            onClick={onToggleSidebar}
            className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex items-center justify-center"
          >
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
        </div>

        <div className="flex gap-2 items-center mb-4">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            {/* INPUT CONECTADO AL ESTADO */}
            <input 
              type="text" 
              placeholder="Buscar cliente, folio..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium text-slate-700" 
            />
          </div>
          <button onClick={onOpenAdmin} className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition shadow-sm shrink-0"><i className="fas fa-cog"></i></button>
          <button onClick={onOpenBitacora} className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center hover:bg-indigo-100 transition shrink-0"><i className="fas fa-book"></i></button>
          <button onClick={onOpenForm} className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-sm shadow-blue-500/30 shrink-0"><i className="fas fa-plus"></i></button>
        </div>

        <div className="flex gap-1 overflow-x-auto custom-scroll pb-1">
           <button onClick={() => setFiltro('activos')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${filtro === 'activos' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>En Curso</button>
           <button onClick={() => setFiltro('pendiente')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${filtro === 'pendiente' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Por Asignar</button>
           <button onClick={() => setFiltro('rampa')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${filtro === 'rampa' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>En Rampa</button>
           <button onClick={() => setFiltro('entregado')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${filtro === 'entregado' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Entregados</button>
           <button onClick={() => setFiltro('fallido')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${filtro === 'fallido' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Fallas</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scroll">
        {pedidosFiltrados.map(pedido => (
          <PedidoCard key={pedido.id} pedido={pedido} isActive={viajeSeleccionado?.id === pedido.id} onClick={() => setViajeSeleccionado(pedido)} />
        ))}
        {pedidosFiltrados.length === 0 && (
            <div className="text-center py-6 text-slate-400 font-bold flex flex-col items-center">
                <i className="fas fa-search text-slate-200 text-3xl mb-2"></i>
                <span className="text-xs">No hay resultados.</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default SidebarDispatcher;