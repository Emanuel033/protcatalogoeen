import React from 'react';
import { useLogistica } from '../context/LogisticaContext';

const PedidoCard = ({ pedido, isActive, onClick }) => {
  const { flota, choferes } = useLogistica(); 

  const esPendiente = pedido.estado === 'pendiente';
  const esFallido = pedido.estado === 'fallido';
  const esEntregado = pedido.estado === 'entregado';
  const esRampa = pedido.estado === 'camino' && !pedido.fecha_salida;
  const esEnRuta = pedido.estado === 'camino' && pedido.fecha_salida;

  const esContpaqi = pedido.origen?.toLowerCase() === 'contpaqi';
  const saldo = parseFloat(pedido.saldo_pendiente || 0);
  const requiereCobro = pedido.requiere_cobro || saldo > 0;

  // --- SOLO CAMBIOS VISUALES (CRISTAL) ---
  const fondoTarjeta = isActive 
    ? 'bg-blue-600/20 backdrop-blur-2xl border-blue-400/50 shadow-[0_15px_30px_rgba(30,144,255,0.2)] scale-[1.02] z-10' 
    : 'bg-white/5 backdrop-blur-md border-white/10 shadow-sm hover:bg-white/10 hover:border-white/30';
    
  // Ajuste de colores para legibilidad sobre cristal (Colores de tu prompt anterior)
  const textoPrincipal = isActive ? 'text-[#001A3D]' : 'text-[#1A202C]';
  const textoSecundario = isActive ? 'text-[#003366]' : 'text-slate-600';
  const textoFolio = isActive ? 'text-blue-800/40' : 'text-slate-400';
  const iconoRojo = isActive ? 'text-red-600' : 'text-red-500';

  const nombreChofer = choferes.find(c => c.id === pedido.chofer_asignado)?.nombre || 'Chofer';
  const nombreVehiculo = flota.find(f => f.id === pedido.vehiculo_asignado)?.nombre || 'Unidad';

  return (
    <div 
      onClick={onClick}
      className={`relative p-4 rounded-3xl transition-all duration-500 cursor-pointer border ${fondoTarjeta}`}
    >
      {/* Badge lateral sutil para indicar estado visualmente */}
      <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full opacity-50 ${
        esFallido ? 'bg-red-500' : esEntregado ? 'bg-emerald-500' : esEnRuta ? 'bg-blue-500' : 'bg-slate-400'
      }`} />

      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-1.5 items-center">
            {/* Mantengo tus condicionales de iconos y textos originales */}
            {esFallido && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase"><i className="fas fa-exclamation-triangle"></i> Problema</span>}
            {esPendiente && <span className={`${isActive ? 'bg-slate-900 text-white' : 'bg-slate-800 text-white'} px-2 py-0.5 rounded-full text-[9px] font-black uppercase transition-colors`}><i className="fas fa-clock"></i> Por Asignar</span>}
            {esRampa && <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase"><i className="fas fa-dolly"></i> En Rampa</span>}
            {esEnRuta && <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase"><i className="fas fa-truck-fast"></i> En Ruta</span>}
            {esEntregado && <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase"><i className="fas fa-check-double"></i> Entregado</span>}
        </div>
        <span className={`text-[10px] font-mono font-bold tracking-tighter ${textoFolio}`}>{pedido.folio_pedido || 'S/N'}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center mb-1 pr-2">
        <h4 className={`font-black text-[15px] leading-tight truncate transition-colors drop-shadow-sm ${textoPrincipal}`}>
          {pedido.cliente_nombre}
        </h4>
        {esContpaqi && <span className="bg-slate-700/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase shadow-sm">CONTPAQI</span>}
        {requiereCobro && <span className="bg-red-500 text-white border border-red-400/50 px-1.5 py-0.5 rounded text-[7px] font-black uppercase shadow-sm"><i className="fas fa-exclamation-circle"></i> Adeudo</span>}
        {pedido.urgente && <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase shadow-sm animate-pulse"><i className="fas fa-fire-alt"></i> Urgente</span>}
      </div>
      
      <p className={`text-[11px] font-bold leading-snug flex items-start gap-1 transition-colors ${textoSecundario}`}>
        <i className={`fas fa-map-marker-alt mt-0.5 shrink-0 ${iconoRojo}`}></i> 
        <span className="line-clamp-2 italic">{pedido.direccion}</span>
      </p>

      {(pedido.vehiculo_asignado && !esPendiente) && (
        <div className={`mt-3 pt-2 border-t flex justify-between items-center text-[9px] font-black ${isActive ? 'border-blue-400/30 text-blue-900' : 'border-white/10 text-slate-500'}`}>
          <span className={`${isActive ? 'bg-blue-900/10' : 'bg-white/20'} px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm border ${isActive ? 'border-blue-400/20' : 'border-white/10'}`}>
            <i className={`fas fa-truck ${isActive ? 'text-blue-700' : 'text-slate-400'}`}></i> {nombreVehiculo}
          </span>
          <span className={`${isActive ? 'text-blue-900' : 'text-blue-700/70'} flex items-center gap-1`}>
            <i className="fas fa-user-circle"></i> {nombreChofer}
          </span>
        </div>
      )}
    </div>
  );
};

export default PedidoCard;
