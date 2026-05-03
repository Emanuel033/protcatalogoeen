import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ícono Planta
const PlantaIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/10397/10397223.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Ícono Pedidos (Normal)
const PedidoIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Ícono Pedido Seleccionado (Más grande y llamativo)
const PedidoSeleccionadoIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png',
  iconSize: [45, 45],
  iconAnchor: [22.5, 45],
  popupAnchor: [0, -45],
  className: 'drop-shadow-xl animate-bounce'
});

// Componente para auto-centrar el mapa según el pedido seleccionado
const MapController = ({ pedidoSeleccionado, sidebarAbierto }) => {
  const map = useMap();
  
  // Arregla el problema del área gris al colapsar el sidebar
  useEffect(() => {
    setTimeout(() => { map.invalidateSize(); }, 300);
  }, [sidebarAbierto, map]);

  useEffect(() => {
    if (pedidoSeleccionado?.coordenadas?.lat) {
      map.flyTo([pedidoSeleccionado.coordenadas.lat, pedidoSeleccionado.coordenadas.lng], 14, { duration: 1.5 });
    }
  }, [pedidoSeleccionado, map]);
  
  return null;
};

const MapaLogistico = ({ pedidos = [], pedidoSeleccionado, setViajeSeleccionado, sidebarAbierto }) => {
  const PLANTA_COORDS = [25.6866, -100.3161]; 

  return (
    <div className="w-full h-full bg-slate-200 z-0 relative">
      <MapContainer 
        center={PLANTA_COORDS} 
        zoom={11} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false} // Lo desactivamos aquí para posicionarlo manualmente
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <ZoomControl position="topright" /> {/* Botones de zoom arriba a la derecha */}
        
        <MapController pedidoSeleccionado={pedidoSeleccionado} sidebarAbierto={sidebarAbierto} />

        {/* PIN DE PLANTA EEN */}
        <Marker position={PLANTA_COORDS} icon={PlantaIcon}>
          <Popup className="font-sans">
            <div className="text-center font-black text-slate-800">
              <i className="fas fa-industry text-blue-600 mb-1 text-lg"></i>
              <p className="m-0 text-xs uppercase tracking-wider">Planta EEN</p>
            </div>
          </Popup>
        </Marker>

        {/* PINES DE LOS PEDIDOS FILTRADOS */}
        {pedidos.map(pedido => {
          if (!pedido.coordenadas?.lat || !pedido.coordenadas?.lng) return null;
          
          const isSelected = pedidoSeleccionado?.id === pedido.id;
          
          return (
            <Marker 
              key={pedido.id} 
              position={[pedido.coordenadas.lat, pedido.coordenadas.lng]} 
              icon={isSelected ? PedidoSeleccionadoIcon : PedidoIcon}
              eventHandlers={{
                click: () => {
                  if (setViajeSeleccionado) setViajeSeleccionado(pedido);
                },
              }}
            >
              <Popup>
                <div className="font-sans min-w-[150px]">
                  <p className="font-black text-xs text-slate-800 m-0 mb-1 truncate max-w-[200px]">
                    {pedido.cliente_nombre}
                  </p>
                  <p className="text-[10px] text-slate-500 m-0 leading-tight">
                    {pedido.direccion}
                  </p>
                  <div className="mt-2 text-center">
                    <span className="bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded">
                      {pedido.folio_pedido || 'S/F'}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapaLogistico;