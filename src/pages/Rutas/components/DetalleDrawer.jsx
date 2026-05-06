import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
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
  const [seccionEvidencias, setSeccionEvidencias] = useState(true);

  // ESTADOS PARA EL VISOR DE IMÁGENES
  const [imagenModal, setImagenModal] = useState(null);

  // ESTADOS PARA MATERIAL PENDIENTE (LA TABLITA DIGITAL)
  const [showFaltanteModal, setShowFaltanteModal] = useState(false);
  const [descFaltante, setDescFaltante] = useState('');
  const [metodoFaltante, setMetodoFaltante] = useState('envio'); // 'envio' o 'mostrador'

  useEffect(() => {
    if (pedidoSeleccionado) {
      setVehiculoId(pedidoSeleccionado.vehiculo_asignado || '');
      setChoferId(pedidoSeleccionado.chofer_asignado || '');
      setAlerta(null);
      setModoEdicionAsignacion(false); 
      setSeccionInfo(true);
      setSeccionTrayecto(pedidoSeleccionado.estado !== 'pendiente');
      setSeccionEvidencias(true);
      
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

  const esPendiente = pedidoSeleccionado.estado === 'pendiente';
  const esRampa = pedidoSeleccionado.estado === 'camino' && !pedidoSeleccionado.fecha_salida;
  const esEnRuta = pedidoSeleccionado.estado === 'camino' && pedidoSeleccionado.fecha_salida;
  const esFallido = pedidoSeleccionado.estado === 'fallido';
  const esEntregado = pedidoSeleccionado.estado === 'entregado';

  const esContpaqi = pedidoSeleccionado.origen?.toLowerCase() === 'contpaqi';
  const saldo = parseFloat(pedidoSeleccionado.saldo_pendiente || 0);
  const requiereCobro = pedidoSeleccionado.requiere_cobro || saldo > 0;

  const permiteEditar = !esEntregado && !esFallido;

  const getTipoEnvio = () => {
      if(pedidoSeleccionado.tipo_envio === 'fletera_domicilio') return { text: 'Fletera (A Domicilio)', icon: 'fa-truck' };
      if(pedidoSeleccionado.tipo_envio === 'fletera_ocurre') return { text: 'Fletera (Ocurre)', icon: 'fa-box' };
      return { text: 'Reparto Local', icon: 'fa-truck-fast' };
  };
  const tipoEnvio = getTipoEnvio();

  const getBadgeEstado = () => {
      if (esFallido) return <span className="bg-red-500 text-white px-2 py-1 rounded text-[9px] font-black"><i className="fas fa-exclamation-triangle"></i> PROBLEMA</span>;
      if (esEnRuta) return <span className="bg-blue-500 text-white px-2 py-1 rounded text-[9px] font-black"><i className="fas fa-truck-fast"></i> EN RUTA</span>;
      if (esRampa) return <span className="bg-indigo-500 text-white px-2 py-1 rounded text-[9px] font-black"><i className="fas fa-dolly"></i> EN RAMPA</span>;
      if (esEntregado) return <span className="bg-emerald-500 text-white px-2 py-1 rounded text-[9px] font-black"><i className="fas fa-check-double"></i> ENTREGADO</span>;
      return <span className="bg-slate-800 text-white px-2 py-1 rounded text-[9px] font-black">POR ASIGNAR</span>;
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

  // --- FUNCIÓN GUARDAR FALTANTE (LA TABLITA) ---
  const handleGuardarFaltante = async () => {
    if (!descFaltante.trim()) return setAlerta("Escribe qué material faltó");
    
    try {
      await addDoc(collection(db, 'material_pendiente'), {
        folio_original: pedidoSeleccionado.folio_pedido || 'S/N',
        cliente_nombre: pedidoSeleccionado.cliente_nombre,
        cliente_codigo: pedidoSeleccionado.cliente_codigo || '',
        direccion: pedidoSeleccionado.direccion || '',
        coordenadas: pedidoSeleccionado.coordenadas || null,
        descripcion: descFaltante,
        metodo_solucion: metodoFaltante,
        estado: 'esperando_material',
        fecha_reporte: serverTimestamp(),
      });
      
      setShowFaltanteModal(false);
      setDescFaltante('');
      setAlerta("¡Faltante anotado en la tablita!");
      setTimeout(() => setAlerta(null), 3000);
    } catch (e) {
      setAlerta("Error al guardar faltante");
    }
  };

  const descargarImagen = (url, titulo) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Evidencia_${titulo.replace(' ', '_')}_${pedidoSeleccionado.folio_pedido || 'SN'}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(console.error);
  };

  const fotosEvidencia = [];
  const urlMaterial = pedidoSeleccionado.foto_evidencia_material;
  if (urlMaterial) fotosEvidencia.push({ url: urlMaterial, titulo: 'Material Entregado' });
  const urlFirma = pedidoSeleccionado.foto_evidencia;
  if (urlFirma) fotosEvidencia.push({ url: urlFirma, titulo: 'Documento Firmado' });

  return (
    <>
      <div className={`fixed inset-0 bg-slate-900/30 z-[45] transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>

      {alerta && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl font-black text-xs flex items-center gap-2 animate-bounce">
            <i className="fas fa-info-circle"></i> {alerta}
        </div>
      )}

      <div className={`fixed bottom-0 lg:top-4 lg:bottom-4 right-0 lg:right-4 w-full lg:w-[380px] h-[85vh] lg:h-[calc(100vh-2rem)] bg-white/80 backdrop-blur-md lg:rounded-3xl rounded-t-3xl shadow-2xl z-[50] flex flex-col overflow-hidden border border-white/50 transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-[120%]'}`}>
        
        {/* HEADER */}
        <div className="bg-blue-800/90 p-4 shrink-0 relative shadow-lg z-10 border-b border-blue-900/50">
          <button onClick={onClose} className="absolute top-4 right-4 text-blue-100 hover:text-white transition bg-white/20 w-8 h-8 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
          
          <div className="flex justify-between items-start mb-1 pr-8">
            <div className="flex gap-1.5 items-center flex-wrap">
              {pedidoSeleccionado.folio_pedido && (<span className="text-[9px] font-mono font-black text-blue-900 bg-white px-1.5 py-0.5 rounded shadow-sm">PED: {pedidoSeleccionado.folio_pedido}</span>)}
              {permiteEditar && (
                <>
                  <button onClick={() => onEdit(pedidoSeleccionado)} className="text-amber-900 bg-amber-400 px-2 py-0.5 rounded text-[9px] font-black shadow-sm flex items-center gap-1 hover:bg-amber-300 transition"><i className="fas fa-edit"></i> Editar</button>
                  {/* BOTÓN FALTANTES */}
                  <button onClick={() => setShowFaltanteModal(true)} className="text-purple-900 bg-purple-300 px-2 py-0.5 rounded text-[9px] font-black shadow-sm flex items-center gap-1 hover:bg-purple-200 transition"><i className="fas fa-clipboard-list"></i> Faltante</button>
                  <button onClick={handleEliminar} className="text-white bg-red-500 px-2 py-0.5 rounded text-[9px] font-black shadow-sm flex items-center gap-1 hover:bg-red-400 transition"><i className="fas fa-trash-alt"></i> Eliminar</button>
                </>
              )}
            </div>
          </div>
          
          <h3 className="text-lg font-black text-white leading-tight mt-1 truncate drop-shadow-md">
            {pedidoSeleccionado.cliente_nombre}
            {esContpaqi && <span className="bg-white/30 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase align-middle ml-2">CONTPAQI</span>}
          </h3>

          <div className="flex justify-between items-center mt-2">
             <span className="text-[10px] font-bold text-blue-100 flex items-center gap-1.5 drop-shadow-sm"><i className={`fas ${tipoEnvio.icon}`}></i> {tipoEnvio.text}</span>
             {getBadgeEstado()}
          </div>
        </div>

        <div className="p-3 overflow-y-auto custom-scroll flex-1 min-h-0 space-y-3 pb-6 relative z-0">
          
          {/* INFO DE ENTREGA */}
          <div className="bg-white/60 border border-white rounded-xl shadow-sm overflow-hidden shrink-0">
            <button onClick={() => setSeccionInfo(!seccionInfo)} className="w-full flex justify-between items-center p-3 hover:bg-white/80 transition">
              <h4 className="font-black text-[11px] text-slate-800 flex items-center gap-1.5"><i className="fas fa-map-marked-alt text-blue-600"></i> Info de Entrega</h4>
              <i className={`fas fa-chevron-${seccionInfo ? 'up' : 'down'} text-slate-500 text-xs transition-transform`}></i>
            </button>
            
            {seccionInfo && (
              <div className="p-3 pt-0 border-t border-white/60">
                <div className="bg-white/80 p-2 rounded-lg mb-2 shadow-sm border border-slate-100">
                  <span className="font-bold text-xs text-slate-900">{pedidoSeleccionado.destino_alias || 'Destino Físico'}</span>
                  <p className="text-[10px] text-slate-700 font-medium leading-snug flex items-start gap-1 mt-1"><i className="fas fa-map-marker-alt text-red-600 mt-0.5 shrink-0"></i> {pedidoSeleccionado.direccion}</p>
                </div>

                {requiereCobro && (
                  <div className="bg-red-500/90 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md">
                     <div className="flex items-start gap-2">
                        <i className="fas fa-exclamation-triangle text-white mt-0.5"></i>
                        <div>
                           <p className="text-[10px] font-black text-white uppercase tracking-wide">Aviso de Cobranza</p>
                           <p className="text-[9px] font-medium text-red-100 leading-snug">Adeudo reportado</p>
                        </div>
                     </div>
                     <span className="text-sm font-black text-white shadow-sm">${saldo.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RUTA DE VIAJE */}
          {(pedidoSeleccionado.estado === 'camino' || pedidoSeleccionado.estado === 'entregado') && paradasRuta.length > 0 && (
            <div className="bg-white/60 border border-white rounded-xl shadow-sm overflow-hidden shrink-0 mt-3">
              <button onClick={() => setSeccionTrayecto(!seccionTrayecto)} className="w-full flex justify-between items-center p-3 hover:bg-white/80 transition">
                <h4 className="font-black text-[11px] text-slate-800 flex items-center gap-1.5"><i className="fas fa-route text-blue-600"></i> Ruta de Viaje</h4>
                <i className={`fas fa-chevron-${seccionTrayecto ? 'up' : 'down'} text-slate-500 text-xs transition-transform`}></i>
              </button>
              
              {seccionTrayecto && (
                <div className="p-3 pt-0 border-t border-white/60">
                  
                  {pedidoSeleccionado.lote_id && (
                    <div className="mb-2 bg-blue-100/50 p-1.5 rounded-lg border border-blue-200 flex items-center justify-between">
                       <span className="text-[9px] font-bold text-blue-800 uppercase">Lote Asignado:</span>
                       <span className="text-[9px] font-mono font-black text-blue-900 bg-white px-2 py-0.5 rounded shadow-sm">{pedidoSeleccionado.lote_id}</span>
                    </div>
                  )}

                  <div className="relative border-l-2 border-dashed border-blue-300 ml-3 my-2 space-y-4 py-2">
                     {paradasRuta.map((parada, index) => {
                        const isPlanta = parada.tipo === 'origen' || parada.tipo === 'retorno';
                        return (
                          <div key={parada.id + index} className="relative flex items-center gap-3 pl-4">
                             <div className={`absolute -left-[11px] w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${isPlanta ? 'bg-slate-800' : 'bg-emerald-500'}`}>
                                {isPlanta ? <i className="fas fa-building text-white text-[9px]"></i> : <span className="text-white text-[9px] font-black">{index}</span>}
                             </div>
                             <span className={`text-[10px] font-black ${isPlanta ? 'text-slate-700' : 'text-slate-900'} uppercase`}>
                               {parada.nombre}
                             </span>
                          </div>
                        )
                     })}
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                     <div className="text-center">
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Distancia</p>
                        <p className="text-xs font-black text-blue-900">{distanciaRuta} km</p>
                     </div>
                     
                     {esRampa && paradasRuta.filter(p => p.tipo === 'destino').length > 1 && (
                       <button onClick={handleOptimizar} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black shadow-sm transition active:scale-95 flex items-center gap-1">
                          <i className="fas fa-magic"></i> Optimizar Ruta
                       </button>
                     )}

                     <div className="text-center">
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Tiempo</p>
                        <p className="text-xs font-black text-blue-900">{tiempoRuta} min</p>
                     </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ASIGNACIÓN DE UNIDAD Y HOT SWAP */}
          {(!esPendiente && !modoEdicionAsignacion && !esEntregado && !esFallido) && (
             <div className="bg-slate-100 rounded-2xl p-4 shadow-sm border border-slate-200 shrink-0 mt-3 flex justify-between items-center">
                <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unidad Asignada</p>
                   <p className="text-xs font-black text-blue-900"><i className="fas fa-truck text-blue-600 mr-1"></i> {flota.find(v => v.id === pedidoSeleccionado.vehiculo_asignado)?.nombre || 'Sin unidad'}</p>
                   <p className="text-[10px] font-bold text-slate-700 mt-1"><i className="fas fa-user-tie text-slate-400 mr-1"></i> {choferes.find(c => c.id === pedidoSeleccionado.chofer_asignado)?.nombre || 'Sin operador'}</p>
                </div>
                <button 
                   onClick={() => {
                      setVehiculoId(pedidoSeleccionado.vehiculo_asignado);
                      setChoferId(pedidoSeleccionado.chofer_asignado);
                      setModoEdicionAsignacion(true);
                   }} 
                   className="bg-white border border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-400 w-10 h-10 rounded-xl flex items-center justify-center transition shadow-sm"
                   title="Reasignar Unidad o Chofer"
                >
                   <i className="fas fa-exchange-alt"></i>
                </button>
             </div>
          )}

          {(esPendiente || modoEdicionAsignacion) && (
             <div className="bg-blue-800/90 rounded-2xl p-4 shadow-xl text-white border border-blue-700 relative shrink-0 mt-3 animate-fade-in">
                <div className="flex justify-between items-center mb-3">
                   <h4 className="text-[10px] font-black uppercase tracking-wider text-white">
                       <i className="fas fa-clipboard-check"></i> {modoEdicionAsignacion ? 'Corregir Asignación' : 'Asignar Unidad'}
                   </h4>
                   {modoEdicionAsignacion && (
                      <button onClick={() => setModoEdicionAsignacion(false)} className="text-blue-200 hover:text-white text-xs font-bold"><i className="fas fa-times"></i> Cancelar</button>
                   )}
                </div>
                
                {/* VALIDACIONES EN VIVO */}
                {errorEmpalme && (
                    <div className="bg-red-500/20 border border-red-500 text-red-100 text-[10px] p-2 rounded-lg mb-3 flex items-start gap-2">
                        <i className="fas fa-exclamation-triangle mt-0.5"></i> <span>{errorEmpalme}</span>
                    </div>
                )}
                {advertenciaChofer && !errorEmpalme && (
                    <div className="bg-amber-500/20 border border-amber-500 text-amber-200 text-[10px] p-2 rounded-lg mb-3 flex items-start gap-2">
                        <i className="fas fa-exclamation-circle mt-0.5"></i> <span>El operador ya está armando otra unidad.</span>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {flota.map(v => {
                    const isSelected = vehiculoId === v.id;
                    return (
                      <button key={v.id} onClick={() => setVehiculoId(v.id)} className={`p-2 rounded-xl border text-[9px] font-bold transition-all text-center flex flex-col items-center gap-1.5 ${isSelected ? 'border-white bg-white/20 text-white shadow-inner scale-105' : 'border-blue-600 bg-blue-900/50 text-blue-200 hover:bg-blue-700'}`}>
                        <i className={`fas ${v.pesado ? 'fa-truck-moving' : 'fa-truck'} text-lg`}></i>
                        <span className="w-full truncate">{v.nombre}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative mb-3">
                  <select value={choferId} onChange={(e) => setChoferId(e.target.value)} className="w-full bg-blue-900/50 border border-blue-600 text-white p-3 pl-3 rounded-xl outline-none text-xs font-bold cursor-pointer appearance-none">
                    <option value="">-- Selecciona Operador --</option>
                    {choferes.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                  </select>
                </div>

                {esPendiente ? (
                    <button 
                       onClick={() => cambiarEstadoLogistico('rampa')} 
                       disabled={!!errorEmpalme}
                       className={`w-full font-black py-3 rounded-xl shadow-lg transition text-xs ${errorEmpalme ? 'bg-slate-400 text-slate-200 cursor-not-allowed opacity-50' : 'bg-white text-blue-800 hover:bg-slate-100 active:scale-95'}`}
                    >
                        <i className="fas fa-link"></i> Pre-Asignar
                    </button>
                ) : (
                    <button 
                       onClick={() => cambiarEstadoLogistico('actualizar_asignacion')} 
                       disabled={!!errorEmpalme}
                       className={`w-full font-black py-3 rounded-xl shadow-lg transition text-xs ${errorEmpalme ? 'bg-slate-400 text-slate-200 cursor-not-allowed opacity-50' : 'bg-emerald-500 hover:bg-emerald-400 text-white active:scale-95'}`}
                    >
                        <i className="fas fa-save"></i> Guardar Cambios
                    </button>
                )}
             </div>
          )}

          {/* CONFIRMAR SALIDA (UI/UX GLASSMORPHISM) */}
          {esRampa && !modoEdicionAsignacion && (
             <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-[0_8px_30px_rgba(16,185,129,0.15)] mt-3 relative overflow-hidden flex flex-col gap-3">
                {/* Resplandor de fondo */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/20 blur-3xl rounded-full pointer-events-none"></div>

                <div className="relative z-10">
                    <h4 className="text-[11px] font-black text-emerald-800 flex items-center gap-1.5 mb-1"><i className="fas fa-truck-fast text-emerald-500"></i> UNIDAD CARGADA</h4>
                    <p className="text-[10px] text-slate-600 leading-snug font-medium">Confirma la salida para generar el Lote de Viaje y comenzar la ruta.</p>
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                    {/* Botón Principal (Iniciar Ruta) */}
                    <button onClick={() => cambiarEstadoLogistico('salida')} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black py-3.5 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 text-xs border border-emerald-400/50">
                       <i className="fas fa-play"></i> Iniciar Ruta Ahora
                    </button>
                    {/* Botón Secundario (Regresar) */}
                    <button onClick={() => cambiarEstadoLogistico('reasignar')} className="w-full bg-white/50 hover:bg-white/80 text-slate-600 border border-slate-300/50 py-2.5 rounded-xl font-bold text-[11px] transition-colors shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] flex items-center justify-center gap-2">
                       <i className="fas fa-undo"></i> Regresar a Pendientes
                    </button>
                </div>
             </div>
          )}

          {/* PANEL EVIDENCIAS Y REPORTES */}
          {(esEntregado || esFallido) && fotosEvidencia.length > 0 && (
             <div className="bg-white/60 border border-white rounded-xl shadow-sm overflow-hidden shrink-0 mt-3">
               <button onClick={() => setSeccionEvidencias(!seccionEvidencias)} className="w-full flex justify-between items-center p-3 hover:bg-white/80 transition">
                 <h4 className="font-black text-[11px] text-slate-800 flex items-center gap-1.5"><i className="fas fa-camera text-blue-600"></i> Evidencias y Reportes</h4>
                 <i className={`fas fa-chevron-${seccionEvidencias ? 'up' : 'down'} text-slate-500 text-xs transition-transform`}></i>
               </button>
               
               {seccionEvidencias && (
                 <div className="p-3 pt-0 border-t border-white/60">
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {fotosEvidencia.map((foto, index) => (
                           <div key={index} className="relative group cursor-pointer overflow-hidden rounded-xl shadow-sm border border-slate-200" onClick={() => setImagenModal(foto)}>
                              <img src={foto.url} alt={foto.titulo} className="w-full h-24 object-cover transform group-hover:scale-105 transition-transform duration-300 bg-white" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <i className="fas fa-search-plus text-white text-xl"></i>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4 text-center">
                                 <p className="text-[8px] font-black text-white uppercase tracking-wider">{foto.titulo}</p>
                              </div>
                           </div>
                        ))}
                    </div>
                 </div>
               )}
             </div>
          )}

        </div>
      </div>

      {/* MODAL VISOR DE IMÁGENES */}
      {imagenModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-opacity duration-300">
           
           <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
              <span className="bg-slate-800/80 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase shadow-md border border-slate-700 backdrop-blur-md">
                 <i className="fas fa-camera mr-1.5"></i> {imagenModal.titulo}
              </span>
              <button onClick={() => setImagenModal(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/20">
                 <i className="fas fa-times text-lg"></i>
              </button>
           </div>

           <img src={imagenModal.url} alt="Evidencia en grande" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl border border-white/10 relative z-0 bg-white" />
           
           <button onClick={() => descargarImagen(imagenModal.url, imagenModal.titulo)} className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl shadow-lg border border-blue-400 flex items-center gap-2 transition active:scale-95 z-10">
              <i className="fas fa-download"></i> Descargar Imagen
           </button>
        </div>
      )}

      {/* MODAL FALTANTES (LA TABLITA DIGITAL) */}
      {showFaltanteModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300">
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-5 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.1),inset_0_0_20px_rgba(255,255,255,0.8)] w-full max-w-sm transform-gpu">
            <h3 className="font-black text-slate-800 text-lg mb-1 flex items-center gap-2">
              <i className="fas fa-clipboard-list text-purple-600"></i> Reportar Faltante
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Se guardará en la tablita de pendientes</p>
            
            <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5 ml-1">¿Qué material faltó?</label>
            <textarea 
              value={descFaltante}
              onChange={(e) => setDescFaltante(e.target.value)}
              placeholder="Ej. Faltaron 5 cajas de... por falta de stock."
              className="w-full bg-white/50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-purple-400 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all mb-4"
              rows="3"
            ></textarea>

            <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5 ml-1">¿Cómo se le va a entregar?</label>
            <div className="flex gap-2 mb-6">
              <button 
                onClick={() => setMetodoFaltante('envio')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1 transition-all duration-300 border shadow-sm ${metodoFaltante === 'envio' ? 'bg-blue-600 text-white border-blue-500 scale-105' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
              >
                <i className="fas fa-truck-fast text-lg"></i>
                Se lo enviamos
              </button>
              <button 
                onClick={() => setMetodoFaltante('mostrador')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1 transition-all duration-300 border shadow-sm ${metodoFaltante === 'mostrador' ? 'bg-emerald-500 text-white border-emerald-400 scale-105' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
              >
                <i className="fas fa-store text-lg"></i>
                Pasa a recoger
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowFaltanteModal(false)} className="flex-1 bg-slate-200/50 hover:bg-slate-300 text-slate-600 font-black py-3 rounded-xl text-xs transition-colors border border-slate-300/50">Cancelar</button>
              <button onClick={handleGuardarFaltante} className="flex-[2] bg-purple-600 hover:bg-purple-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-[0_4px_15px_rgba(147,51,234,0.3)] flex justify-center items-center gap-2">
                <i className="fas fa-save"></i> Guardar en Tablita
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default DetalleDrawer;
