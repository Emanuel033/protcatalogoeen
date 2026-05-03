import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Componente auxiliar para ajustar el zoom cuando cambian los puntos
const AutoFocusMapa = ({ puntos }) => {
  const map = useMap();
  useEffect(() => {
    if (puntos && puntos.length > 0) {
      // Calculamos los límites de la ruta para hacer un "fitBounds"
      const bounds = puntos.map(p => [p.lat, p.lng]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [puntos, map]);
  return null;
};

const MapaLogistico = ({ pedidoSeleccionado }) => {
  const [rutaOSRM, setRutaOSRM] = useState([]);

  // Simulamos la llamada a tu API de OSRM cuando seleccionas un pedido
  useEffect(() => {
    if (pedidoSeleccionado && pedidoSeleccionado.paradas) {
      // Aquí harías tu fetch() a la URL de OSRM que ya tienes armada en tu Vanilla JS
      // fetch(`http://router.project-osrm.org/route/v1/driving/...`)
      
      // Mock de coordenadas devueltas por OSRM
      const coordenadasMock = [
        [25.6866, -100.3161], // MTY Centro
        [25.7000, -100.3000], // Punto B
        [25.7200, -100.2800]  // Punto C
      ];
      setRutaOSRM(coordenadasMock);
    } else {
      setRutaOSRM([]);
    }
  }, [pedidoSeleccionado]);

  return (
    <div className="h-full w-full rounded-lg overflow-hidden shadow-inner border border-gray-200 z-0">
      <MapContainer 
        center={[25.6866, -100.3161]} // Coordenadas por defecto (Monterrey)
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Dibujamos la línea de la ruta */}
        {rutaOSRM.length > 0 && (
          <Polyline 
            positions={rutaOSRM} 
            color="#2563eb" // blue-600 de Tailwind
            weight={5} 
            opacity={0.8} 
          />
        )}

        {/* Marcadores de cada parada */}
        {pedidoSeleccionado?.paradas?.map((parada, index) => (
          <Marker key={parada.id} position={[parada.lat, parada.lng]}>
            <Popup>
              <strong>Parada {index + 1}</strong><br/>
              {parada.direccion}
            </Popup>
          </Marker>
        ))}

        {/* Ajusta la cámara automáticamente */}
        <AutoFocusMapa puntos={pedidoSeleccionado?.paradas} />
      </MapContainer>
    </div>
  );
};

export default MapaLogistico;