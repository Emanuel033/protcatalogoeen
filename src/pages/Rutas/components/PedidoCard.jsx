import React from 'react';
// Subimos un nivel (a Rutas) y entramos a context
import { useLogistica } from '../context/LogisticaContext';

const PedidoCard = ({ pedido, isActive, onClick }) => {
  const { flota, choferes } = useLogistica();

  // Mapeo de estados visuales
  const getStatusStyles = () => {
    switch (pedido.estado) {
        case 'fallido': return { bg: 'bg-red-50 text-red-600', icon: 'fa-exclamation-triangle', text: 'Problema' };
        case 'pendiente': return { bg: 'bg-amber-50 text-amber-600', icon: 'fa-clock', text: 'Por Asignar' };
        case 'camino': 
            return !pedido.fecha_salida 
                ? { bg: 'bg-indigo-50 text-indigo-600', icon: 'fa-boxes', text: 'En Rampa' }
                : { bg: 'bg-blue-50 text-blue-600', icon: 'fa-truck-fast', text: 'En Ruta' };
        case 'entregado': return { bg: 'bg-emerald-50 text-emerald-600', icon: 'fa-check-double', text: 'Entregado' };
        default: return { bg: 'bg-slate-50 text-slate-600', icon: 'fa-circle', text: pedido.estado };
    }
  };

  const status = getStatusStyles();
  const esContpaqi = pedido.origen === 'Contpaqi';
  
  // Buscar nombres en catálogos
  const vehiculoNombre = flota.find(f => f.id === pedido.vehiculo_asignado)?.nombre;
  const choferNombre = choferes.find(c => c.id === pedido.chofer_asignado)?.nombre;

  return (
    <div 
        onClick={onClick}
        className={`rounded-2xl p-3 cursor-pointer relative overflow-hidden transition-all shadow-sm border 
        ${isActive ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
        <div className="flex justify-between items-start mb-1.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${status.bg}`}>
                <i className={`fas ${status.icon}`}></i> {status.text}
            </span>
            <span className="text-[9px] font-mono font-bold text-slate-400">
                {pedido.folio_pedido || pedido.folio_factura || 'S/F'}
            </span>
        </div>

        <h4 className="font-black text-slate-800 text-xs truncate mb-1">
            {pedido.cliente_nombre}
            {esContpaqi && (
                <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase ml-1 shadow-sm">
                    <i className="fas fa-server"></i> ERP
                </span>
            )}
            {pedido.requiere_cobro && (
                <span className="bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[7px] font-black uppercase ml-1 shadow-sm">
                    Aviso Adeudo
                </span>
            )}
        </h4>

        <div className="flex justify-between items-center mb-1 gap-2">
            <p className="text-[9px] text-slate-500 truncate font-medium flex-1">
                <i className="fas fa-map-marker-alt text-red-400 w-3"></i> 
                {pedido.destino_alias && <b>({pedido.destino_alias}) </b>}
                {pedido.direccion}
            </p>
        </div>

        {/* Footer de la tarjeta si está asignado */}
        {pedido.vehiculo_asignado && pedido.estado !== 'pendiente' && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-500">
                <span className="bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <i className="fas fa-truck text-slate-400"></i> {vehiculoNombre || 'Vehículo'}
                </span>
                <span className="text-blue-600 flex items-center gap-1">
                    <i className="fas fa-user-circle"></i> {choferNombre || 'Chofer'}
                </span>
            </div>
        )}
    </div>
  );
};

export default PedidoCard;