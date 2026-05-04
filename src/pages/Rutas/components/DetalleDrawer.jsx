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

  // NUEVO: Estados para los acordeones
  const [seccionInfo, setSeccionInfo] = useState(true);
  const [seccionTrayecto, setSeccionTrayecto] = useState(true);

  useEffect(() => {
    if (pedidoSeleccionado) {
      setVehiculoId(pedidoSeleccionado.vehiculo_asignado || '');
      setChoferId(pedidoSeleccionado.chofer_asignado || '');
      setAlerta(null);
      setModoEdicionAsignacion(false); 
      
      // Reseteamos acordeones: Info abierta siempre, trayecto abierto solo si ya tiene ruta
      setSeccionInfo(true);
      setSeccionTrayecto(pedidoSeleccionado.estado !== 'pendiente');
      
      const esRampaActual = pedidoSeleccionado.estado === 'camino' && !pedidoSeleccionado.fecha_salida;

      if (pedidoSeleccionado.vehiculo_asignado && (pedidoSeleccionado.estado === 'camino' || pedidoSeleccionado.estado === 'entregado')) {
          let companerosDeRuta = [];
          if (esRampaActual) {
              companerosDeRuta = pedidos.filter(p => 
                  p.vehiculo_asignado === pedidoSeleccionado.vehiculo_asignado && 
                  p.chofer_asignado === pedidoSeleccionado.chofer_asignado &&
                  p.estado === 'camino' && !p.fecha_salida
              );
          } else if (pedidoSeleccionado.lote_id) {
              companerosDeRuta = pedidos.filter(p => p.lote_id === pedidoSeleccionado.lote_id);
          } else {
              companerosDeRuta = [pedidoSeleccionado];
          }
          
          companerosDeRuta.sort((a,b) => (a.orden_ruta || 99) - (b.orden_ruta || 99));

          const paradas = companerosDeRuta.map(p => ({
              id: p.id, nombre: p.cliente_nombre, tipo: 'destino', data: p
          }));

          setParadasRuta([
              { id: 'planta', nombre: 'Planta EEN (Salida)', tipo: 'origen' },
              ...paradas,
              { id: 'planta_retorno', nombre: 'Retorno a Base', tipo: 'retorno' }
          ]);
          setDistanciaRuta((companerosDeRuta.length * 12.4).toFixed(1));
          setTiempoRuta((companerosDeRuta.length * 25));

      } else {
          setParadasRuta([
            { id: 'planta', nombre: 'Planta EEN (Salida)', tipo: 'origen' },
            { id: pedidoSeleccionado.id, nombre: pedidoSeleccionado.cliente_nombre, tipo: 'destino', data: pedidoSeleccionado },
            { id: 'planta_retorno', nombre: 'Retorno a Base', tipo: 'retorno' } 
          ]);
          setDistanciaRuta('0.0'); setTiempoRuta('0');
      }

      if (pedidoSeleccionado.estado === 'pendiente') {
        const mismoDestino = pedidos.filter(p => p.id !== pedidoSeleccionado.id && p.direccion === pedidoSeleccionado.direccion && p.estado === 'pendiente');
        setPedidosMismoDestino(mismoDestino);
      } else {
        setPedidosMismoDestino([]);
      }
    }
  }, [pedidoSeleccionado, pedidos]);

  useEffect(() => {
    if (vehiculoId && choferId && pedidoSeleccionado) {
        const camionOcupado = pedidos.find(p => p.vehiculo_asignado === vehiculoId && p.chofer_asignado !== choferId && p.id !== pedidoSeleccionado.id && p.estado === 'camino' && !p.fecha_salida);
        const choferOcupado = pedidos.some(p => p.chofer_asignado === choferId && p.vehiculo_asignado !== vehiculoId && p.id !== pedidoSeleccionado.id && (p.estado === 'camino' || p.estado === 'rampa'));

        if (camionOcupado) {
            const nombreOtroChofer = choferes.find(c => c.id === camionOcupado.chofer_asignado)?.nombre || 'Otro operador';
            setErrorEmpalme(`Esta unidad ya está siendo armada por ${nombreOtroChofer}.`);
            setAdvertenciaChofer(false);
        } else {
            setErrorEmpalme(null);
            setAdvertenciaChofer(choferOcupado);
        }
    } else {
        setAdvertenciaChofer(false);
        setErrorEmpalme(null);
    }
  }, [vehiculoId, choferId, pedidos, pedidoSeleccionado, choferes]);

  const isOpen = Boolean(pedidoSeleccionado);
  if (!isOpen) return null;

  const docs = pedidoSeleccionado?.documentacion || {};
  const esPendiente = pedidoSeleccionado.estado === 'pendiente';
  const esRampa = pedidoSeleccionado.estado === 'camino' && !pedidoSeleccionado.fecha_salida;
  const esEnRuta = pedidoSeleccionado.estado === 'camino' && pedidoSeleccionado.fecha_salida;
  const esFallido = pedidoSeleccionado.estado === 'fallido';
  const esEntregado = pedidoSeleccionado.estado === 'entregado';

  // Validaciones
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
      if (esFallido) return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[9px] font-black border border-red-200"><i className="fas fa-exclamation-triangle"></i> PROBLEMA</span>;
      if (esEnRuta) return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[9px] font-black border border-blue-200"><i className="fas fa-truck-fast"></i> EN RUTA</span>;
      if (esRampa) return <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[9px] font-black border border-indigo-200"><i className="fas fa-dolly"></i> EN RAMPA</span>;
      if (esEntregado) return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[9px] font-black border border-emerald-200"><i className="fas fa-check-double"></i> ENTREGADO</span>;
      return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[9px] font-black border border-amber-200">POR ASIGNAR</span>;
  };

  const handleOptimizar = async () => {
     setAlerta("Calculando la mejor ruta...");
     const PLANTA = { lat: 25.6866, lng: -100.3161 };

     const calcularDistancia = (coord1, coord2) => {
         if (!coord1 || !coord2 || isNaN(coord1.lat) || isNaN(coord2.lat)) return 9999;
         const R = 6371; 
         const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
         const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
         const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
                   Math.sin(dLon/2) * Math.sin(dLon/2);
         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
         return R * c;
     };

     const destinos = paradasRuta.filter(p => p.tipo === 'destino');
     if (destinos.length <= 1) {
         setAlerta("No hay suficientes paradas para optimizar.");
         setTimeout(() => setAlerta(null), 2000);
         return;
     }

     let urgentes = destinos.filter(p => p.data?.urgente);
     let normales = destinos.filter(p => !p.data?.urgente);

     const ordenarVecinoMasCercano = (nodos, puntoPartida) => {
         let noVisitados = [...nodos];
         let rutaOrdenada = [];
         let actual = puntoPartida;

         while (noVisitados.length > 0) {
             let indiceMasCercano = 0;
             let distanciaMinima = Infinity;
             for (let i = 0; i < noVisitados.length; i++) {
                 let dist = calcularDistancia(actual, noVisitados[i].data.coordenadas);
                 if (dist < distanciaMinima) {
                     distanciaMinima = dist;
                     indiceMasCercano = i;
                 }
             }
             let siguienteNodo = noVisitados.splice(indiceMasCercano, 1)[0];
             rutaOrdenada.push(siguienteNodo);
             actual = siguienteNodo.data.coordenadas;
         }
         return rutaOrdenada;
     };

     let rutaFinalUrgentes = ordenarVecinoMasCercano(urgentes, PLANTA);
     let ultimoPunto = rutaFinalUrgentes.length > 0 ? rutaFinalUrgentes[rutaFinalUrgentes.length - 1].data.coordenadas : PLANTA;
     let rutaFinalNormales = ordenarVecinoMasCercano(normales, ultimoPunto);
     const destinosOrdenados = [...rutaFinalUrgentes, ...rutaFinalNormales];

     try {
         for (let i = 0; i < destinosOrdenados.length; i++) {
             const parada = destinosOrdenados[i];
             await updateDoc(doc(db, 'rutas_logistica', parada.id), {
                 orden_ruta: i + 1, 
                 fecha_actualizacion: serverTimestamp()
             });
         }
         setParadasRuta([
             { id: 'planta', nombre: 'Planta EEN (Salida)', tipo: 'origen' },
             ...destinosOrdenados,
             { id: 'planta_retorno', nombre: 'Retorno a Base', tipo: 'retorno' }
         ]);
         setAlerta("¡Ruta optimizada con éxito!");
     } catch (error) {
         console.error(error);
         setAlerta("Error al guardar la optimización.");
     }
     setTimeout(() => setAlerta(null), 3000);
  };

  const handleEliminar = async () => {
    if (window.confirm("¿Estás seguro de eliminar esta orden? Esta acción no se puede deshacer.")) {
        try {
            await deleteDoc(doc(db, 'rutas_logistica', pedidoSeleccionado.id));
            onClose();
        } catch (e) { console.error(e); setAlerta("Error al eliminar el pedido."); }
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
            for (const id of idsAProcesar) { await updateDoc(doc(db, 'rutas_logistica', id), payload); }
            return onClose();
        } 
        else if (accion === 'actualizar_asignacion') {
            if (!vehiculoId || !choferId) return setAlerta("Falta seleccionar unidad u operador");
            payload.vehiculo_asignado = vehiculoId;
            payload.chofer_asignado = choferId;
            setModoEdicionAsignacion(false); 
        }
        else if (accion === 'salida') {
            const loteId = `LOTE-${Date.now()}-${vehiculoId.substring(0,4).toUpperCase()}`;
            payload.estado = 'camino';
            payload.fecha_salida = serverTimestamp(); 
            payload.lote_id = loteId; 

            const companerosEnRampa = pedidos.filter(p => 
                p.vehiculo_asignado === vehiculoId && 
                p.chofer_asignado === choferId &&
                p.estado === 'camino' && !p.fecha_salida
            );

            for (const p of companerosEnRampa) { 
                await updateDoc(doc(db, 'rutas_logistica', p.id), payload); 
            }
            return onClose();
        } 
        else if (accion === 'entregado') {
            payload.estado = 'entregado';
            payload.fecha_entrega = serverTimestamp();
        } else if (accion === 'fallido') {
            payload.estado = 'fallido';
        } else if (accion === 'reasignar') {
            payload.estado = 'pendiente';
            payload.vehiculo_asignado = null;
            payload.chofer_asignado = null;
            payload.fecha_salida = null;
            payload.motivo_falla = null; 
            payload.lote_id = null;
        }

        if (accion !== 'salida') {
            await updateDoc(doc(db, 'rutas_logistica', pedidoSeleccionado.id), payload);
        }
        
        if(accion === 'entregado' || accion === 'reasignar') onClose(); 
    } catch (e) { console.error(e); setAlerta("Error al actualizar estado."); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/10 z-[35] transition-opacity lg:hidden" onClick={onClose}></div>

      {alerta && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl font-black text-xs flex items-center gap-2 animate-bounce">
            <i className="fas fa-info-circle"></i> {alerta}
        </div>
      )}

      <div className={`fixed bottom-0 lg:top-4 lg:bottom-4 right-0 lg:right-4 w-full lg:w-[380px] h-[75vh] lg:h-[calc(100vh-2rem)] bg-white/60 backdrop-blur-2xl lg:rounded-3xl rounded-t-3xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-[40] flex flex-col overflow-hidden border border-white/50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-[120%]'}`}>
    
      {/* HEADER CON EFECTO CRISTAL AZUL */}
        <div className="bg-blue-600/90 backdrop-blur-2xl border-b border-blue-400/50 p-4 shrink-0 relative shadow-lg shadow-blue-500/20">
          <button onClick={onClose} className="absolute top-4 right-4 text-blue-200 hover:text-white transition bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"><i className="fas fa-times text-xs"></i></button>
          
          <div className="flex justify-between items-start mb-1 pr-8">
            <div className="flex gap-1.5 items-center">
              {pedidoSeleccionado.folio_pedido && (<span className="text-[9px] font-mono font-bold text-blue-900 bg-white/80 px-1.5 py-0.5 rounded border border-white/50 shadow-sm">PED: {pedidoSeleccionado.folio_pedido}</span>)}
              <button onClick={() => onEdit(pedidoSeleccionado)} className="text-amber-300 hover:text-amber-100 bg-amber-400/20 px-1.5 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-1 ml-1 cursor-pointer border border-amber-400/30"><i className="fas fa-edit"></i> Editar</button>
              <button onClick={handleEliminar} className="text-red-200 hover:text-white bg-red-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-1 ml-1 cursor-pointer border border-red-400/30"><i className="fas fa-trash"></i></button>
            </div>
          </div>
          
          <h3 className="text-lg font-black text-white leading-tight mt-1 truncate drop-shadow-md">
            {pedidoSeleccionado.cliente_nombre}
            {esContpaqi && <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase align-middle ml-2 shadow-sm border border-white/30 backdrop-blur-sm">CONTPAQI</span>}
            {pedidoSeleccionado.urgente && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase align-middle ml-2 shadow-sm border border-red-400"><i className="fas fa-fire-alt"></i> Urgente</span>}
          </h3>

          <div className="flex justify-between items-center mt-2">
             <span className="text-[10px] font-bold text-blue-100 flex items-center gap-1.5"><i className={`fas ${tipoEnvio.icon}`}></i> {tipoEnvio.text}</span>
             {getBadgeEstado()}
          </div>
        </div>

        {/* BODY - NUEVA CLASE min-h-0 PARA ARREGLAR EL OVERFLOW */}
        <div className="p-3 overflow-y-auto custom-scroll flex-1 min-h-0 space-y-3 pb-6">
          
          {/* ACORDEÓN: INFO DE ENTREGA */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden shrink-0">
            <button onClick={() => setSeccionInfo(!seccionInfo)} className="w-full flex justify-between items-center p-3 hover:bg-slate-50 transition">
              <h4 className="font-black text-[11px] text-slate-800 flex items-center gap-1.5"><i className="fas fa-map-marked-alt text-blue-500"></i> Info de Entrega</h4>
              <i className={`fas fa-chevron-${seccionInfo ? 'up' : 'down'} text-slate-400 text-xs transition-transform`}></i>
            </button>
            
            {seccionInfo && (
              <div className="p-3 pt-0 border-t border-slate-100">
                <div className="bg-slate-50 p-2 rounded-lg mb-2 border border-slate-100 mt-2">
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

                {/* AVISO DE COBRANZA RECONSTRUIDO */}
                {requiereCobro && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex justify-between items-center shadow-sm">
                     <div className="flex items-start gap-2">
                        <i className="fas fa-exclamation-triangle text-red-500 mt-0.5"></i>
                        <div>
                           <p className="text-[10px] font-black text-red-700 uppercase tracking-wide">Aviso de Cobranza</p>
                           <p className="text-[9px] font-medium text-red-600 leading-snug">Adeudo reportado al importar de CONTPAQi</p>
                        </div>
                     </div>
                     <span className="text-sm font-black text-red-700">${saldo.toFixed(2)}</span>
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
            )}
          </div>

          {/* ACORDEÓN: TRAYECTO ESTIMADO */}
          {!esPendiente && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm overflow-hidden shrink-0">
                <button onClick={() => setSeccionTrayecto(!seccionTrayecto)} className="w-full flex justify-between items-center p-3 hover:bg-indigo-100/50 transition">
                  <h4 className="font-black text-[11px] text-indigo-900 flex items-center gap-1.5"><i className="fas fa-route text-indigo-500"></i> Trayecto Estimado</h4>
                  <div className="flex items-center gap-2">
                    {esRampa && (
                      <span onClick={(e) => { e.stopPropagation(); handleOptimizar(); }} className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-100 px-2 py-1 rounded transition flex items-center gap-1">
                        <i className="fas fa-magic"></i> Optimizar
                      </span>
                    )}
                    <i className={`fas fa-chevron-${seccionTrayecto ? 'up' : 'down'} text-indigo-400 text-xs transition-transform`}></i>
                  </div>
                </button>
                
                {seccionTrayecto && (
                  <div className="p-3 pt-0 border-t border-indigo-100/50">
                    <ReactSortable list={paradasRuta} setList={setParadasRuta} animation={150} handle=".drag-handle" ghostClass="opacity-40" className="relative mt-2">
                    {paradasRuta.map((parada, index) => {
                        const isSelectedParada = parada.id === pedidoSeleccionado.id;
                        return (
                        <div key={parada.id} className={`flex items-center gap-1.5 py-1.5 relative border-l-2 ml-2.5 pl-3 transition-colors ${isSelectedParada ? 'bg-indigo-100/50 border-indigo-400' : 'border-slate-200 bg-transparent'}`}>
                          {parada.tipo === 'destino' && <div className="drag-handle w-4 h-full flex items-center justify-center text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing"><i className="fas fa-grip-vertical"></i></div>}
                          <div className={`w-4 h-4 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm shrink-0 ${parada.tipo === 'origen' ? 'bg-slate-900 absolute -left-[11px]' : parada.tipo === 'retorno' ? 'bg-emerald-500 absolute -left-[11px]' : isSelectedParada ? 'bg-indigo-600 absolute -left-[11px] scale-110 shadow-indigo-500/50' : 'bg-blue-400 absolute -left-[11px]'}`}>
                              {parada.tipo === 'origen' ? <i className="fas fa-industry"></i> : parada.tipo === 'retorno' ? <i className="fas fa-flag-checkered"></i> : index}
                          </div>
                          <span className={`truncate text-[10px] font-bold ${isSelectedParada ? 'text-indigo-900' : 'text-slate-600'}`}>{parada.nombre}</span>
                        </div>
                    )})}
                    </ReactSortable>

                    <div className="mt-3 pt-3 border-t border-indigo-100 flex justify-around bg-white rounded-lg p-2 shadow-sm">
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Distancia</p>
                            <p className="text-xs font-bold text-indigo-700">{distanciaRuta} km</p>
                        </div>
                        <div className="w-px bg-indigo-50"></div>
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Tiempo</p>
                            <p className="text-xs font-bold text-emerald-600">{tiempoRuta} min</p>
                        </div>
                    </div>
                  </div>
                )}
              </div>
          )}

          {/* ... El resto de ASIGNACIÓN ACTUAL, CONFIRMAR SALIDA y ACCIONES ... */}
          {/* (Pega aquí la sección final de "esRampa", "esPendiente", "errorEmpalme", etc. 
               que ya teníamos perfectamente armada en la respuesta anterior para no extender el código) */}
               
          {/* INFO ASIGNACIÓN ACTUAL (Para Rampa y En Ruta) */}
          {(esRampa || esEnRuta) && !modoEdicionAsignacion && (
             <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex justify-between items-center shrink-0">
                 <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Unidad y Operador Asignado:</p>
                     <p className="text-[11px] font-bold text-blue-700"><i className="fas fa-truck text-blue-400 w-4"></i> {flota.find(v => v.id === vehiculoId)?.nombre || 'S/N'}</p>
                     <p className="text-[11px] font-bold text-slate-700"><i className="fas fa-user-circle text-slate-400 w-4"></i> {choferes.find(c => c.id === choferId)?.nombre || 'S/N'}</p>
                 </div>
                 <button 
                    onClick={() => setModoEdicionAsignacion(true)} 
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
                 >
                     <i className="fas fa-pencil-alt text-xs"></i>
                 </button>
             </div>
          )}

          {/* ASIGNACIÓN DE UNIDAD CON EFECTO CRISTAL AZUL Y CANDADO */}
          {(esPendiente || modoEdicionAsignacion) && (
             <div className="bg-blue-700/40 backdrop-blur-xl rounded-2xl p-4 shadow-xl shadow-blue-900/10 text-white border border-blue-400/40 relative shrink-0 mt-3">
                
                {modoEdicionAsignacion && (
                    <button onClick={() => { setModoEdicionAsignacion(false); setVehiculoId(pedidoSeleccionado.vehiculo_asignado); setChoferId(pedidoSeleccionado.chofer_asignado); }} className="absolute top-3 right-3 text-blue-200 hover:text-white bg-white/10 rounded-full w-6 h-6 flex items-center justify-center transition">
                        <i className="fas fa-times"></i>
                    </button>
                )}

                <h4 className="text-[10px] font-black uppercase tracking-wider mb-3 text-blue-100 drop-shadow-sm">
                    <i className="fas fa-clipboard-check"></i> {modoEdicionAsignacion ? 'Corregir Asignación' : 'Asignar Unidad'}
                </h4>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {flota.map(v => {
                    const isSelected = vehiculoId === v.id;
                    const iconColor = v.pesado ? 'text-blue-300' : 'text-blue-200';
                    return (
                      <button key={v.id} onClick={() => setVehiculoId(v.id)} className={`p-2 rounded-xl border text-[9px] font-bold transition-all text-center flex flex-col items-center gap-1.5 ${isSelected ? 'border-white bg-white/20 backdrop-blur-sm text-white shadow-inner scale-105' : 'border-blue-400/30 bg-blue-700/30 backdrop-blur-sm text-blue-100 hover:border-blue-300 hover:bg-blue-700/50'}`}>
                        <i className={`fas ${v.pesado ? 'fa-truck-moving' : 'fa-truck'} text-lg ${isSelected ? 'text-white drop-shadow-md' : iconColor}`}></i>
                        <span className="w-full truncate">{v.nombre}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative mb-3">
                  <i className="fas fa-user-circle absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-200"></i>
                  <select value={choferId} onChange={(e) => setChoferId(e.target.value)} className="w-full border border-blue-400/50 bg-blue-700/50 backdrop-blur-md text-white p-3 pl-9 rounded-xl outline-none text-xs font-bold cursor-pointer shadow-inner appearance-none transition focus:border-white">
                    <option value="" className="text-slate-800">-- Selecciona al Operador --</option>
                    {choferes.map(c => (<option key={c.id} value={c.id} className="font-bold text-slate-800">{c.nombre}</option>))}
                  </select>
                </div>

                {advertenciaChofer && !errorEmpalme && (
                    <div className="mb-4 bg-amber-500/90 backdrop-blur-sm border border-amber-400 rounded-xl p-2.5 flex items-start gap-2 shadow-sm">
                        <i className="fas fa-info-circle text-white mt-0.5"></i>
                        <p className="text-[10px] text-white font-medium leading-snug">
                            Este chofer ya tiene pedidos en OTRA unidad.
                        </p>
                    </div>
                )}

                {errorEmpalme && (
                    <div className="mb-4 bg-red-500/90 backdrop-blur-sm border border-red-400 rounded-xl p-2.5 flex items-start gap-2 shadow-sm">
                        <i className="fas fa-hand-paper text-white mt-0.5"></i>
                        <p className="text-[10px] text-white font-medium leading-snug">
                            <b>Empalme:</b> {errorEmpalme}
                        </p>
                    </div>
                )}
                
                {esPendiente ? (
                    <>
                        <button onClick={() => cambiarEstadoLogistico('rampa')} disabled={!!errorEmpalme} className={`w-full font-black py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs ${errorEmpalme ? 'bg-blue-800/50 text-blue-300 border border-blue-700 cursor-not-allowed' : 'bg-white text-blue-700 hover:bg-blue-50 active:scale-95'}`}>
                            <i className="fas fa-link"></i> Pre-Asignar
                        </button>
                    </>
                ) : (
                    <button onClick={() => cambiarEstadoLogistico('actualizar_asignacion')} disabled={!!errorEmpalme} className={`w-full font-black py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs ${errorEmpalme ? 'bg-blue-800/50 text-blue-300 border border-blue-700 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-white border border-emerald-400 active:scale-95'}`}>
                        <i className="fas fa-save"></i> Guardar Cambios
                    </button>
                )}
             </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DetalleDrawer;
