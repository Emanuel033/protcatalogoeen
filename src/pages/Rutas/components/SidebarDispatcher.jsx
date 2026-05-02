import React, { useState } from 'react';
import PedidoCard from './PedidoCard';
// Subimos un nivel (a Rutas) y entramos a context
import { useLogistica } from '../context/LogisticaContext';

const SidebarDispatcher = ({ pedidosFiltrados, filtro, setFiltro, viajeSeleccionado, setViajeSeleccionado }) => {
  const { loading } = useLogistica();
  const [busqueda, setBusqueda] = useState('');

  const filtradosBusqueda = pedidosFiltrados.filter(v => 
    v.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
    v.folio_pedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.destino_alias?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <aside className="absolute left-4 top-4 bottom-4 z-[1000] w-[380px] bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 flex flex-col overflow-hidden">
      
      {/* Cabecera */}
      <div className="p-4 border-b border-slate-100 bg-white/50">
        <h1 className="text-lg font-black tracking-tight text-slate-800 flex items-center gap-2 mb-3">
          <i className="fas fa-truck-fast text-blue-600"></i> Logística EEN
        </h1>
        
        {/* Buscador */}
        <div className="relative shadow-sm rounded-xl mb-3">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm"></i>
            <input 
                type="text" 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente, folio..." 
                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2.5 rounded-xl text-sm font-bold focus:ring-blue-500 outline-none"
            />
        </div>

        {/* Filtros (Scroll horizontal) */}
        <div className="flex gap-2 overflow-x-auto custom-scroll pb-2">
            {[
                { id: 'activos', label: 'En Curso', icon: 'fa-layer-group' },
                { id: 'pendiente', label: 'Por Asignar', icon: 'fa-clock' },
                { id: 'rampa', label: 'En Rampa', icon: 'fa-boxes' },
                { id: 'camino', label: 'En Ruta', icon: 'fa-truck-fast' },
                { id: 'fallido', label: 'Fallas', icon: 'fa-exclamation-triangle' }
            ].map(f => (
                <button 
                    key={f.id}
                    onClick={() => setFiltro(f.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1
                        ${filtro === f.id ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    <i className={`fas ${f.icon}`}></i> {f.label}
                </button>
            ))}
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2 bg-slate-50/80">
        {loading ? (
          <div className="text-center py-10"><i className="fas fa-circle-notch fa-spin text-3xl text-blue-500 mb-3"></i></div>
        ) : filtradosBusqueda.length === 0 ? (
          <div className="text-center py-6 text-slate-400 font-bold">Sin resultados.</div>
        ) : (
          filtradosBusqueda.map(pedido => (
            <PedidoCard 
                key={pedido.id} 
                pedido={pedido} 
                isActive={viajeSeleccionado?.id === pedido.id}
                onClick={() => setViajeSeleccionado(pedido)}
            />
          ))
        )}
      </div>
    </aside>
  );
};

export default SidebarDispatcher;