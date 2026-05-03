import React, { useState } from 'react';
import { useLogistica } from '../../context/LogisticaContext'; // Ajusta la ruta si es necesario
import SidebarDispatcher from './SidebarDispatcher';
import DetalleDrawer from './DetalleDrawer';
import MapaLogistico from './MapaLogistico';

const RutasView = () => {
  const { pedidos } = useLogistica();
  const [filtro, setFiltro] = useState('activos');
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtro === 'todos') return true;
    if (filtro === 'activos') return p.estado === 'pendiente' || p.estado === 'camino';
    if (filtro === 'rampa') return p.estado === 'camino' && !p.fecha_salida;
    if (filtro === 'camino') return p.estado === 'camino' && p.fecha_salida;
    return p.estado === filtro;
  });

  return (
    <div className="relative h-screen w-full bg-slate-100 overflow-hidden flex font-sans">
      
      {/* Panel Lateral Izquierdo */}
      <SidebarDispatcher 
        pedidosFiltrados={pedidosFiltrados} 
        filtro={filtro}
        setFiltro={setFiltro}
        viajeSeleccionado={viajeSeleccionado}
        setViajeSeleccionado={setViajeSeleccionado}
      />

      {/* Panel Lateral Derecho (Detalles) */}
      <DetalleDrawer 
        pedidoSeleccionado={viajeSeleccionado}
        onClose={() => setViajeSeleccionado(null)}
      />

      {/* Mapa Principal */}
      <div className="absolute inset-0 z-0">
        <MapaLogistico 
          pedidosFiltrados={pedidosFiltrados}
          pedidoSeleccionado={viajeSeleccionado}
          onSelectPedido={setViajeSeleccionado}
        />
      </div>

    </div>
  );
};

export default RutasView;