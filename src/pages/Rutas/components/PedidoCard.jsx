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

  const getTipoEnvio = () => {
    if(pedido.tipo_envio === 'fletera_domicilio') return { text: 'Fletera (A Dom)', icon: 'fa-truck' };
    if(pedido.tipo_envio === 'fletera_ocurre') return { text: 'Fletera (Ocurre)', icon: 'fa-box' };
    return { text: 'Reparto Local', icon: 'fa-truck-fast' };
  };
  const tipoEnvio = getTipoEnvio();
  const aliasDestino = pedido.destino_alias || 'Destino Físico';

  // --- FORMATEADOR DE FECHAS ROBUSTO (Maneja Timestamps de Firebase y Strings de N8N) ---
  const formatearFecha = (fechaRaw) => {
    if (!fechaRaw) return null;
    try {
        let d;
        if (fechaRaw.toDate) {
            d = fechaRaw.toDate(); // Es Timestamp de Firebase
        } else {
            d = new Date(fechaRaw); // Es String ISO
        }
        if (isNaN(d.getTime())) return null;

        return d.toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        }).replace(',', ' a las');
    } catch (e) {
        return null;
    }
  };

  // --- 1. CRISTAL ESMERILADO (FROSTED GLASS) ---
  const fondoTarjeta = isActive 
    ? 'bg-blue-50/60 backdrop-blur-xl border-blue-300/50 shadow-[0_8px_30px_rgba(59,130,246,0.15),inset_0_0_20px_rgba(255,255,255,0.7)] md:scale-[1.02] z-10 transform-gpu' 
    : 'bg-white/40 backdrop-blur-lg border-white/50 shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white/50 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] transform-gpu';
    
  // --- 2. COLORES DE TIPOGRAFÍA FLUIDOS ---
  const textoPrincipal = isActive ? 'text-slate-900' : 'text-slate-800';
  const textoSecundario = isActive ? 'text-blue-900/80' : 'text-slate-500';
  const textoFolio = isActive ? 'text-blue-700' : 'text-slate-400';
  const iconoRojo = isActive ? 'text-red-500' : 'text-red-400/80';

  // --- 3. EFECTO "SUMIDO/GRABADO" PARA BADGES ---
  const badgeBase = "px-2 py-0.5 rounded-[6px] text-[9px] font-black uppercase tracking-wide shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)] border transition-all duration-300 flex items-center gap-1";
  
  const getBadgeEstado = () => {
    if (esFallido) return <span className={`${badgeBase} ${isActive ? 'bg-red-500/20 text-red-800 border-red-500/30' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}><i className="fas fa-exclamation-triangle"></i> Problema</span>;
    if (esPendiente) return <span className={`${badgeBase} ${isActive ? 'bg-slate-400/30 text-slate-800 border-slate-400/30' : 'bg-slate-300/40 text-slate-600 border-slate-300/30'}`}><i className="fas fa-clock"></i> Por Asignar</span>;
    if (esRampa) return <span className={`${badgeBase} ${isActive ? 'bg-indigo-500/20 text-indigo-800 border-indigo-500/30' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'}`}><i className="fas fa-dolly"></i> En Rampa</span>;
    if (esEnRuta) return <span className={`${badgeBase} ${isActive ? 'bg-blue-500/20 text-blue-900 border-blue-500/30' : 'bg-blue-500/10 text-blue-700 border-blue-500/20'}`}><i className="fas fa-truck-fast"></i> En Ruta</span>;
    if (esEntregado) return <span className={`${badgeBase} ${isActive ? 'bg-emerald-500/20 text-emerald-900 border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'}`}><i className="fas fa-check-double"></i> Entregado</span>;
    return null;
  };

  const nombreChofer = choferes.find(c => c.id === pedido.chofer_asignado)?.nombre || 'Sin Operador';
  const nombreVehiculo = flota.find(f => f.id === pedido.vehiculo_asignado)?.nombre || 'Sin Unidad';

  return (
    <div 
      onClick={onClick}
      className={`relative p-4 rounded-2xl transition-all duration-300 cursor-pointer border ${fondoTarjeta}`}
    >
      {/* ENCABEZADO: ESTADO Y FOLIOS */}
      <div className="flex justify-between items-start mb-2">
        {getBadgeEstado()}
        <div className="flex flex-col items-end text-right">
            <span className={`text-[10px] font-mono font-black transition-colors duration-300 ${textoFolio}`}>
              {pedido.folio_pedido ? `PED: ${pedido.folio_pedido}` : 'S/N'}
            </span>
            {pedido.folio_factura && (
              <span className={`text-[8.5px] font-mono font-bold transition-colors duration-300 mt-0.5 ${isActive ? 'text-blue-900/60' : 'text-slate-400'}`}>
                FAC: {pedido.folio_factura}
              </span>
            )}
        </div>
      </div>

      {/* NOMBRE DEL CLIENTE Y BADGES EXTRA (CONTPAQI / ADEUDO / URGENTE) */}
      <div className="flex flex-wrap gap-1.5 items-center mb-2 pr-2">
        <h4 className={`font-black text-sm leading-tight truncate transition-colors duration-300 ${textoPrincipal}`}>
          {pedido.cliente_nombre}
        </h4>
        
        {/* Badges sumidas pequeñas */}
        {esContpaqi && (
          <span className={`px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] border transition-all duration-300 ${isActive ? 'bg-slate-300/50 text-slate-800 border-slate-400/30' : 'bg-slate-200/50 text-slate-500 border-slate-300/30'}`}>
            CONTPAQI
          </span>
        )}
        {requiereCobro && (
          <span className={`px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] border flex items-center gap-1 transition-all duration-300 ${isActive ? 'bg-red-200/60 text-red-800 border-red-300/40' : 'bg-red-100/60 text-red-600 border-red-200/50'}`}>
            <i className="fas fa-exclamation-circle"></i> Adeudo
          </span>
        )}
        {pedido.urgente && (
          <span className={`px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] border flex items-center gap-1 transition-all duration-300 ${isActive ? 'bg-orange-200/60 text-orange-800 border-orange-300/40' : 'bg-orange-100/60 text-orange-600 border-orange-200/50'}`}>
            <i className="fas fa-fire-alt"></i> Urgente
          </span>
        )}
      </div>
      
      {/* RENGLÓN: TIPO DE ENVÍO Y ALIAS (CON EFECTO GRABADO) */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-1.5 py-0.5 rounded-[5px] text-[8px] font-black uppercase flex items-center gap-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] border transition-all duration-300 ${isActive ? 'bg-blue-200/60 text-blue-900 border-blue-300/40' : 'bg-blue-100/50 text-blue-700 border-blue-200/40'}`}>
          <i className={`fas ${tipoEnvio.icon}`}></i> {tipoEnvio.text}
        </span>
        <span className={`text-[9px] font-bold uppercase truncate flex items-center gap-1 transition-colors duration-300 ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
          <i className="fas fa-tag opacity-60"></i> {aliasDestino}
        </span>
      </div>

      {/* HISTORIAL DE FECHAS (CREACIÓN / SALIDA) */}
      <div className="flex flex-col gap-0.5 mb-2 mt-1">
        <span className={`text-[8.5px] font-medium flex items-center gap-1.5 transition-colors duration-300 ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
            <i className="fas fa-calendar-plus opacity-70"></i> 
            Creado: {formatearFecha(pedido.fecha_creacion) || 'Manual (Fecha no registrada)'}
        </span>
        {(esEnRuta || esEntregado) && pedido.fecha_salida && (
            <span className={`text-[8.5px] font-medium flex items-center gap-1.5 transition-colors duration-300 ${isActive ? 'text-blue-700' : 'text-blue-500'}`}>
                <i className="fas fa-flag-checkered opacity-70"></i> 
                Salió a ruta: {formatearFecha(pedido.fecha_salida)}
            </span>
        )}
      </div>

      {/* DIRECCIÓN */}
      <p className={`text-[10px] font-medium leading-snug flex items-start gap-1 transition-colors duration-300 ${textoSecundario}`}>
        <i className={`fas fa-map-marker-alt mt-0.5 shrink-0 transition-colors duration-300 ${iconoRojo}`}></i> 
        <span className="truncate">{pedido.direccion}</span>
      </p>

      {/* FOOTER: CHOFER Y VEHÍCULO (GRABADO EN EL CRISTAL) */}
      {(pedido.vehiculo_asignado && !esPendiente) && (
        <div className={`mt-3 pt-2 border-t flex justify-between items-center text-[9px] font-bold transition-colors duration-300 ${isActive ? 'border-blue-300/40' : 'border-slate-200/60'}`}>
          <span className={`px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] border transition-all duration-300 ${isActive ? 'bg-white/50 text-blue-900 border-white/60' : 'bg-slate-100/50 text-slate-500 border-slate-200/50'}`}>
            <i className={`fas fa-truck ${isActive ? 'text-blue-600' : 'text-slate-400'}`}></i> {nombreVehiculo}
          </span>
          <span className={`flex items-center gap-1 transition-colors duration-300 ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
            <i className={`fas fa-user-circle ${isActive ? 'text-blue-500' : 'text-slate-300'}`}></i> {nombreChofer}
          </span>
        </div>
      )}
    </div>
  );
};

export default PedidoCard;
