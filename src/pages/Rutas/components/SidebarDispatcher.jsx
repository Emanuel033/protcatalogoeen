import React, { useMemo, useEffect } from 'react';
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

  // AUTO-CENTRADO SIMPLIFICADO Y DIRECTO
  useEffect(() => {
    if (viajeSeleccionado) {
        const timeoutId = setTimeout(() => {
            const selectedCard = document.getElementById(`pedido-card-${viajeSeleccionado.id}`);
            if (selectedCard) {
                selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
        return () => clearTimeout(timeoutId);
    }
  }, [viajeSeleccionado, filtro]);


  const contenidoSidebar = useMemo(() => {
    if (pedidosFiltrados.length === 0) return [];

    if (filtro === 'pendiente') {
      const grupos = {};
      pedidosFiltrados.forEach(p => {
        const key = p.direccion || `sin_direccion_${p.id}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(p);
      });

      return Object.values(grupos).map((grupo, index) => {
        if (grupo.length > 1) {
          return (
            <div key={`grupo-${index}`} className="border-[1.5px] border-dashed border-blue-400/50 bg-blue-50/30 rounded-2xl p-2 pb-2 mb-3 pt-8 relative shadow-sm">
              <div className="absolute top-2 left-3 text-[9px] font-black text-blue-800 flex items-center gap-1.5 uppercase tracking-wide">
                <i className="fas fa-map-marker-alt"></i> {grupo.length} pedidos al mismo destino
              </div>
              <div className="space-y-2">
                {grupo.map(pedido => (
                  <div key={pedido.id} id={`pedido-card-${pedido.id}`}>
                      <PedidoCard pedido={pedido} isActive={viajeSeleccionado?.id === pedido.id} onClick={() => setViajeSeleccionado(pedido)} />
                  </div>
                ))}
              </div>
            </div>
          );
        } else {
          const pedido = grupo[0];
          return (
            <div key={pedido.id} id={`pedido-card-${pedido.id}`} className="mb-3">
              <PedidoCard pedido={pedido} isActive={viajeSeleccionado?.id === pedido.id} onClick={() => setViajeSeleccionado(pedido)} />
            </div>
          );
        }
      });
    }

    return pedidosFiltrados.map(pedido => (
      <div key={pedido.id} id={`pedido-card-${pedido.id}`} className="mb-3">
        <PedidoCard pedido={pedido} isActive={viajeSeleccionado?.id === pedido.id} onClick={() => setViajeSeleccionado(pedido)} />
      </div>
    ));
  }, [pedidosFiltrados, filtro, viajeSeleccionado, setViajeSeleccionado]);


  return (
    // CONTENEDOR PRINCIPAL: Cristal blanco/claro
    <div className="w-full h-full bg-white/60 backdrop-blur-2xl flex flex-col border-r border-white/50 shadow-2xl overflow-hidden rounded-r-3xl">
      
      <div className="p-4 border-b border-white/40 shrink-0 relative z-20 bg-white/30">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-black text-blue-900 flex items-center gap-2 drop-shadow-sm">
              <i className="fas fa-truck-fast text-blue-700"></i> Logística EEN
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              DOMINGO, 3 DE MAYO DE 2026
            </p>
          </div>
          <button onClick={onToggleSidebar} className="w-8 h-8 rounded-full bg-white/50 border border-white/60 text-slate-600 hover:text-blue-800 hover:bg-white/80 shadow-sm transition flex items-center justify-center">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
        </div>

        <div className="flex gap-2 items-center mb-4">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input type="text" placeholder="Buscar cliente, folio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-white/60 border border-white/50 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium text-slate-800 placeholder-slate-400 shadow-sm backdrop-blur-sm" />
          </div>
          <button onClick={onOpenAdmin} className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition shadow-md shrink-0"><i className="fas fa-cog"></i></button>
          <button onClick={onOpenBitacora} className="w-9 h-9 rounded-xl bg-indigo-50/80 backdrop-blur-sm text-indigo-700 border border-indigo-200 flex items-center justify-center hover:bg-indigo-100 transition shadow-sm shrink-0"><i className="fas fa-book"></i></button>
          <button onClick={onOpenForm} className="w-9 h-9 rounded-xl bg-blue-700/90 backdrop-blur-sm text-white flex items-center justify-center hover:bg-blue-800 transition shadow-md shadow-blue-800/20 shrink-0"><i className="fas fa-plus"></i></button>
        </div>

        {/* 6 FILTROS: Los activos usan Azul Rey esmerilado (bg-blue-800/50), los inactivos cristal blanco */}
        <div className="flex gap-1.5 overflow-x-auto custom-scroll pb-1">
           <button onClick={() => setFiltro('activos')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'activos' ? 'bg-blue-800/50 backdrop-blur-md border border-blue-500/40 text-white shadow-md shadow-blue-900/10' : 'bg-white/40 text-slate-700 border border-white/50 hover:bg-white/70'}`}><i className="fas fa-layer-group text-[10px]"></i> En Curso</button>
           <button onClick={() => setFiltro('pendiente')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'pendiente' ? 'bg-blue-800/50 backdrop-blur-md border border-blue-500/40 text-white shadow-md shadow-blue-900/10' : 'bg-white/40 text-slate-700 border border-white/50 hover:bg-white/70'}`}><i className="fas fa-clock text-[10px]"></i> Por Asignar</button>
           <button onClick={() => setFiltro('rampa')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'rampa' ? 'bg-blue-800/50 backdrop-blur-md border border-blue-500/40 text-white shadow-md shadow-blue-900/10' : 'bg-white/40 text-slate-700 border border-white/50 hover:bg-white/70'}`}><i className="fas fa-dolly text-[10px]"></i> En Rampa</button>
           <button onClick={() => setFiltro('ruta')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'ruta' ? 'bg-blue-800/50 backdrop-blur-md border border-blue-500/40 text-white shadow-md shadow-blue-900/10' : 'bg-white/40 text-slate-700 border border-white/50 hover:bg-white/70'}`}><i className="fas fa-truck-fast text-[10px]"></i> En Ruta</button>
           <button onClick={() => setFiltro('entregado')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'entregado' ? 'bg-emerald-600/50 backdrop-blur-md border border-emerald-400/50 text-white shadow-md shadow-emerald-900/10' : 'bg-white/40 text-slate-700 border border-white/50 hover:bg-white/70'}`}><i className="fas fa-check-double text-[10px]"></i> Entregados</button>
           <button onClick={() => setFiltro('fallido')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'fallido' ? 'bg-red-600/50 backdrop-blur-md border border-red-400/50 text-white shadow-md shadow-red-900/10' : 'bg-white/40 text-slate-700 border border-white/50 hover:bg-white/70'}`}><i className="fas fa-exclamation-triangle text-[10px]"></i> Fallas</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scroll space-y-3 relative z-10">
        {contenidoSidebar}
        
        {pedidosFiltrados.length === 0 && (
            <div className="text-center py-6 text-slate-500 font-bold flex flex-col items-center">
                <i className="fas fa-search text-slate-400 text-3xl mb-2"></i>
                <span className="text-xs">No hay resultados.</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default SidebarDispatcher;