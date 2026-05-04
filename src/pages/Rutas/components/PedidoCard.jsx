import React from 'react';
import { useLogistica } from '../context/LogisticaContext';

const PedidoCard = ({ pedido, isActive, onClick }) => {
  const { flota, choferes } = useLogistica(); 

  const esPendiente = pedido.estado === 'pendiente';
  const esFallido = pedido.estado === 'fallido';
  const esEntregado = pedido.estado === 'entregado';
  const esRampa = pedido.estado === 'camino' && !pedido.fecha_salida;
  const esEnRuta = pedido.estado === 'camino' && pedido.fecha_salida;

  // Validaciones para insignias
  const esContpaqi = pedido.origen?.toLowerCase() === 'contpaqi';
  const saldo = parseFloat(pedido.saldo_pendiente || 0);
  const requiereCobro = pedido.requiere_cobro || saldo > 0;

  const fondoTarjeta = isActive 
    ? 'bg-blue-600/80 backdrop-blur-xl border-blue-400 shadow-lg shadow-blue-500/30 scale-[1.02] z-10' 
    : 'bg-white/60 backdrop-blur-md border-white/80 shadow-sm hover:shadow-md hover:bg-white/80';
    
  const textoPrincipal = isActive ? 'text-white' : 'text-slate-800';
  const textoSecundario = isActive ? 'text-blue-100' : 'text-slate-500';
  const textoFolio = isActive ? 'text-blue-200' : 'text-slate-400';
  const iconoRojo = isActive ? 'text-white/80' : 'text-red-500';

  const nombreChofer = choferes.find(c => c.id === pedido.chofer_asignado)?.nombre || 'Chofer';
  const nombreVehiculo = flota.find(f => f.id === pedido.vehiculo_asignado)?.nombre || 'Unidad';

  return (
    <div 
      onClick={onClick}
      className={`relative p-4 rounded-2xl transition-all duration-300 cursor-pointer border-2 ${fondoTarjeta}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-1.5 items-center">
            {esFallido && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black uppercase"><i className="fas fa-exclamation-triangle"></i> Problema</span>}
            {esPendiente && <span className={`${isActive ? 'bg-white text-blue-800' : 'bg-amber-100 text-amber-700'} px-2 py-0.5 rounded text-[9px] font-black uppercase transition-colors`}><i className="fas fa-clock"></i> Por Asignar</span>}
            {esRampa && <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-black uppercase"><i className="fas fa-dolly"></i> En Rampa</span>}
            {esEnRuta && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase"><i className="fas fa-truck-fast"></i> En Ruta</span>}
            {esEntregado && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase"><i className="fas fa-check-double"></i> Entregado</span>}
        </div>
        <span className={`text-[10px] font-mono font-bold ${textoFolio}`}>{pedido.folio_pedido || 'S/N'}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center mb-1 pr-2">
        <h4 className={`font-black text-sm leading-tight truncate transition-colors ${textoPrincipal}`}>
          {pedido.cliente_nombre}
        </h4>
        {esContpaqi && <span className="bg-slate-700 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase shadow-sm">CONTPAQI</span>}
        {requiereCobro && <span className="bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[7px] font-black uppercase shadow-sm"><i className="fas fa-exclamation-circle"></i> Adeudo</span>}
        {pedido.urgente && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase shadow-sm"><i className="fas fa-fire-alt"></i> Urgente</span>}
      </div>
      
      <p className={`text-[10px] font-medium leading-snug flex items-start gap-1 transition-colors ${textoSecundario}`}>
        <i className={`fas fa-map-marker-alt mt-0.5 shrink-0 ${iconoRojo}`}></i> 
        <span className="truncate">{pedido.direccion}</span>
      </p>

      {(pedido.vehiculo_asignado && !esPendiente) && (
        <div className={`mt-3 pt-2 border-t flex justify-between items-center text-[9px] font-bold ${isActive ? 'border-blue-500 text-blue-100' : 'border-slate-200 text-slate-500'}`}>
          <span className={`${isActive ? 'bg-blue-700/50' : 'bg-slate-100'} px-1.5 py-0.5 rounded flex items-center gap-1`}>
            <i className={`fas fa-truck ${isActive ? 'text-blue-300' : 'text-slate-400'}`}></i> {nombreVehiculo}
          </span>
          <span className={`${isActive ? 'text-white' : 'text-blue-600'} flex items-center gap-1`}>
            <i className="fas fa-user-circle"></i> {nombreChofer}
          </span>
        </div>
      )}
    </div>
  );
};

export default PedidoCard;