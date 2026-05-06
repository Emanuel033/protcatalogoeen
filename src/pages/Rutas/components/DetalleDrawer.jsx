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

  const [imagenModal, setImagenModal] = useState(null);

  // LA TABLITA DIGITAL
  const [showFaltanteModal, setShowFaltanteModal] = useState(false);
  const [descFaltante, setDescFaltante] = useState('');
  const [metodoFaltante, setMetodoFaltante] = useState('envio'); 

  // === ESTADO PARA DRAG AND DROP ===
  const [draggedIndex, setDraggedIndex] = useState(null);

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
      if(pedidoSeleccionado.tipo_envio === 'fletera_domicilio') return { text: 'Fletera (A Dom)', icon: 'fa-truck' };
      if(pedidoSeleccionado.tipo_envio === 'fletera_ocurre') return { text: 'Fletera (Ocurre)', icon: 'fa-box' };
      return { text: 'Reparto Local', icon: 'fa-truck-fast' };
  };
  const tipoEnvio = getTipoEnvio();

  const badgeEstilo = "px-2 py-0.5 rounded-[6px] text-[9px] font-black uppercase tracking-wide shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] border flex items-center gap-1";
  
  const getBadgeEstado = () => {
      if (esFallido) return <span className={`${badgeEstilo} bg-red-500/20 text-red-100 border-red-500/40`}><i className="fas fa-exclamation-triangle"></i> Problema</span>;
      if (esEnRuta) return <span className={`${badgeEstilo} bg-blue-500/20 text-blue-100 border-blue-400/40`}><i className="fas fa-truck-fast"></i> En Ruta</span>;
      if (esRampa) return <span className={`${badgeEstilo} bg-indigo-500/20 text-indigo-100 border-indigo-400/40`}><i className="fas fa-dolly"></i> En Rampa</span>;
      if (esEntregado) return <span className={`${badgeEstilo} bg-emerald-500/20 text-emerald-100 border-emerald-400/40`}><i className="fas fa-check-double"></i> Entregado</span>;
      return <span className={`${badgeEstilo} bg-slate-800/40 text-slate-200 border-slate-600/50`}><i className="fas fa-clock"></i> Por Asignar</span>;
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

  // === HANDLERS DE DRAG AND DROP ===
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    // No permitir soltar sobre los extremos (Planta origen/retorno)
    if (paradasRuta[dropIndex].tipo !== 'destino') return;

    const nuevasParadas = [...paradasRuta];
    const draggedItem = nuevasParadas[draggedIndex];

    nuevasParadas.splice(draggedIndex, 1);
    nuevasParadas.splice(dropIndex, 0, draggedItem);

    setParadasRuta(nuevasParadas);
    setDraggedIndex(null);

    // Guardar el nuevo orden en Firebase
    try {
        const destinosOrdenados = nuevasParadas.filter(p => p.tipo === 'destino');
        for (let i = 0; i < destinosOrdenados.length; i++) {
            await updateDoc(doc(db, 'rutas_logistica', destinosOrdenados[i].id), {
                orden_ruta: i + 1,
                fecha_actualizacion: serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error al reordenar:", error);
        setAlerta("Error al guardar el nuevo orden");
        setTimeout(() => setAlerta(null), 3000);
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
      <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45] transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>

      {alerta && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] bg-indigo-600/90 backdrop-blur-md text-white px-6 py-2 rounded-full shadow-[0_5px_15px_rgba(79,70,229,0.4)] border border-indigo-400 font-black text-xs flex items-center gap-2 animate-bounce">
            <i className="fas fa-info-circle"></i> {alerta}
        </div>
      )}

      {/* CAJÓN PRINCIPAL (Glassmorphism) */}
      <div className={`fixed bottom-0 lg:top-4 lg:bottom-4 right-0 lg:right-4 w-full lg:w-[380px] h-[85vh] lg:h-[calc(100vh-2rem)] bg-white/40 backdrop-blur-2xl lg:rounded-3xl rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[50] flex flex-col overflow-hidden border border-white/60 transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-[120%]'}`}>
        
        {/* HEADER OSCURO CRISTALINO */}
        <div className="bg-gradient-to-br from-slate-900/80 to-blue-900/80 backdrop-blur-xl p-4 shrink-0 relative shadow-[0_4px_20px_rgba(0,0,0,0.15)] z-10 border-b border-white/10 overflow-hidden">
          {/* Brillo decorativo */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full pointer-events-none z-0"></div>

          {/* === BOTÓN DE CERRAR ARREGLADO === */}
          <button onClick={onClose} className="absolute top-4 right-4 z-50 text-slate-300 hover:text-white transition bg-white/10 hover:bg-white/20 border border-white/10 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md cursor-pointer active:scale-95 shadow-md">
            <i className="fas fa-times text-lg"></i>
          </button>
          
          <div className="flex justify-between items-start mb-1 pr-12 relative z-10">
            <div className="flex gap-1.5 items-center flex-wrap">
              {pedidoSeleccionado.folio_pedido && (<span className="text-[9px] font-mono font-black text-blue-100 bg-white/10 border border-white/20 px-1.5 py-0.5 rounded-[4px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">PED: {pedidoSeleccionado.folio_pedido}</span>)}
              
              {permiteEditar && (
                <>
                  <button onClick={() => onEdit(pedidoSeleccionado)} className="text-amber-100 bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 rounded-[4px] text-[9px] font-black shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] flex items-center gap-1 hover:bg-amber-500/40 transition"><i className="fas fa-edit"></i> Editar</button>
                  <button onClick={() => setShowFaltanteModal(true)} className="text-purple-100 bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 rounded-[4px] text-[9px] font-black shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] flex items-center gap-1 hover:bg-purple-500/40 transition"><i className="fas fa-clipboard-list"></i> Faltante</button>
                  <button onClick={handleEliminar} className="text-red-100 bg-red-500/20 border border-red-400/30 px-2 py-0.5 rounded-[4px] text-[9px] font-black shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] flex items-center gap-1 hover:bg-red-500/40 transition"><i className="fas fa-trash-alt"></i></button>
                </>
              )}
            </div>
          </div>
          
          <h3 className="text-lg font-black text-white leading-tight mt-1.5 truncate drop-shadow-md relative z-10 pr-6">
            {pedidoSeleccionado.cliente_nombre}
            {esContpaqi && <span className="bg-white/10 border border-white/20 text-slate-200 px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase align-middle ml-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">CONTPAQI</span>}
          </h3>

          <div className="flex justify-between items-center mt-2 relative z-10">
             <span className="text-[10px] font-bold text-blue-200 flex items-center gap-1.5 drop-shadow-sm"><i className={`fas ${tipoEnvio.icon} opacity-70`}></i> {tipoEnvio.text}</span>
             {getBadgeEstado()}
          </div>
        </div>

        <div className="p-3 overflow-y-auto custom-scroll flex-1 min-h-0 space-y-3 pb-6 relative z-0">
          
          {/* INFO DE ENTREGA */}
          <div className="bg-white/40 backdrop-blur-lg border border-white/50 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.02)] overflow-hidden shrink-0 hover:bg-white/50 transition-colors">
            <button onClick={() => setSeccionInfo(!seccionInfo)} className="w-full flex justify-between items-center p-3">
              <h4 className="font-black text-[11px] text-slate-800 flex items-center gap-1.5"><i className="fas fa-map-marked-alt text-blue-600"></i> Info de Entrega</h4>
              <i className={`fas fa-chevron-${seccionInfo ? 'up' : 'down'} text-slate-500 text-xs transition-transform`}></i>
            </button>
            
            {seccionInfo && (
              <div className="p-3 pt-0 border-t border-white/40">
                <div className="bg-white/60 p-2.5 rounded-xl mb-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.03)] border border-white/60">
                  <span className="font-black text-[11px] text-slate-900">{pedidoSeleccionado.destino_alias || 'Destino Físico'}</span>
                  <p className="text-[10px] text-slate-600 font-medium leading-snug flex items-start gap-1 mt-1"><i className="fas fa-map-marker-alt text-red-500 mt-0.5 shrink-0"></i> {pedidoSeleccionado.direccion}</p>
                </div>

                {requiereCobro && (
                  <div className="bg-red-50/80 border border-red-200 rounded-xl p-3 flex justify-between items-center shadow-sm">
                     <div className="flex items-start gap-2">
                        <i className="fas fa-exclamation-triangle text-red-500 mt-0.5"></i>
                        <div>
                           <p className="text-[10px] font-black text-red-800 uppercase tracking-wide">Aviso de Cobranza</p>
                           <p className="text-[9px] font-medium text-red-600/80 leading-snug">Adeudo reportado</p>
                        </div>
                     </div>
                     <span className="text-sm font-black text-red-700">${saldo.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RUTA DE VIAJE Y DRAG AND DROP */}
          {(pedidoSeleccionado.estado === 'camino' || pedidoSeleccionado.estado === 'entregado') && paradasRuta.length > 0 && (
            <div className="bg-white/40 backdrop-blur-lg border border-white/50 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.02)] overflow-hidden shrink-0 mt-3 hover:bg-white/50 transition-colors">
              <button onClick={() => setSeccionTrayecto(!seccionTrayecto)} className="w-full flex justify-between items-center p-3">
                <h4 className="font-black text-[11px] text-slate-800 flex items-center gap-1.5"><i className="fas fa-route text-blue-600"></i> Ruta de Viaje</h4>
                <i className={`fas fa-chevron-${seccionTrayecto ? 'up' : 'down'} text-slate-500 text-xs transition-transform`}></i>
              </button>
              
              {seccionTrayecto && (
                <div className="p-3 pt-0 border-t border-white/40">
                  {pedidoSeleccionado.lote_id && (
                    <div className="mb-3 bg-blue-50/60 p-2 rounded-xl border border-blue-200/50 flex items-center justify-between shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
                       <span className="text-[9px] font-bold text-blue-800 uppercase">Lote Asignado:</span>
                       <span className="text-[9px] font-mono font-black text-blue-900 bg-white px-2 py-0.5 rounded-md shadow-sm border border-blue-100">{pedidoSeleccionado.lote_id}</span>
                    </div>
                  )}

                  <div className="relative border-l-2 border-dashed border-blue-300/50 ml-3 my-2 space-y-4 py-2">
                     {paradasRuta.map((parada, index) => {
                        const isPlanta = parada.tipo === 'origen' || parada.tipo === 'retorno';
                        const isDestino = parada.tipo === 'destino';
                        
                        // === MODIFICACIÓN: Drag & Drop activo tanto en rampa como en ruta ===
                        const draggabilityActive = isDestino && (esRampa || esEnRuta);

                        return (
                          <div 
                            key={parada.id + index} 
                            draggable={draggabilityActive}
                            onDragStart={(e) => draggabilityActive && handleDragStart(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => draggabilityActive && handleDragOver(e)}
                            onDrop={(e) => draggabilityActive && handleDrop(e, index)}
                            className={`relative flex items-center gap-3 pl-4 py-1 transition-all ${draggabilityActive ? 'cursor-grab active:cursor-grabbing hover:bg-white/50 rounded-lg' : ''} ${draggedIndex === index ? 'opacity-40 scale-95' : 'opacity-100'}`}
                          >
                             {draggabilityActive && (
                                <div className="absolute -left-6 text-slate-300 hover:text-blue-500">
                                   <i className="fas fa-grip-vertical text-[10px]"></i>
                                </div>
                             )}

                             <div className={`absolute -left-[11px] w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${isPlanta ? 'bg-slate-700' : 'bg-emerald-500'}`}>
                                {isPlanta ? <i className="fas fa-building text-white text-[9px]"></i> : <span className="text-white text-[9px] font-black">{index}</span>}
                             </div>
                             
                             <div className="flex-1">
                                <span className={`text-[10px] font-black ${isPlanta ? 'text-slate-600' : 'text-slate-800'} uppercase block`}>
                                  {parada.nombre}
                                </span>
                             </div>
                          </div>
                        )
                     })}
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200/50">
                     <div className="text-center bg-white/50 px-3 py-1.5 rounded-lg border border-white">
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Distancia</p>
                        <p className="text-xs font-black text-blue-900">{distanciaRuta} km</p>
                     </div>
                     
                     {esRampa && paradasRuta.filter(p => p.tipo === 'destino').length > 1 && (
                       <button onClick={handleOptimizar} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black shadow-md transition active:scale-95 flex items-center gap-1 border border-blue-400/50">
                          <i className="fas fa-magic"></i> Optimizar
                       </button>
                     )}

                     <div className="text-center bg-white/50 px-3 py-1.5 rounded-lg border border-white">
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
             <div className="bg-white/50 backdrop-blur-lg rounded-2xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-white/60 shrink-0 mt-3 flex justify-between items-center">
                <div>
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unidad Asignada</p>
                   <p className="text-[11px] font-black text-blue-900"><i className="fas fa-truck text-blue-500 mr-1"></i> {flota.find(v => v.id === pedidoSeleccionado.vehiculo_asignado)?.nombre || 'Sin unidad'}</p>
                   <p className="text-[10px] font-bold text-slate-600 mt-1"><i className="fas fa-user-tie text-slate-400 mr-1"></i> {choferes.find(c => c.id === pedidoSeleccionado.chofer_asignado)?.nombre || 'Sin operador'}</p>
                </div>
                <button 
                   onClick={() => {
                      setVehiculoId(pedidoSeleccionado.vehiculo_asignado);
                      setChoferId(pedidoSeleccionado.chofer_asignado);
                      setModoEdicionAsignacion(true);
                   }} 
                   className="bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 w-10 h-10 rounded-xl flex items-center justify-center transition shadow-sm shadow-black/5"
                   title="Reasignar Unidad o Chofer"
                >
                   <i className="fas fa-exchange-alt"></i>
                </button>
             </div>
          )}

          {(esPendiente || modoEdicionAsignacion) && (
             <div className="bg-gradient-to-br from-blue-800 to-indigo-900 backdrop-blur-xl rounded-2xl p-4 shadow-xl text-white border border-blue-600/50 relative shrink-0 mt-3 animate-fade-in">
                <div className="flex justify-between items-center mb-3">
                   <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-100">
                       <i className="fas fa-clipboard-check"></i> {modoEdicionAsignacion ? 'Corregir Asignación' : 'Asignar Unidad'}
                   </h4>
                   {modoEdicionAsignacion && (
                      <button onClick={() => setModoEdicionAsignacion(false)} className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-md text-[9px] font-bold border border-white/10 transition"><i className="fas fa-times"></i> Cancelar</button>
                   )}
                </div>
                
                {/* VALIDACIONES EN VIVO */}
                {errorEmpalme && (
                    <div className="bg-red-500/20 border border-red-400/50 text-red-100 text-[10px] p-2 rounded-lg mb-3 flex items-start gap-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                        <i className="fas fa-exclamation-triangle mt-0.5 text-red-400"></i> <span>{errorEmpalme}</span>
                    </div>
                )}
                {advertenciaChofer && !errorEmpalme && (
                    <div className="bg-amber-500/20 border border-amber-400/50 text-amber-100 text-[10px] p-2 rounded-lg mb-3 flex items-start gap-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                        <i className="fas fa-exclamation-circle mt-0.5 text-amber-400"></i> <span>El operador ya está armando otra unidad.</span>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {flota.map(v => {
                    const isSelected = vehiculoId === v.id;
                    return (
                      <button key={v.id} onClick={() => setVehiculoId(v.id)} className={`p-2 rounded-xl border text-[9px] font-bold transition-all text-center flex flex-col items-center gap-1.5 ${isSelected ? 'bg-white text-blue-900 border-white shadow-[0_2px_10px_rgba(255,255,255,0.3)] scale-105' : 'bg-white/5 border-white/20 text-blue-100 hover:bg-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]'}`}>
                        <i className={`fas ${v.pesado ? 'fa-truck-moving' : 'fa-truck'} text-lg ${isSelected ? 'text-blue-600' : 'opacity-70'}`}></i>
                        <span className="w-full truncate">{v.nombre}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative mb-3">
                  <select value={choferId} onChange={(e) => setChoferId(e.target.value)} className="w-full bg-black/20 border border-white/20 text-white p-3 pl-3 rounded-xl outline-none text-[11px] font-bold cursor-pointer appearance-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] focus:border-white/50 transition-colors">
                    <option value="" className="text-slate-800">-- Selecciona Operador --</option>
                    {choferes.map(c => (<option key={c.id} value={c.id} className="text-slate-800">{c.nombre}</option>))}
                  </select>
                </div>

                {esPendiente ? (
                    <button 
                       onClick={() => cambiarEstadoLogistico('rampa')} 
                       disabled={!!errorEmpalme}
                       className={`w-full font-black py-3 rounded-xl shadow-lg transition text-xs ${errorEmpalme ? 'bg-white/20 text-white/50 cursor-not-allowed border border-white/10' : 'bg-white text-blue-900 hover:bg-blue-50 active:scale-95 border border-white shadow-[0_4px_15px_rgba(0,0,0,0.2)]'}`}
                    >
                        <i className="fas fa-link"></i> Pre-Asignar a Rampa
                    </button>
                ) : (
                    <button 
                       onClick={() => cambiarEstadoLogistico('actualizar_asignacion')} 
                       disabled={!!errorEmpalme}
                       className={`w-full font-black py-3 rounded-xl shadow-lg transition text-xs ${errorEmpalme ? 'bg-white/20 text-white/50 cursor-not-allowed border border-white/10' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white active:scale-95 border border-emerald-400/50 shadow-[0_4px_15px_rgba(16,185,129,0.3)]'}`}
                    >
                        <i className="fas fa-save"></i> Guardar Cambios
                    </button>
                )}
             </div>
          )}

          {/* CONFIRMAR SALIDA (UI/UX GLASSMORPHISM) */}
          {esRampa && !modoEdicionAsignacion && (
             <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-[0_8px_30px_rgba(16,185,129,0.15)] mt-3 relative overflow-hidden flex flex-col gap-3">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/20 blur-3xl rounded-full pointer-events-none"></div>

                <div className="relative z-10">
                    <h4 className="text-[11px] font-black text-emerald-800 flex items-center gap-1.5 mb-1"><i className="fas fa-truck-fast text-emerald-500"></i> UNIDAD CARGADA</h4>
                    <p className="text-[10px] text-slate-600 leading-snug font-medium">Confirma la salida para generar el Lote de Viaje y comenzar la ruta.</p>
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                    <button onClick={() => cambiarEstadoLogistico('salida')} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black py-3.5 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 text-xs border border-emerald-400/50">
                       <i className="fas fa-play"></i> Iniciar Ruta Ahora
                    </button>
                    <button onClick={() => cambiarEstadoLogistico('reasignar')} className="w-full bg-white/50 hover:bg-white/80 text-slate-600 border border-slate-300/50 py-2.5 rounded-xl font-bold text-[10px] uppercase transition-colors shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] flex items-center justify-center gap-2">
                       <i className="fas fa-undo"></i> Regresar a Pendientes
                    </button>
                </div>
             </div>
          )}

          {/* ======= SECCIÓN: ACCIONES DE FALLA ======= */}
          {esFallido && (
             <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 shadow-[0_8px_30px_rgba(239,68,68,0.1)] mt-3 relative overflow-hidden flex flex-col gap-3">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-400/20 blur-3xl rounded-full pointer-events-none"></div>

                <div className="relative z-10">
                    <h4 className="text-[11px] font-black text-red-800 flex items-center gap-1.5 mb-1"><i className="fas fa-exclamation-circle text-red-500"></i> ORDEN NO ENTREGADA</h4>
                    <p className="text-[10px] text-slate-600 leading-snug font-medium">¿Qué deseas hacer con esta orden que regresó a la planta?</p>
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                    <button onClick={() => cambiarEstadoLogistico('reasignar')} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 rounded-xl shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 text-xs border border-blue-400/50">
                        <i className="fas fa-undo"></i> Reasignar a Pendientes
                    </button>
                    <button onClick={handleEliminar} className="w-full bg-white/50 hover:bg-white/80 text-red-600 border border-red-300/50 py-2.5 rounded-xl font-bold text-[10px] uppercase transition-colors shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] flex items-center justify-center gap-2">
                        <i className="fas fa-trash-alt"></i> Eliminar Orden
                    </button>
                </div>
             </div>
          )}

          {/* PANEL EVIDENCIAS Y REPORTES */}
          {(esEntregado || esFallido) && fotosEvidencia.length > 0 && (
             <div className="bg-white/40 backdrop-blur-lg border border-white/50 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.02)] overflow-hidden shrink-0 mt-3 hover:bg-white/50 transition-colors">
               <button onClick={() => setSeccionEvidencias(!seccionEvidencias)} className="w-full flex justify-between items-center p-3">
                 <h4 className="font-black text-[11px] text-slate-800 flex items-center gap-1.5"><i className="fas fa-camera text-blue-600"></i> Evidencias y Reportes</h4>
                 <i className={`fas fa-chevron-${seccionEvidencias ? 'up' : 'down'} text-slate-500 text-xs transition-transform`}></i>
               </button>
               
               {seccionEvidencias && (
                 <div className="p-3 pt-0 border-t border-white/40">
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {fotosEvidencia.map((foto, index) => (
                           <div key={index} className="relative group cursor-pointer overflow-hidden rounded-xl shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] border border-white/60 bg-white/50 p-1" onClick={() => setImagenModal(foto)}>
                              <img src={foto.url} alt={foto.titulo} className="w-full h-24 object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                 <i className="fas fa-search-plus text-white text-xl"></i>
                              </div>
                              <div className="absolute bottom-1 left-1 right-1 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4 text-center rounded-b-lg pointer-events-none">
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
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-4 transition-opacity duration-300">
           
           <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
              <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase shadow-lg shadow-black/20">
                 <i className="fas fa-camera mr-1.5"></i> {imagenModal.titulo}
              </span>
              <button onClick={() => setImagenModal(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/20 shadow-lg shadow-black/20">
                 <i className="fas fa-times text-lg"></i>
              </button>
           </div>

           <img src={imagenModal.url} alt="Evidencia en grande" className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl border border-white/10 relative z-0 bg-black/50" />
           
           <button onClick={() => descargarImagen(imagenModal.url, imagenModal.titulo)} className="mt-6 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black px-6 py-3 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-2 transition active:scale-95 z-10">
              <i className="fas fa-download"></i> Descargar Imagen
           </button>
        </div>
      )}

      {/* MODAL FALTANTES (LA TABLITA DIGITAL) */}
      {showFaltanteModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/50 p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2),inset_0_0_20px_rgba(255,255,255,0.8)] w-full max-w-sm transform-gpu relative overflow-hidden">
            {/* Resplandor decorativo */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-400/20 blur-3xl rounded-full pointer-events-none"></div>

            <div className="relative z-10">
                <h3 className="font-black text-slate-800 text-lg mb-1 flex items-center gap-2">
                <i className="fas fa-clipboard-list text-purple-600 drop-shadow-sm"></i> Reportar Faltante
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Se guardará en la tablita de pendientes</p>
                
                <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5 ml-1">¿Qué material faltó?</label>
                <textarea 
                value={descFaltante}
                onChange={(e) => setDescFaltante(e.target.value)}
                placeholder="Ej. Faltaron 5 cajas de... por falta de stock."
                className="w-full bg-white/50 border border-white/60 rounded-xl p-3 text-xs font-medium outline-none focus:border-purple-400 focus:bg-white/80 shadow-[inset_0_2px_5px_rgba(0,0,0,0.05)] transition-all mb-4"
                rows="3"
                ></textarea>

                <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5 ml-1">¿Cómo se le va a entregar?</label>
                <div className="flex gap-2 mb-6">
                <button 
                    onClick={() => setMetodoFaltante('envio')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1.5 transition-all duration-300 border shadow-sm ${metodoFaltante === 'envio' ? 'bg-blue-600 text-white border-blue-500 scale-[1.02] shadow-[0_5px_15px_rgba(37,99,235,0.3)]' : 'bg-white/50 text-slate-500 border-white/60 hover:bg-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]'}`}
                >
                    <i className="fas fa-truck-fast text-lg"></i>
                    Se enviará
                </button>
                <button 
                    onClick={() => setMetodoFaltante('mostrador')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1.5 transition-all duration-300 border shadow-sm ${metodoFaltante === 'mostrador' ? 'bg-emerald-500 text-white border-emerald-400 scale-[1.02] shadow-[0_5px_15px_rgba(16,185,129,0.3)]' : 'bg-white/50 text-slate-500 border-white/60 hover:bg-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]'}`}
                >
                    <i className="fas fa-store text-lg"></i>
                    Pasa a recoger
                </button>
                </div>

                <div className="flex gap-2">
                <button onClick={() => setShowFaltanteModal(false)} className="flex-1 bg-white/40 hover:bg-white/60 text-slate-600 font-black py-3 rounded-xl text-[11px] uppercase transition-colors border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]">Cancelar</button>
                <button onClick={handleGuardarFaltante} className="flex-[2] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3 rounded-xl text-[11px] uppercase transition-all shadow-[0_4px_15px_rgba(147,51,234,0.3)] border border-purple-400/50 flex justify-center items-center gap-2 active:scale-95">
                    <i className="fas fa-save"></i> Guardar en Tablita
                </button>
                </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default DetalleDrawer;
