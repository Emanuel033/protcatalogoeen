import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
// Importamos directamente de la carpeta context que está al mismo nivel
import { useLogistica } from './context/LogisticaContext';
import SidebarDispatcher from './components/SidebarDispatcher';

const RutasView = () => {
  const { pedidos } = useLogistica();
  const [filtro, setFiltro] = useState('activos');
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  
  // Coordenadas Planta EEN Monterrey
  const centerPosition = [25.689804, -100.312066];

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtro === 'todos') return true;
    if (filtro === 'activos') return p.estado === 'pendiente' || p.estado === 'camino';
    if (filtro === 'rampa') return p.estado === 'camino' && !p.fecha_salida;
    if (filtro === 'camino') return p.estado === 'camino' && p.fecha_salida;
    return p.estado === filtro;
  });

  return (
    <div className="relative h-screen w-full bg-slate-100 overflow-hidden flex font-sans">
      
      {/* Panel Lateral */}
      <SidebarDispatcher 
        pedidosFiltrados={pedidosFiltrados} 
        filtro={filtro}
        setFiltro={setFiltro}
        viajeSeleccionado={viajeSeleccionado}
        setViajeSeleccionado={setViajeSeleccionado}
      />

      {/* Mapa */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={centerPosition} zoom={13} zoomControl={false} className="h-full w-full">
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
          />
          <ZoomControl position="bottomright" />
          
          {/* Marcador Planta EEN */}
          <Marker position={centerPosition}>
            <Popup><div className="font-bold">Planta EEN</div></Popup>
          </Marker>

          {/* Marcadores de Pedidos */}
          {pedidosFiltrados.map(p => (
            p.coordenadas && p.coordenadas.lat ? (
              <Marker 
                key={p.id} 
                position={[p.coordenadas.lat, p.coordenadas.lng]}
                eventHandlers={{ click: () => setViajeSeleccionado(p) }}
              >
                <Popup>
                  <div className="font-bold text-slate-800">{p.cliente_nombre}</div>
                  <div className="text-[10px] text-slate-500">{p.destino_alias || 'Destino'}</div>
                </Popup>
              </Marker>
            ) : null
          ))}
        </MapContainer>
      </div>

    </div>
  );
};

export default RutasView;