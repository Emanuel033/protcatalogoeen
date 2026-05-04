import React, { useMemo, useEffect, useRef } from 'react';
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

  const sidebarContainerRef = useRef(null);

  // AUTO-CENTRADO BLINDADO (Cálculo matemático exacto)
  useEffect(() => {
    if (viajeSeleccionado && sidebarContainerRef.current) {
        const timeoutId = setTimeout(() => {
            const container = sidebarContainerRef.current;
            const element = container.querySelector(`#pedido-card-${viajeSeleccionado.id}`);
            
            if (element) {
                // Calculamos el centro exacto del contenedor y del elemento
                const containerCenter = container.clientHeight / 2;
                const elementCenter = element.offsetTop + (element.clientHeight / 2);
                
                // Hacemos scroll directamente en el contenedor
                container.scrollTo({
                    top: elementCenter - containerCenter,
                    behavior: 'smooth'
                });
            }
        }, 150); // 150ms asegura que React ya dibujó la lista
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
            <div key={`grupo-${index}`} className="border-[1.5px] border-dashed border-blue-400/50 bg-blue-900/30 rounded-2xl p-2 pb-2 mb-3 pt-8 relative shadow-sm">
              <div className="absolute top-2 left-3 text-[9px] font-black text-blue-200 flex items-center gap-1.5 uppercase tracking-wide">
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
    // TEMA DEEP BLUE GLASS: bg-slate-900/70 para oscurecer y dar contraste al texto
    <div className="w-full h-full bg-slate-900/70 backdrop-blur-2xl flex flex-col border-r border-white/10 shadow-[20px_0_40px_rgba(0,0,0,0.3)] overflow-hidden rounded-r-3xl text-white">
      
      <div className="p-4 border-b border-white/10 shrink-0 relative z-20 bg-blue-950/40">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2 drop-shadow-md">
              <i className="fas fa-truck-fast text-blue-400"></i> Logística EEN
            </h2>
            <p className="text-[10px] font-bold text-blue-200/70 uppercase tracking-wider mt-0.5">
              DOMINGO, 3 DE MAYO DE 2026
            </p>
          </div>
          <button onClick={onToggleSidebar} className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-blue-100 hover:text-white hover:bg-white/20 shadow-sm transition flex items-center justify-center">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
        </div>

        <div className="flex gap-2 items-center mb-4">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 text-sm"></i>
            <input type="text" placeholder="Buscar cliente, folio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-black/30 border border-white/20 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition font-medium text-white placeholder-blue-300 shadow-inner" />
          </div>
          <button onClick={onOpenAdmin} className="w-9 h-9 rounded-xl bg-white/10 text-blue-100 border border-white/20 flex items-center justify-center hover:bg-white/20 hover:text-white transition shadow-sm shrink-0"><i className="fas fa-cog"></i></button>
          <button onClick={onOpenBitacora} className="w-9 h-9 rounded-xl bg-white/10 text-blue-100 border border-white/20 flex items-center justify-center hover:bg-white/20 hover:text-white transition shadow-sm shrink-0"><i className="fas fa-book"></i></button>
          <button onClick={onOpenForm} className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400 transition shrink-0"><i className="fas fa-plus"></i></button>
        </div>

        {/* FILTROS CRISTALINOS CON "EN RUTA" ARREGLADO */}
        <div className="flex gap-1.5 overflow-x-auto custom-scroll pb-1">
           <button onClick={() => setFiltro('activos')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'activos' ? 'bg-blue-600/90 text-white border border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-black/30 text-blue-200 border border-white/10 hover:bg-white/10'}`}><i className="fas fa-truck-moving text-[10px]"></i> En Ruta</button>
           <button onClick={() => setFiltro('pendiente')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'pendiente' ? 'bg-white/90 text-slate-900 border border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-black/30 text-blue-200 border border-white/10 hover:bg-white/10'}`}><i className="fas fa-clock text-[10px]"></i> Por Asignar</button>
           <button onClick={() => setFiltro('rampa')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'rampa' ? 'bg-indigo-600/90 text-white border border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-black/30 text-blue-200 border border-white/10 hover:bg-white/10'}`}><i className="fas fa-dolly text-[10px]"></i> En Rampa</button>
           <button onClick={() => setFiltro('entregado')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'entregado' ? 'bg-emerald-600/90 text-white border border-emerald-400 shadow-[0_0_15px_rgba(5,150,105,0.4)]' : 'bg-black/30 text-blue-200 border border-white/10 hover:bg-white/10'}`}><i className="fas fa-check-double text-[10px]"></i> Entregados</button>
           <button onClick={() => setFiltro('fallido')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'fallido' ? 'bg-red-600/90 text-white border border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-black/30 text-blue-200 border border-white/10 hover:bg-white/10'}`}><i className="fas fa-exclamation-triangle text-[10px]"></i> Fallas</button>
        </div>
      </div>

      <div ref={sidebarContainerRef} className="flex-1 overflow-y-auto p-3 custom-scroll space-y-3 relative z-10">
        {contenidoSidebar}
        
        {pedidosFiltrados.length === 0 && (
            <div className="text-center py-6 text-blue-300 font-bold flex flex-col items-center">
                <i className="fas fa-search text-blue-500/50 text-3xl mb-2"></i>
                <span className="text-xs">No hay resultados.</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default SidebarDispatcher;