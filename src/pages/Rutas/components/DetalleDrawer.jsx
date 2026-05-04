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

 useEffect(() => {
    if (pedidoSeleccionado) {
      setVehiculoId(pedidoSeleccionado.vehiculo_asignado || '');
      setChoferId(pedidoSeleccionado.chofer_asignado || '');
      setAlerta(null);
      
      // AQUÍ AGREGAMOS EL "RETORNO A BASE"
      setParadasRuta([
        { id: 'planta', nombre: 'Planta EEN (Salida)', tipo: 'origen' },
        { id: pedidoSeleccionado.id, nombre: pedidoSeleccionado.cliente_nombre, tipo: 'destino', data: pedidoSeleccionado },
        { id: 'planta_retorno', nombre: 'Retorno a Base', tipo: 'retorno' } 
      ]);

      if (pedidoSeleccionado.estado === 'pendiente') {
        const mismoDestino = pedidos.filter(p => p.id !== pedidoSeleccionado.id && p.direccion === pedidoSeleccionado.direccion && p.estado === 'pendiente');
        setPedidosMismoDestino(mismoDestino);
      } else {
        setPedidosMismoDestino([]);
      }
    }
  }, [pedidoSeleccionado, pedidos]);

  const isOpen = Boolean(pedidoSeleccionado);
  if (!isOpen) return null;

  const docs = pedidoSeleccionado?.documentacion || {};
  const esPendiente = pedidoSeleccionado.estado === 'pendiente';
  const esRampa = pedidoSeleccionado.estado === 'camino' && !pedidoSeleccionado.fecha_salida;
  const esEnRuta = pedidoSeleccionado.estado === 'camino' && pedidoSeleccionado.fecha_salida;
  const esFallido = pedidoSeleccionado.estado === 'fallido';
  const esEntregado = pedidoSeleccionado.estado === 'entregado';

  const getTipoEnvio = () => {
      if(pedidoSeleccionado.tipo_envio === 'fletera_domicilio') return { text: 'Fletera (A Domicilio)', icon: 'fa-truck' };
      if(pedidoSeleccionado.tipo_envio === 'fletera_ocurre') return { text: 'Fletera (Ocurre)', icon: 'fa-box' };
      return { text: 'Reparto Local', icon: 'fa-truck-fast' };
  };
  const tipoEnvio = getTipoEnvio();

  const getBadgeEstado = () => {
      if (esFallido) return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[9px] font-black border border-red-200"><i className="fas fa-exclamation-triangle"></i> PROBLEMA</span>;
      if (esEnRuta) return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[9px] font-black border border-blue-200"><i className="fas fa-truck-fast"></i> EN RUTA</span>;
      if (esRampa) return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[9px] font-black border border-amber-200"><i className="fas fa-dolly"></i> EN RAMPA</span>;
      if (esEntregado) return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[9px] font-black border border-emerald-200"><i className="fas fa-check-double"></i> ENTREGADO</span>;
      return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[9px] font-black border border-amber-200">POR ASIGNAR</span>;
  };

  const handleEliminar = async () => {
    if (window.confirm("¿Estás seguro de eliminar esta orden? Esta acción no se puede deshacer.")) {
        try {
            await deleteDoc(doc(db, 'rutas_logistica', pedidoSeleccionado.id));
            onClose();
        } catch (e) {
            console.error(e);
            alert("Error al eliminar el pedido.");
        }
    }
  };

  const cambiarEstadoLogistico = async (accion, masivo = false) => {
    try {
        let payload = { fecha_actualizacion: serverTimestamp() };
        
        if (accion === 'rampa') {
            if (!vehiculoId) return setAlerta("Falta seleccionar el vehículo");
            if (!choferId) return setAlerta("Falta seleccionar el operador");
            
            payload.estado = 'camino';
            payload.fecha_salida = null; 
            payload.vehiculo_asignado = vehiculoId;
            payload.chofer_asignado = choferId;

            const idsAProcesar = masivo ? [pedidoSeleccionado.id, ...pedidosMismoDestino.map(p => p.id)] : [pedidoSeleccionado.id];
            
            for (const id of idsAProcesar) {
                await updateDoc(doc(db, 'rutas_logistica', id), payload);
            }
            return onClose();
        } 
        
        else if (accion === 'salida') {
            payload.estado = 'camino';
            payload.fecha_salida = serverTimestamp(); 
        } else if (accion === 'entregado') {
            payload.estado = 'entregado';
            payload.fecha_entrega = serverTimestamp();
        } else if (accion === 'fallido') {
            payload.estado = 'fallido';
        } else if (accion === 'reasignar') {
            payload.estado = 'pendiente';
            payload.vehiculo_asignado = null;
            payload.chofer_asignado = null;
            payload.fecha_salida = null;
        }

        await updateDoc(doc(db, 'rutas_logistica', pedidoSeleccionado.id), payload);
        if(accion === 'entregado' || accion === 'reasignar') onClose(); 
    } catch (e) {
        console.error("Error al actualizar estado:", e);
        alert("Hubo un error al cambiar el estado del pedido.");
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 z-[35] transition-opacity lg:hidden" onClick={onClose}></div>

      {alerta && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] bg-red-600 text-white px-6 py-2 rounded-full shadow-2xl font-black text-xs flex items-center gap-2 animate-bounce">
            <i className="fas fa-exclamation-circle"></i> {alerta}
        </div>
      )}

      <div className={`fixed bottom-0 lg:top-4 lg:bottom-4 right-0 lg:right-4 w-full lg:w-[380px] h-[75vh] lg:h-[calc(100vh-2rem)] bg-white/80 backdrop-blur-2xl lg:rounded-3xl rounded-t-3xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-[40] flex flex-col overflow-hidden border border-white/50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-[120%]'}`}>
        
        <div className="bg-slate-900/95 backdrop-blur-md p-4 shrink-0 relative shadow-md">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"><i className="fas fa-times text-xs"></i></button>
          
          <div className="flex justify-between items-start mb-1 pr-8">
            <div className="flex gap-1.5 items-center">
              {pedidoSeleccionado.folio_pedido && (<span className="text-[9px] font-mono font-bold text-blue-200 bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">PED: {pedidoSeleccionado.folio_pedido}</span>)}
              <button onClick={() => onEdit(pedidoSeleccionado)} className="text-amber-400 hover:text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-1 ml-1 cursor-pointer"><i className="fas fa-edit"></i> Editar</button>
              <button onClick={handleEliminar} className="text-red-400 hover:text-red-300 bg-red-400/10 px-1.5 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-1 ml-1 cursor-pointer"><i className="fas fa-trash"></i></button>
            </div>
          </div>
          
          <h3 className="text-lg font-black text-white leading-tight mt-1 truncate">
            {pedidoSeleccionado.cliente_nombre}
            {pedidoSeleccionado.urgente && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase align-middle ml-2"><i className="fas fa-fire-alt"></i> Urgente</span>}
          </h3>

          <div className="flex justify-between items-center mt-2">
             <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><i className={`fas ${tipoEnvio.icon}`}></i> {tipoEnvio.text}</span>
             {getBadgeEstado()}
          </div>
        </div>

        <div className="p-3 overflow-y-auto custom-scroll flex-1 space-y-3 pb-6">
          
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
            <h4 className="font-black text-[11px] text-slate-800 flex items-center gap-1.5 mb-3"><i className="fas fa-map-marked-alt text-blue-500"></i> Info de Entrega</h4>
            
            <div className="bg-slate-50 p-2 rounded-lg mb-2 border border-slate-100">
              <span className="font-bold text-xs text-slate-800">{pedidoSeleccionado.destino_alias || 'Destino Físico'}</span>
              <p className="text-[10px] text-slate-600 font-medium leading-snug flex items-start gap-1 mt-1"><i className="fas fa-map-marker-alt text-red-500 mt-0.5 shrink-0"></i> {pedidoSeleccionado.direccion}</p>
            </div>

            <div className="flex flex-col gap-1.5 mt-3 mb-3">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 bg-white border border-slate-200 p-2 rounded-lg">
                    <span><i className="fas fa-user text-slate-400 w-4 text-center"></i> Cliente: {pedidoSeleccionado.telefono_contacto || 'S/N'}</span>
                    <button className="text-blue-500 hover:text-blue-700 transition"><i className="fas fa-phone"></i></button>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 bg-white border border-slate-200 p-2 rounded-lg">
                    <span><i className="fas fa-warehouse text-slate-400 w-4 text-center"></i> Destino: {pedidoSeleccionado.destino_telefono || 'S/N'}</span>
                    <button className="text-blue-500 hover:text-blue-700 transition"><i className="fas fa-phone"></i></button>
                </div>
            </div>

            {pedidoSeleccionado.requiere_cobro && (
              <div className="mt-2 bg-red-50 border border-red-200 p-2.5 rounded-lg flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center animate-pulse"><i className="fas fa-exclamation-triangle text-xs"></i></div>
                  <div className="flex flex-col"><span className="text-[10px] font-black text-red-700 uppercase tracking-wide">Aviso de Cobranza</span><span className="text-[8px] text-red-600 font-medium">Adeudo reportado</span></div>
                </div>
                <span className="text-sm font-black text-red-800">${Number(pedidoSeleccionado.saldo_pendiente || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Entregar con:</p>
              <div className="flex flex-wrap gap-1.5">
                {docs.factura && <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-1 rounded-md border border-blue-200"><i className="fas fa-file-invoice mr-1"></i>Factura</span>}
                {docs.certificados && <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-1 rounded-md border border-amber-200"><i className="fas fa-certificate mr-1"></i>Certificados</span>}
                {docs.envio_ciego && <span className="bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-md border border-slate-700 shadow-sm"><i className="fas fa-user-secret mr-1"></i>Envío Ciego</span>}
                {(!docs.factura && !docs.certificados && !docs.envio_ciego) && <span className="text-[9px] text-slate-400 font-bold">Sin requisitos especiales</span>}
              </div>
            </div>
          </div>

          {!esPendiente && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm p-3">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-black text-[11px] text-indigo-900 flex items-center gap-1.5"><i className="fas fa-route text-indigo-500"></i> Trayecto Estimado</h4>
                </div>
                <ReactSortable list={paradasRuta} setList={setParadasRuta} animation={150} handle=".drag-handle" ghostClass="opacity-40" className="relative">
                {paradasRuta.map((parada, index) => (
                    <div key={parada.id} className="flex items-center gap-1.5 py-1.5 relative border-l-2 border-slate-200 ml-2.5 pl-3 bg-indigo-50">
                    {parada.tipo === 'destino' && <div className="drag-handle w-4 h-full flex items-center justify-center text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing"><i className="fas fa-grip-vertical"></i></div>}
                   <div className={`w-4 h-4 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm shrink-0 ${parada.tipo === 'origen' ? 'bg-slate-900 absolute -left-[11px]' : parada.tipo === 'retorno' ? 'bg-emerald-500 absolute -left-[11px]' : 'bg-blue-600'}`}>
    {parada.tipo === 'origen' ? <i className="fas fa-industry"></i> : parada.tipo === 'retorno' ? <i className="fas fa-flag-checkered"></i> : index}
</div>
                    <span className="truncate text-[10px] font-bold text-slate-700">{parada.nombre}</span>
                    </div>
                ))}
                </ReactSortable>
              </div>
          )}

          {/* ASIGNAR UNIDAD (DISEÑO RESTAURADO) */}
          {esPendiente && (
             <div className="bg-slate-800 rounded-2xl p-4 shadow-xl text-white border border-slate-700">
                <h4 className="text-[10px] font-black uppercase tracking-wider mb-3 text-slate-300"><i className="fas fa-clipboard-check"></i> Asignar Unidad</h4>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {flota.map(v => {
                    const isSelected = vehiculoId === v.id;
                    const iconColor = v.pesado ? 'text-purple-400' : 'text-slate-300';
                    return (
                      <button key={v.id} onClick={() => setVehiculoId(v.id)} className={`p-2 rounded-xl border text-[9px] font-bold transition-all text-center flex flex-col items-center gap-1.5 ${isSelected ? 'border-blue-400 bg-blue-600 text-white shadow-inner' : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'}`}>
                        <i className={`fas ${v.pesado ? 'fa-truck-moving' : 'fa-truck'} text-lg ${isSelected ? 'text-white' : iconColor}`}></i>
                        <span className="w-full truncate">{v.nombre}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative mb-4">
                  <i className="fas fa-user-circle absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                  <select value={choferId} onChange={(e) => setChoferId(e.target.value)} className="w-full border-none bg-slate-700 text-white p-3 pl-9 rounded-xl outline-none text-xs font-bold cursor-pointer shadow-inner appearance-none">
                    <option value="" className="text-slate-400">-- Selecciona al Operador --</option>
                    {choferes.map(c => (<option key={c.id} value={c.id} className="font-bold">{c.nombre}</option>))}
                  </select>
                </div>
                
                <button onClick={() => cambiarEstadoLogistico('rampa')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-xs">
                    <i className="fas fa-link"></i> Pre-Asignar (En Rampa)
                </button>

                {pedidosMismoDestino.length > 0 && (
                    <button onClick={() => cambiarEstadoLogistico('rampa', true)} className="w-full mt-3 bg-amber-500 hover:bg-amber-400 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-[10px]">
                        <i className="fas fa-layer-group"></i> Asignar {pedidosMismoDestino.length + 1} pedidos a esta unidad
                    </button>
                )}
             </div>
          )}

          {/* CONFIRMAR SALIDA */}
          {esRampa && (
             <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm mt-2">
                 <h4 className="text-[11px] font-black text-emerald-800 flex items-center gap-1.5 mb-2"><i className="fas fa-truck-fast"></i> CONFIRMAR SALIDA</h4>
                 <p className="text-[10px] text-emerald-700 mb-3 leading-snug">La unidad ya tiene pedidos pre-asignados. Presiona aquí cuando arranque para registrar la hora exacta de salida.</p>
                 <button onClick={() => cambiarEstadoLogistico('salida')} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-xs">
                    <i className="fas fa-play"></i> Iniciar Ruta Ahora
                </button>
             </div>
          )}

          {(esFallido || esEntregado) && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 mt-3">
                  <h4 className="font-black text-[11px] text-slate-800 flex items-center gap-1.5 mb-2"><i className="fas fa-camera"></i> Evidencias y Reportes</h4>
                  <div className="text-center text-[10px] text-slate-400 py-3 border border-dashed border-slate-200 rounded-lg mb-2 bg-slate-50">Sin fotos adjuntas</div>
                  {esFallido && (
                      <div className="bg-red-50 p-3 rounded-lg border border-red-100 mt-2">
                          <span className="text-[10px] font-black text-red-700 flex items-center gap-1 mb-1"><i className="fas fa-exclamation-triangle"></i> MOTIVO DE FALLA</span>
                          <p className="text-xs font-bold text-red-900 mb-3">{pedidoSeleccionado.motivo_falla || 'Falla en ruta reportada por el chofer:'} <br/><span className="text-red-600">{choferes.find(c => c.id === pedidoSeleccionado.chofer_asignado)?.nombre || 'S/N'}</span></p>
                          <button onClick={() => cambiarEstadoLogistico('reasignar')} className="w-full bg-amber-500 text-white text-[11px] font-black py-2.5 rounded-xl shadow-md hover:bg-amber-600 transition flex items-center justify-center gap-2"><i className="fas fa-redo"></i> Reasignar a Pendientes</button>
                      </div>
                  )}
              </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DetalleDrawer;