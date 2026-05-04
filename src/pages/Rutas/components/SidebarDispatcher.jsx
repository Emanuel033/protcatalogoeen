import React, { useMemo } from 'react';
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
  onToggleSidebar 
}) => {

  const contenidoSidebar = useMemo(() => {
    if (pedidosFiltrados.length === 0) return [];

    if (filtro === 'pendiente' || filtro === 'activos') {
      const grupos = {};
      pedidosFiltrados.forEach(p => {
        const key = p.direccion || `sin_direccion_${p.id}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(p);
      });

      return Object.values(grupos).map((grupo, index) => {
        if (grupo.length > 1) {
          return (
            <div key={`grupo-${index}`} className="border-[1.5px] border-dashed border-indigo-400 bg-indigo-50/20 rounded-2xl p-2 pb-2 mb-3 pt-8 relative shadow-sm">
              <div className="absolute top-2 left-3 text-[9px] font-black text-indigo-700 flex items-center gap-1.5 uppercase tracking-wide">
                <i className="fas fa-map-marker-alt"></i> {grupo.length} pedidos al mismo destino
              </div>
              <div className="space-y-2">
                {grupo.map(pedido => (
                  <PedidoCard key={pedido.id} pedido={pedido} isActive={viajeSeleccionado?.id === pedido.id} onClick={() => setViajeSeleccionado(pedido)} />
                ))}
              </div>
            </div>
          );
        } else {
          const pedido = grupo[0];
          return (
            <div key={pedido.id} className="mb-3">
              <PedidoCard pedido={pedido} isActive={viajeSeleccionado?.id === pedido.id} onClick={() => setViajeSeleccionado(pedido)} />
            </div>
          );
        }
      });
    }

    return pedidosFiltrados.map(pedido => (
      <div key={pedido.id} className="mb-3">
        <PedidoCard pedido={pedido} isActive={viajeSeleccionado?.id === pedido.id} onClick={() => setViajeSeleccionado(pedido)} />
      </div>
    ));
  }, [pedidosFiltrados, filtro, viajeSeleccionado, setViajeSeleccionado]);


  return (
    <div className="w-full h-full bg-white/85 backdrop-blur-xl flex flex-col border-r border-white/50 shadow-2xl overflow-hidden">
      
      <div className="p-4 border-b border-slate-200/50 shrink-0 relative z-20 bg-white/40">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-black text-blue-900 flex items-center gap-2">
              <i className="fas fa-truck-fast"></i> Logística EEN
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              DOMINGO, 3 DE MAYO DE 2026
            </p>
          </div>
          <button onClick={onToggleSidebar} className="w-8 h-8 rounded-full bg-white/60 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white shadow-sm transition flex items-center justify-center">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
        </div>

        <div className="flex gap-2 items-center mb-4">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input type="text" placeholder="Buscar cliente, folio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-white/70 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium text-slate-700 shadow-sm" />
          </div>
          <button onClick={onOpenAdmin} className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition shadow-md shrink-0"><i className="fas fa-cog"></i></button>
          <button onClick={onOpenBitacora} className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center hover:bg-indigo-100 transition shadow-sm shrink-0"><i className="fas fa-book"></i></button>
          <button onClick={onOpenForm} className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-md shadow-blue-500/30 shrink-0"><i className="fas fa-plus"></i></button>
        </div>

      
        {/* BOTONES DE FILTRO CON ÍCONOS Y CRISTAL ESMERILADO AZUL */}
        <div className="flex gap-1 overflow-x-auto custom-scroll pb-1">
           <button onClick={() => setFiltro('activos')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'activos' ? 'bg-blue-600/80 backdrop-blur-md border border-blue-400/50 text-white shadow-md shadow-blue-500/30' : 'bg-white/60 text-slate-600 border border-slate-200/50 hover:bg-white'}`}><i className="fas fa-truck-moving text-[10px]"></i> En Curso</button>
           <button onClick={() => setFiltro('pendiente')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'pendiente' ? 'bg-blue-600/80 backdrop-blur-md border border-blue-400/50 text-white shadow-md shadow-blue-500/30' : 'bg-white/60 text-slate-600 border border-slate-200/50 hover:bg-white'}`}><i className="fas fa-clock text-[10px]"></i> Por Asignar</button>
           <button onClick={() => setFiltro('rampa')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'rampa' ? 'bg-blue-600/80 backdrop-blur-md border border-blue-400/50 text-white shadow-md shadow-blue-500/30' : 'bg-white/60 text-slate-600 border border-slate-200/50 hover:bg-white'}`}><i className="fas fa-dolly text-[10px]"></i> En Rampa</button>
           <button onClick={() => setFiltro('entregado')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'entregado' ? 'bg-emerald-600/80 backdrop-blur-md border border-emerald-500/50 text-white shadow-md shadow-emerald-500/20' : 'bg-white/60 text-slate-600 border border-slate-200/50 hover:bg-white'}`}><i className="fas fa-check-double text-[10px]"></i> Entregados</button>
           <button onClick={() => setFiltro('fallido')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'fallido' ? 'bg-red-500/80 backdrop-blur-md border border-red-400/50 text-white shadow-md shadow-red-500/20' : 'bg-white/60 text-slate-600 border border-slate-200/50 hover:bg-white'}`}><i className="fas fa-exclamation-triangle text-[10px]"></i> Fallas</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scroll">
        {contenidoSidebar}
        
        {pedidosFiltrados.length === 0 && (
            <div className="text-center py-6 text-slate-400 font-bold flex flex-col items-center">
                <i className="fas fa-search text-slate-300 text-3xl mb-2"></i>
                <span className="text-xs">No hay resultados.</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default SidebarDispatcher;