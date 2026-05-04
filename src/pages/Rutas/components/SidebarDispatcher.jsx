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
            <div key={`grupo-${index}`} className="border-[1.5px] border-dashed border-white/30 bg-white/5 backdrop-blur-sm rounded-2xl p-2 pb-2 mb-3 pt-8 relative">
              <div className="absolute top-2 left-3 text-[10px] font-extrabold text-[#003366] flex items-center gap-1.5 uppercase tracking-wide bg-white/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
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
    // CAMBIO: bg-white/90 en móvil para evitar que el blur "rompa" el texto
    <div className="w-full h-full bg-white/90 sm:bg-white/10 backdrop-blur-xl shadow-2xl flex flex-col border-r border-white/20 overflow-hidden rounded-r-3xl transform-gpu">
      
      <div className="p-4 border-b border-white/10 shrink-0 relative z-20 bg-transparent">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-black text-[#001A3D] flex items-center gap-2">
              <i className="fas fa-truck-fast text-blue-700"></i> Logística EEN
            </h2>
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mt-0.5">
              DOMINGO, 3 DE MAYO DE 2026
            </p>
          </div>
          <button onClick={onToggleSidebar} className="w-8 h-8 rounded-full bg-white/50 border border-white/60 text-slate-600 shadow-sm flex items-center justify-center">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
        </div>

        <div className="flex gap-2 items-center mb-4">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-white/50 border border-white/40 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 transition font-bold text-slate-900 shadow-inner"  />
          </div>
          <button onClick={onOpenAdmin} className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition shadow-md shrink-0"><i className="fas fa-cog"></i></button>
          <button onClick={onOpenBitacora} className="w-9 h-9 rounded-xl bg-indigo-50/80 backdrop-blur-sm text-indigo-700 border border-indigo-200 flex items-center justify-center hover:bg-indigo-100 transition shadow-sm shrink-0"><i className="fas fa-book"></i></button>
          <button onClick={onOpenForm} className="w-9 h-9 rounded-xl bg-blue-700/90 backdrop-blur-sm text-white flex items-center justify-center hover:bg-blue-800 transition shadow-md shadow-blue-800/20 shrink-0"><i className="fas fa-plus"></i></button>
        </div>

        {/* 6 FILTROS: OPACIDAD MEJORADA), los inactivos cristal blanco */}
        <div className="flex gap-1.5 overflow-x-auto custom-scroll pb-1">
           <button onClick={() => setFiltro('activos')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'activos' ? 'bg-blue-800/50 backdrop-blur-md border border-blue-500/40 text-white shadow-md shadow-blue-900/10' : 'bg-white/40 text-[#2D3748] border border-white/60 hover:bg-white/70 font-bold'}`}><i className="fas fa-layer-group text-[10px]"></i> En Curso</button>
           <button onClick={() => setFiltro('pendiente')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'pendiente' ? 'bg-blue-800/50 backdrop-blur-md border border-blue-500/40 text-white shadow-md shadow-blue-900/10' : 'bg-white/40 text-[#2D3748] border border-white/60 hover:bg-white/70 font-bold'}`}><i className="fas fa-clock text-[10px]"></i> Por Asignar</button>
           <button onClick={() => setFiltro('rampa')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'rampa' ? 'bg-blue-800/50 backdrop-blur-md border border-blue-500/40 text-white shadow-md shadow-blue-900/10' : 'bg-white/40 text-[#2D3748] border border-white/60 hover:bg-white/70 font-bold'}`}><i className="fas fa-dolly text-[10px]"></i> En Rampa</button>
           <button onClick={() => setFiltro('ruta')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'ruta' ? 'bg-blue-800/50 backdrop-blur-md border border-blue-500/40 text-white shadow-md shadow-blue-900/10' : 'bg-white/40 text-[#2D3748] border border-white/60 hover:bg-white/70 font-bold'}`}><i className="fas fa-truck-fast text-[10px]"></i> En Ruta</button>
           <button onClick={() => setFiltro('entregado')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'entregado' ? 'bg-emerald-600/50 backdrop-blur-md border border-emerald-400/50 text-white shadow-md shadow-emerald-900/10' : 'bg-white/40 text-[#2D3748] border border-white/60 hover:bg-white/70 font-bold'}`}><i className="fas fa-check-double text-[10px]"></i> Entregados</button>
           <button onClick={() => setFiltro('fallido')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'fallido' ? 'bg-red-600/50 backdrop-blur-md border border-red-400/50 text-white shadow-md shadow-red-900/10' : 'bg-white/40 text-[#2D3748] border border-white/60 hover:bg-white/70 font-bold'}`}><i className="fas fa-exclamation-triangle text-[10px]"></i> Fallas</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 relative z-10 scroll-smooth">
        {contenidoSidebar}
        
        {pedidosFiltrados.length === 0 && (
            <div className="text-center py-12 flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 m-4">
        <i className="fas fa-search text-blue-900/30 text-4xl mb-3"></i>
        <span className="text-xs font-black text-blue-900/60 uppercase tracking-widest">
                No hay resultados.</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default SidebarDispatcher;