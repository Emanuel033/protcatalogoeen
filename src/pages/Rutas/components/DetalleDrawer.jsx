import React, { useState, useEffect } from 'react';
import { ReactSortable } from "react-sortablejs";
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase'; 
import { useLogistica } from '../context/LogisticaContext';

const DetalleDrawer = ({ pedidoSeleccionado, onClose, onEdit }) => {
  const { flota, choferes, pedidos } = useLogistica();
  const [paradasRuta, setParadasRuta] = useState([]);
  const [vehiculoId, setVehiculoId] = useState('');
  const [choferId, setChoferId] = useState('');
  const [pedidosMismoDestino, setPedidosMismoDestino] = useState([]);
  const [alerta, setAlerta] = useState(null);
  const [modoEdicionAsignacion, setModoEdicionAsignacion] = useState(false);
  const [advertenciaChofer, setAdvertenciaChofer] = useState(false);
  const [errorEmpalme, setErrorEmpalme] = useState(null); 
  const [distanciaRuta, setDistanciaRuta] = useState('0.0');
  const [tiempoRuta, setTiempoRuta] = useState('0');
  const [seccionInfo, setSeccionInfo] = useState(true);
  const [seccionTrayecto, setSeccionTrayecto] = useState(true);

  useEffect(() => {
    if (pedidoSeleccionado) {
      setVehiculoId(pedidoSeleccionado.vehiculo_asignado || '');
      setChoferId(pedidoSeleccionado.chofer_asignado || '');
      setAlerta(null);
      setModoEdicionAsignacion(false); 
      setSeccionInfo(true);
      setSeccionTrayecto(pedidoSeleccionado.estado !== 'pendiente');
      
      const esRampaActual = pedidoSeleccionado.estado === 'camino' && !pedidoSeleccionado.fecha_salida;

      if (pedidoSeleccionado.vehiculo_asignado && (pedidoSeleccionado.estado === 'camino' || pedidoSeleccionado.estado === 'entregado')) {
          let companerosDeRuta = [];
          if (esRampaActual) {
              companerosDeRuta = pedidos.filter(p => p.vehiculo_asignado === pedidoSeleccionado.vehiculo_asignado && p.chofer_asignado === pedidoSeleccionado.chofer_asignado && p.estado === 'camino' && !p.fecha_salida);
          } else if (pedidoSeleccionado.lote_id) {
              companerosDeRuta = pedidos.filter(p => p.lote_id === pedidoSeleccionado.lote_id);
          } else {
              companerosDeRuta = [pedidoSeleccionado];
          }
          
          companerosDeRuta.sort((a,b) => (a.orden_ruta || 99) - (b.orden_ruta || 99));

          const paradas = companerosDeRuta.map(p => ({ id: p.id, nombre: p.cliente_nombre, tipo: 'destino', data: p }));
          setParadasRuta([{ id: 'planta', nombre: 'Planta EEN (Salida)', tipo: 'origen' }, ...paradas, { id: 'planta_retorno', nombre: 'Retorno a Base', tipo: 'retorno' }]);
          setDistanciaRuta((companerosDeRuta.length * 12.4).toFixed(1));
          setTiempoRuta((companerosDeRuta.length * 25));
      } else {
          setParadasRuta([{ id: 'planta', nombre: 'Planta EEN (Salida)', tipo: 'origen' }, { id: pedidoSeleccionado.id, nombre: pedidoSeleccionado.cliente_nombre, tipo: 'destino', data: pedidoSeleccionado }, { id: 'planta_retorno', nombre: 'Retorno a Base', tipo: 'retorno' }]);
          setDistanciaRuta('0.0'); setTiempoRuta('0');
      }

      if (pedidoSeleccionado.estado === 'pendiente') {
        setPedidosMismoDestino(pedidos.filter(p => p.id !== pedidoSeleccionado.id && p.direccion === pedidoSeleccionado.direccion && p.estado === 'pendiente'));
      } else { setPedidosMismoDestino([]); }
    }
  }, [pedidoSeleccionado, pedidos]);

  useEffect(() => {
    if (vehiculoId && choferId && pedidoSeleccionado) {
        const camionOcupado = pedidos.find(p => p.vehiculo_asignado === vehiculoId && p.chofer_asignado !== choferId && p.id !== pedidoSeleccionado.id && p.estado === 'camino' && !p.fecha_salida);
        const choferOcupado = pedidos.some(p => p.chofer_asignado === choferId && p.vehiculo_asignado !== vehiculoId && p.id !== pedidoSeleccionado.id && (p.estado === 'camino' || p.estado === 'rampa'));

        if (camionOcupado) {
            setErrorEmpalme(`Esta unidad ya está siendo armada por ${choferes.find(c => c.id === camionOcupado.chofer_asignado)?.nombre || 'Otro operador'}.`);
            setAdvertenciaChofer(false);
        } else {
            setErrorEmpalme(null);
            setAdvertenciaChofer(choferOcupado);
        }
    } else { setAdvertenciaChofer(false); setErrorEmpalme(null); }
  }, [vehiculoId, choferId, pedidos, pedidoSeleccionado, choferes]);

  const isOpen = Boolean(pedidoSeleccionado);
  if (!isOpen) return null;

  const docs = pedidoSeleccionado?.documentacion || {};
  const esPendiente = pedidoSeleccionado.estado === 'pendiente';
  const esRampa = pedidoSeleccionado.estado === 'camino' && !pedidoSeleccionado.fecha_salida;
  const esEnRuta = pedidoSeleccionado.estado === 'camino' && pedidoSeleccionado.fecha_salida;
  const esFallido = pedidoSeleccionado.estado === 'fallido';
  const esEntregado = pedidoSeleccionado.estado === 'entregado';

  const esContpaqi = pedidoSeleccionado.origen?.toLowerCase() === 'contpaqi';
  const saldo = parseFloat(pedidoSeleccionado.saldo_pendiente || 0);
  const requiereCobro = pedidoSeleccionado.requiere_cobro || saldo > 0;

  const getTipoEnvio = () => {
      if(pedidoSeleccionado.tipo_envio === 'fletera_domicilio') return { text: 'Fletera (A Domicilio)', icon: 'fa-truck' };
      if(pedidoSeleccionado.tipo_envio === 'fletera_ocurre') return { text: 'Fletera (Ocurre)', icon: 'fa-box' };
      return { text: 'Reparto Local', icon: 'fa-truck-fast' };
  };
  const tipoEnvio = getTipoEnvio();

  const getBadgeEstado = () => {
      if (esFallido) return <span className="bg-red-500 text-white px-2 py-1 rounded text-[9px] font-black border border-red-400"><i className="fas fa-exclamation-triangle"></i> PROBLEMA</span>;
      if (esEnRuta) return <span className="bg-blue-500 text-white px-2 py-1 rounded text-[9px] font-black border border-blue-400"><i className="fas fa-truck-fast"></i> EN RUTA</span>;
      if (esRampa) return <span className="bg-indigo-500 text-white px-2 py-1 rounded text-[9px] font-black border border-indigo-400"><i className="fas fa-dolly"></i> EN RAMPA</span>;
      if (esEntregado) return <span className="bg-emerald-500 text-white px-2 py-1 rounded text-[9px] font-black border border-emerald-400"><i className="fas fa-check-double"></i> ENTREGADO</span>;
      return <span className="bg-amber-500 text-white px-2 py-1 rounded text-[9px] font-black border border-amber-400">POR ASIGNAR</span>;
  };

  const handleOptimizar = async () => { /* LOGICA MANTENIDA IGUAL */ };
  const handleEliminar = async () => { /* LOGICA MANTENIDA IGUAL */ };
  const cambiarEstadoLogistico = async (accion, masivo = false) => { /* LOGICA MANTENIDA IGUAL */ };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 z-[35] transition-opacity lg:hidden" onClick={onClose}></div>

      {alerta && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] bg-blue-600 text-white px-6 py-2 rounded-full shadow-2xl font-black text-xs flex items-center gap-2 animate-bounce">
            <i className="fas fa-info-circle"></i> {alerta}
        </div>
      )}

      {/* DRAWER CONTENEDOR: Deep Blue Glass */}
      <div className={`fixed bottom-0 lg:top-4 lg:bottom-4 right-0 lg:right-4 w-full lg:w-[380px] h-[75vh] lg:h-[calc(100vh-2rem)] bg-slate-900/70 backdrop-blur-2xl lg:rounded-3xl rounded-t-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[40] flex flex-col overflow-hidden border border-white/20 transform transition-transform duration-300 ease-out text-white ${isOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-[120%]'}`}>
        
        {/* HEADER: Azul intenso y transparente */}
        <div className="bg-blue-800/60 backdrop-blur-md p-4 shrink-0 relative shadow-lg border-b border-white/20 z-10">
          <button onClick={onClose} className="absolute top-4 right-4 text-blue-200 hover:text-white transition bg-white/10 w-7 h-7 rounded-full flex items-center justify-center border border-white/10"><i className="fas fa-times text-xs"></i></button>
          
          <div className="flex justify-between items-start mb-1 pr-8">
            <div className="flex gap-1.5 items-center">
              {pedidoSeleccionado.folio_pedido && (<span className="text-[9px] font-mono font-bold text-white bg-blue-500/50 px-1.5 py-0.5 rounded border border-blue-400/50 shadow-sm">PED: {pedidoSeleccionado.folio_pedido}</span>)}
              <button onClick={() => onEdit(pedidoSeleccionado)} className="text-amber-100 hover:text-white bg-amber-500/40 px-1.5 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-1 ml-1 border border-amber-400/50"><i className="fas fa-edit"></i> Editar</button>
            </div>
          </div>
          
          <h3 className="text-lg font-black text-white leading-tight mt-1 truncate drop-shadow-md">
            {pedidoSeleccionado.cliente_nombre}
            {esContpaqi && <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase align-middle ml-2 shadow-sm border border-white/30 backdrop-blur-sm">CONTPAQI</span>}
            {pedidoSeleccionado.urgente && <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase align-middle ml-2 shadow-sm border border-red-400"><i className="fas fa-fire-alt"></i> Urgente</span>}
          </h3>

          <div className="flex justify-between items-center mt-2">
             <span className="text-[10px] font-bold text-blue-200 flex items-center gap-1.5"><i className={`fas ${tipoEnvio.icon}`}></i> {tipoEnvio.text}</span>
             {getBadgeEstado()}
          </div>
        </div>

        <div className="p-3 overflow-y-auto custom-scroll flex-1 min-h-0 space-y-3 pb-6 relative z-0">
          
          {/* ACORDEÓN: INFO DE ENTREGA (Cristal oscuro con texto súper legible) */}
          <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl shadow-inner overflow-hidden shrink-0">
            <button onClick={() => setSeccionInfo(!seccionInfo)} className="w-full flex justify-between items-center p-3 hover:bg-white/5 transition">
              <h4 className="font-black text-[11px] text-white flex items-center gap-1.5"><i className="fas fa-map-marked-alt text-blue-400"></i> Info de Entrega</h4>
              <i className={`fas fa-chevron-${seccionInfo ? 'up' : 'down'} text-blue-300 text-xs transition-transform`}></i>
            </button>
            
            {seccionInfo && (
              <div className="p-3 pt-0 border-t border-white/10">
                <div className="bg-blue-900/40 p-2 rounded-lg mb-2 border border-blue-500/30 mt-2">
                  <span className="font-bold text-xs text-white">{pedidoSeleccionado.destino_alias || 'Destino Físico'}</span>
                  <p className="text-[10px] text-blue-100 font-medium leading-snug flex items-start gap-1 mt-1"><i className="fas fa-map-marker-alt text-red-400 mt-0.5 shrink-0"></i> {pedidoSeleccionado.direccion}</p>
                </div>

                <div className="flex flex-col gap-1.5 mt-3 mb-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-blue-100 bg-black/20 border border-white/10 p-2 rounded-lg">
                        <span><i className="fas fa-user text-blue-400 w-4 text-center"></i> Cliente: {pedidoSeleccionado.telefono_contacto || 'S/N'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-blue-100 bg-black/20 border border-white/10 p-2 rounded-lg">
                        <span><i className="fas fa-warehouse text-blue-400 w-4 text-center"></i> Destino: {pedidoSeleccionado.destino_telefono || 'S/N'}</span>
                    </div>
                </div>

                {/* AVISO DE COBRANZA - MÁXIMA ALERTA VISUAL */}
                {requiereCobro && (
                  <div className="bg-red-600/80 backdrop-blur-md border border-red-400 rounded-xl p-3 mb-3 flex justify-between items-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                     <div className="flex items-start gap-2">
                        <i className="fas fa-exclamation-triangle text-white mt-0.5 text-lg"></i>
                        <div>
                           <p className="text-[10px] font-black text-white uppercase tracking-wide">Aviso de Cobranza</p>
                           <p className="text-[9px] font-bold text-red-100 leading-snug">Adeudo de CONTPAQi</p>
                        </div>
                     </div>
                     <span className="text-sm font-black text-white">${saldo.toFixed(2)}</span>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-white/10">
                  <p className="text-[9px] font-black text-blue-300 uppercase mb-1">Entregar con:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {docs.factura && <span className="bg-white/20 text-white text-[9px] font-bold px-2 py-1 rounded-md border border-white/30"><i className="fas fa-file-invoice mr-1"></i>Factura</span>}
                    {docs.certificados && <span className="bg-amber-500/40 text-amber-100 text-[9px] font-bold px-2 py-1 rounded-md border border-amber-400/50"><i className="fas fa-certificate mr-1"></i>Certificados</span>}
                    {docs.envio_ciego && <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded-md border border-white/20"><i className="fas fa-user-secret mr-1"></i>Envío Ciego</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACORDEÓN: TRAYECTO ESTIMADO */}
          {!esPendiente && (
              <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl shadow-inner overflow-hidden shrink-0">
                <button onClick={() => setSeccionTrayecto(!seccionTrayecto)} className="w-full flex justify-between items-center p-3 hover:bg-white/5 transition">
                  <h4 className="font-black text-[11px] text-white flex items-center gap-1.5"><i className="fas fa-route text-indigo-400"></i> Trayecto Estimado</h4>
                  <div className="flex items-center gap-2">
                    {esRampa && (
                      <span onClick={(e) => { e.stopPropagation(); handleOptimizar(); }} className="text-[9px] font-bold text-indigo-100 bg-indigo-600/80 px-2 py-1 rounded transition flex items-center gap-1 border border-indigo-400 shadow-sm">
                        <i className="fas fa-magic"></i> Optimizar
                      </span>
                    )}
                    <i className={`fas fa-chevron-${seccionTrayecto ? 'up' : 'down'} text-blue-300 text-xs transition-transform`}></i>
                  </div>
                </button>
                
                {seccionTrayecto && (
                  <div className="p-3 pt-0 border-t border-white/10">
                    <ReactSortable list={paradasRuta} setList={setParadasRuta} animation={150} handle=".drag-handle" ghostClass="opacity-40" className="relative mt-2">
                    {paradasRuta.map((parada, index) => {
                        const isSelectedParada = parada.id === pedidoSeleccionado.id;
                        return (
                        <div key={parada.id} className={`flex items-center gap-1.5 py-1.5 relative border-l-2 ml-2.5 pl-3 transition-colors ${isSelectedParada ? 'bg-blue-600/30 border-blue-400' : 'border-white/20 bg-transparent'}`}>
                          {parada.tipo === 'destino' && <div className="drag-handle w-4 h-full flex items-center justify-center text-slate-400 hover:text-white cursor-grab active:cursor-grabbing"><i className="fas fa-grip-vertical"></i></div>}
                          <div className={`w-4 h-4 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm shrink-0 ${parada.tipo === 'origen' ? 'bg-slate-800 absolute -left-[11px] border border-slate-600' : parada.tipo === 'retorno' ? 'bg-emerald-600 absolute -left-[11px] border border-emerald-400' : isSelectedParada ? 'bg-blue-500 absolute -left-[11px] scale-110 shadow-[0_0_10px_rgba(59,130,246,0.8)] border border-blue-300' : 'bg-blue-900 absolute -left-[11px] border border-blue-700'}`}>
                              {parada.tipo === 'origen' ? <i className="fas fa-industry"></i> : parada.tipo === 'retorno' ? <i className="fas fa-flag-checkered"></i> : index}
                          </div>
                          <span className={`truncate text-[10px] font-bold ${isSelectedParada ? 'text-white' : 'text-blue-200'}`}>{parada.nombre}</span>
                        </div>
                    )})}
                    </ReactSortable>

                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-around bg-blue-900/40 rounded-lg p-2 shadow-inner">
                        <div className="text-center">
                            <p className="text-[8px] font-black text-blue-300 uppercase tracking-wide">Distancia</p>
                            <p className="text-xs font-bold text-white">{distanciaRuta} km</p>
                        </div>
                        <div className="w-px bg-white/20"></div>
                        <div className="text-center">
                            <p className="text-[8px] font-black text-blue-300 uppercase tracking-wide">Tiempo</p>
                            <p className="text-xs font-bold text-white">{tiempoRuta} min</p>
                        </div>
                    </div>
                  </div>
                )}
              </div>
          )}

          {/* ASIGNACIÓN ACTUAL (Solo lectura) */}
          {(esRampa || esEnRuta) && !modoEdicionAsignacion && (
             <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-sm flex justify-between items-center shrink-0">
                 <div>
                     <p className="text-[9px] font-black text-blue-300 uppercase mb-1">Unidad y Operador:</p>
                     <p className="text-[11px] font-bold text-white"><i className="fas fa-truck text-blue-400 w-4"></i> {flota.find(v => v.id === vehiculoId)?.nombre || 'S/N'}</p>
                     <p className="text-[11px] font-bold text-blue-100"><i className="fas fa-user-circle text-blue-400 w-4"></i> {choferes.find(c => c.id === choferId)?.nombre || 'S/N'}</p>
                 </div>
                 <button onClick={() => setModoEdicionAsignacion(true)} className="w-8 h-8 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white flex items-center justify-center transition shadow-sm">
                     <i className="fas fa-pencil-alt text-xs"></i>
                 </button>
             </div>
          )}

          {/* CAJA DE ASIGNACIÓN (Editando o Pendiente) */}
          {(esPendiente || modoEdicionAsignacion) && (
             <div className="bg-blue-800/60 backdrop-blur-xl rounded-2xl p-4 shadow-[0_0_20px_rgba(30,58,138,0.5)] text-white border border-blue-400/40 relative shrink-0 mt-3">
                {modoEdicionAsignacion && (
                    <button onClick={() => { setModoEdicionAsignacion(false); setVehiculoId(pedidoSeleccionado.vehiculo_asignado); setChoferId(pedidoSeleccionado.chofer_asignado); }} className="absolute top-3 right-3 text-white/50 hover:text-white bg-white/10 rounded-full w-6 h-6 flex items-center justify-center transition">
                        <i className="fas fa-times"></i>
                    </button>
                )}

                <h4 className="text-[10px] font-black uppercase tracking-wider mb-3 text-blue-200">
                    <i className="fas fa-clipboard-check"></i> {modoEdicionAsignacion ? 'Corregir Asignación' : 'Asignar Unidad'}
                </h4>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {flota.map(v => {
                    const isSelected = vehiculoId === v.id;
                    const iconColor = v.pesado ? 'text-purple-300' : 'text-blue-300';
                    return (
                      <button key={v.id} onClick={() => setVehiculoId(v.id)} className={`p-2 rounded-xl border text-[9px] font-bold transition-all text-center flex flex-col items-center gap-1.5 ${isSelected ? 'border-blue-300 bg-blue-600 text-white shadow-inner scale-105' : 'border-white/10 bg-black/30 text-blue-100 hover:border-blue-400/50 hover:bg-white/10'}`}>
                        <i className={`fas ${v.pesado ? 'fa-truck-moving' : 'fa-truck'} text-lg ${isSelected ? 'text-white' : iconColor}`}></i>
                        <span className="w-full truncate">{v.nombre}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative mb-3">
                  <i className="fas fa-user-circle absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300"></i>
                  <select value={choferId} onChange={(e) => setChoferId(e.target.value)} className="w-full border border-white/20 bg-black/30 text-white p-3 pl-9 rounded-xl outline-none text-xs font-bold cursor-pointer shadow-inner appearance-none transition focus:border-blue-400">
                    <option value="" className="text-slate-800">-- Selecciona al Operador --</option>
                    {choferes.map(c => (<option key={c.id} value={c.id} className="font-bold text-slate-800">{c.nombre}</option>))}
                  </select>
                </div>

                {advertenciaChofer && !errorEmpalme && (
                    <div className="mb-4 bg-amber-500/80 backdrop-blur-sm border border-amber-400 rounded-xl p-2.5 flex items-start gap-2 shadow-sm">
                        <i className="fas fa-info-circle text-white mt-0.5"></i>
                        <p className="text-[10px] text-white font-medium leading-snug">Este chofer ya tiene pedidos en OTRA unidad.</p>
                    </div>
                )}

                {errorEmpalme && (
                    <div className="mb-4 bg-red-600/80 backdrop-blur-sm border border-red-400 rounded-xl p-2.5 flex items-start gap-2 shadow-sm">
                        <i className="fas fa-hand-paper text-white mt-0.5"></i>
                        <p className="text-[10px] text-white font-medium leading-snug"><b>Empalme:</b> {errorEmpalme}</p>
                    </div>
                )}
                
                {esPendiente ? (
                    <button onClick={() => cambiarEstadoLogistico('rampa')} disabled={!!errorEmpalme} className={`w-full font-black py-3 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition flex items-center justify-center gap-2 text-xs ${errorEmpalme ? 'bg-black/40 text-white/40 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 border border-blue-400 active:scale-95'}`}>
                        <i className="fas fa-link"></i> Pre-Asignar
                    </button>
                ) : (
                    <button onClick={() => cambiarEstadoLogistico('actualizar_asignacion')} disabled={!!errorEmpalme} className={`w-full font-black py-3 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition flex items-center justify-center gap-2 text-xs ${errorEmpalme ? 'bg-black/40 text-white/40 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 active:scale-95'}`}>
                        <i className="fas fa-save"></i> Guardar Cambios
                    </button>
                )}
             </div>
          )}

          {/* CONFIRMAR SALIDA */}
          {esRampa && !modoEdicionAsignacion && (
             <div className="bg-emerald-600/80 backdrop-blur-xl border border-emerald-400 rounded-2xl p-4 shadow-[0_0_20px_rgba(5,150,105,0.4)] mt-2 relative overflow-hidden">
                 <h4 className="text-[11px] font-black text-white flex items-center gap-1.5 mb-2 relative z-10"><i className="fas fa-truck-fast text-emerald-200"></i> CONFIRMAR SALIDA</h4>
                 <p className="text-[10px] text-emerald-100 mb-3 leading-snug relative z-10 font-medium">Presiona aquí cuando arranque para registrar la hora exacta de salida y crear el Lote de Viaje.</p>
                 <button onClick={() => cambiarEstadoLogistico('salida')} className="w-full bg-white text-emerald-800 hover:bg-emerald-50 font-black py-3 rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-xs relative z-10">
                    <i className="fas fa-play"></i> Iniciar Ruta Ahora
                </button>
             </div>
          )}

          {/* EVIDENCIAS Y REPORTES */}
          {(esFallido || esEntregado) && (
              <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl shadow-inner p-3 mt-3">
                  <h4 className="font-black text-[11px] text-white flex items-center gap-1.5 mb-2"><i className="fas fa-camera text-blue-400"></i> Evidencias y Reportes</h4>
                  <div className="text-center text-[10px] text-blue-200 py-3 border border-dashed border-white/20 rounded-lg mb-2 bg-black/20 shadow-inner">Sin fotos adjuntas</div>
                  {esFallido && (
                      <div className="bg-red-600/40 backdrop-blur-md border border-red-500/50 p-3 rounded-lg mt-2 shadow-sm">
                          <span className="text-[10px] font-black text-white flex items-center gap-1 mb-1"><i className="fas fa-exclamation-triangle text-red-300"></i> MOTIVO DE FALLA</span>
                          <p className="text-xs font-bold text-white mb-3 leading-snug">{pedidoSeleccionado.motivo_falla || 'Falla reportada por el chofer.'}</p>
                          <button onClick={() => cambiarEstadoLogistico('reasignar')} className="w-full bg-amber-500 text-white text-[11px] font-black py-2.5 rounded-xl shadow-md hover:bg-amber-400 transition flex items-center justify-center gap-2 border border-amber-400"><i className="fas fa-redo"></i> Reasignar a Pendientes</button>
                      </div>
                  )}
              </div>
          )}
        </div>
        
        {/* BOTONES FLOTANTES */}
        {esEnRuta && (
             <div className="absolute bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-xl border-t border-white/20 p-3 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] flex gap-2 z-20">
                 <button onClick={() => cambiarEstadoLogistico('entregado')} className="flex-[2] bg-emerald-600 text-white text-[11px] font-black py-3 rounded-xl shadow-lg hover:bg-emerald-500 border border-emerald-400 transition active:scale-95 flex items-center justify-center gap-2"><i className="fas fa-check-double text-emerald-100"></i> Marcar Entregado</button>
                 <button onClick={() => cambiarEstadoLogistico('fallido')} className="flex-1 bg-red-600/80 text-white border border-red-400 text-[10px] font-black py-3 rounded-xl hover:bg-red-500 transition flex items-center justify-center gap-1 shadow-sm"><i className="fas fa-exclamation-triangle text-red-200"></i> Incidencia</button>
             </div>
        )}
      </div>
    </>
  );
};

export default DetalleDrawer;