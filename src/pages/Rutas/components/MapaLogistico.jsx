import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 1. FUNCIÓN CREADORA DE PINES DINÁMICOS
const getPinDinamico = (estado, isSelected) => {
  let colorHex = '#475569'; // slate-600 (Pendiente por defecto)
  let iconClass = 'fa-box';
  let extraClasses = '';

  if (estado === 'camino' || estado === 'rampa') { 
      colorHex = '#3b82f6'; // blue-500
      iconClass = 'fa-truck-fast'; 
  } else if (estado === 'entregado') { 
      colorHex = '#10b981'; // emerald-500
      iconClass = 'fa-check'; 
  } else if (estado === 'fallido') { 
      colorHex = '#ef4444'; // red-500
      iconClass = 'fa-exclamation-triangle'; 
      extraClasses = 'animate-pulse'; 
  }

  const size = isSelected ? 45 : 32;
  const iconSize = isSelected ? 'text-lg' : 'text-xs';
  const shadow = isSelected ? 'shadow-[0_10px_20px_rgba(0,0,0,0.5)]' : 'shadow-md';
  const border = isSelected ? 'border-4' : 'border-2';
  
  const html = `
    <div class="relative flex flex-col items-center justify-center ${extraClasses}" style="width: ${size}px; height: ${size + 10}px;">
      <div class="flex items-center justify-center w-full h-full rounded-full text-white ${shadow} ${border} border-white z-10 transition-all duration-300" style="background-color: ${colorHex};">
        <i class="fas ${iconClass} ${iconSize}"></i>
      </div>
      <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent z-0 -mt-1" style="border-top-color: ${colorHex};"></div>
    </div>
  `;

  return L.divIcon({
    className: 'bg-transparent border-none', // Quitamos estilos por defecto de Leaflet
    html: html,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 10],
    popupAnchor: [0, -(size + 10)]
  });
};

const PlantaIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `
    <div class="relative flex flex-col items-center justify-center" style="width: 45px; height: 55px;">
      <div class="flex items-center justify-center w-full h-full rounded-2xl text-white shadow-xl border-2 border-white z-10 bg-slate-900">
        <i class="fas fa-industry text-lg"></i>
      </div>
      <div class="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent z-0 -mt-1" style="border-top-color: #0f172a;"></div>
    </div>
  `,
  iconSize: [45, 55],
  iconAnchor: [22.5, 55],
  popupAnchor: [0, -55]
});


// Busca esta función dentro de MapaLogistico.jsx y sustitúyela
const MapController = ({ pedidoSeleccionado, sidebarAbierto }) => {
  const map = useMap();
  
  // ARREGLO DEFINITIVO DEL ESPACIO GRIS
  useEffect(() => {
    // Forzamos al mapa a actualizarse continuamente mientras dura la animación CSS (300ms)
    const interval = setInterval(() => {
      map.invalidateSize();
    }, 30); // Se actualiza cada 30ms

    // Limpiamos el intervalo después de que la animación termina seguro
    const timeout = setTimeout(() => {
      clearInterval(interval);
      map.invalidateSize();
    }, 350); 

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
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
      <MapContainer center={PLANTA_COORDS} zoom={11} style={{ width: '100%', height: '100%' }} zoomControl={false} >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <ZoomControl position="topright" />
        <MapController pedidoSeleccionado={pedidoSeleccionado} sidebarAbierto={sidebarAbierto} />

        {/* PIN DE LA PLANTA (Ahora dinámico también) */}
        <Marker position={PLANTA_COORDS} icon={PlantaIcon}>
          <Popup className="font-sans">
            <div className="text-center font-black text-slate-800"><i className="fas fa-industry text-blue-600 mb-1 text-lg"></i><p className="m-0 text-xs uppercase tracking-wider">Planta EEN</p></div>
          </Popup>
        </Marker>

        {/* PINES DINÁMICOS DE LOS PEDIDOS */}
        {pedidos.map(pedido => {
          if (!pedido.coordenadas?.lat || !pedido.coordenadas?.lng) return null;
          const isSelected = pedidoSeleccionado?.id === pedido.id;
          
          return (
            <Marker 
              key={pedido.id} 
              position={[pedido.coordenadas.lat, pedido.coordenadas.lng]} 
              icon={getPinDinamico(pedido.estado, isSelected)}
              eventHandlers={{ click: () => { if (setViajeSeleccionado) setViajeSeleccionado(pedido); } }}
            >
              <Popup>
                <div className="font-sans min-w-[150px]">
                  <p className="font-black text-xs text-slate-800 m-0 mb-1 truncate max-w-[200px]">{pedido.cliente_nombre}</p>
                  <p className="text-[10px] text-slate-500 m-0 leading-tight">{pedido.direccion}</p>
                  <div className="mt-2 text-center"><span className="bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded">{pedido.folio_pedido || 'S/F'}</span></div>
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