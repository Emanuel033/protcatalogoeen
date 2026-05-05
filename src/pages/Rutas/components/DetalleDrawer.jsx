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
  const [seccionEvidencias, setSeccionEvidencias] = useState(true);

  // ESTADOS PARA EL VISOR DE IMÁGENES
  const [imagenModal, setImagenModal] = useState(null);

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

  const docs = pedidoSeleccionado?.documentacion || {};
  const esPendiente = pedidoSeleccionado.estado === 'pendiente';
  const esRampa = pedidoSeleccionado.estado === 'camino' && !pedidoSeleccionado.fecha_salida;
  const esEnRuta = pedidoSeleccionado.estado === 'camino' && pedidoSeleccionado.fecha_salida;
  const esFallido = pedidoSeleccionado.estado === 'fallido';
  const esEntregado = pedidoSeleccionado.estado === 'entregado';

  const esContpaqi = pedidoSeleccionado.origen?.toLowerCase() === 'contpaqi';
  const saldo = parseFloat(pedidoSeleccionado.saldo_pendiente || 0);
  const requiereCobro = pedidoSeleccionado.requiere_cobro || saldo > 0;

  // Ya no permitimos editar si está entregado o fallido
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

  const handleOptimizar = async () => { /* Logica igual */ };
  const handleEliminar = async () => { /* Logica igual */ };
  const cambiarEstadoLogistico = async (accion, masivo = false) => { /* Logica igual */ };

  // FUNCIÓN PARA DESCARGAR IMAGEN
  const descargarImagen = (url, titulo) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Evidencia_${titulo}_${pedidoSeleccionado.folio_pedido || 'SN'}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(console.error);
  };

  // RECOPILAMOS LAS FOTOS (Ajusta los nombres de las variables según tu base de datos)
  const fotosEvidencia = [];
  if (pedidoSeleccionado.foto_evidencia) fotosEvidencia.push({ url: pedidoSeleccionado.foto_evidencia, titulo: 'Evidencia General' });
  if (pedidoSeleccionado.foto_entrega) fotosEvidencia.push({ url: pedidoSeleccionado.foto_entrega, titulo: 'Fachada / Paquete' });
  if (pedidoSeleccionado.foto_firma) fotosEvidencia.push({ url: pedidoSeleccionado.foto_firma, titulo: 'Firma / Recibido' });


  return (
    <>
      <div className={`fixed inset-0 bg-slate-900/30 z-[45] transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>

      {alerta && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl font-black text-xs flex items-center gap-2 animate-bounce">
            <i className="fas fa-info-circle"></i> {alerta}
        </div>
      )}

      {/* DRAWER PRINCIPAL */}
      <div className={`fixed bottom-0 lg:top-4 lg:bottom-4 right-0 lg:right-4 w-full lg:w-[380px] h-[85vh] lg:h-[calc(100vh-2rem)] bg-white/80 backdrop-blur-md lg:rounded-3xl rounded-t-3xl shadow-2xl z-[50] flex flex-col overflow-hidden border border-white/50 transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-[120%]'}`}>
        
        {/* HEADER */}
        <div className="bg-blue-800/90 p-4 shrink-0 relative shadow-lg z-10 border-b border-blue-900/50">
          <button onClick={onClose} className="absolute top-4 right-4 text-blue-100 hover:text-white transition bg-white/20 w-8 h-8 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
          
          <div className="flex justify-between items-start mb-1 pr-8">
            <div className="flex gap-1.5 items-center">
              {pedidoSeleccionado.folio_pedido && (<span className="text-[9px] font-mono font-black text-blue-900 bg-white px-1.5 py-0.5 rounded shadow-sm">PED: {pedidoSeleccionado.folio_pedido}</span>)}
              {/* EL BOTÓN EDITAR SE OCULTA SI ESTÁ ENTREGADO O FALLIDO */}
              {permiteEditar && (
                <button onClick={() => onEdit(pedidoSeleccionado)} className="text-amber-900 bg-amber-400 px-2 py-0.5 rounded text-[9px] font-black shadow-sm flex items-center gap-1 hover:bg-amber-300 transition"><i className="fas fa-edit"></i> Editar</button>
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

          {/* ASIGNACIÓN DE UNIDAD (Solo si es pendiente o modo edición) */}
          {(esPendiente || modoEdicionAsignacion) && (
             <div className="bg-blue-800/90 rounded-2xl p-4 shadow-xl text-white border border-blue-700 relative shrink-0 mt-3">
                <h4 className="text-[10px] font-black uppercase tracking-wider mb-3 text-white">
                    <i className="fas fa-clipboard-check"></i> {modoEdicionAsignacion ? 'Corregir Asignación' : 'Asignar Unidad'}
                </h4>
                
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
                    <button onClick={() => cambiarEstadoLogistico('rampa')} className="w-full bg-white text-blue-800 font-black py-3 rounded-xl shadow-lg hover:bg-slate-100 transition active:scale-95 text-xs">
                        <i className="fas fa-link"></i> Pre-Asignar
                    </button>
                ) : (
                    <button onClick={() => cambiarEstadoLogistico('actualizar_asignacion')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 text-xs">
                        <i className="fas fa-save"></i> Guardar Cambios
                    </button>
                )}
             </div>
          )}

          {/* NUEVO PANEL: EVIDENCIAS Y REPORTES */}
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
                              <img src={foto.url} alt={foto.titulo} className="w-full h-24 object-cover transform group-hover:scale-105 transition-transform duration-300" />
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

      {/* MODAL VISOR DE IMÁGENES (PANTALLA COMPLETA) */}
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

           <img src={imagenModal.url} alt="Evidencia en grande" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl border border-white/10 relative z-0" />
           
           <button onClick={() => descargarImagen(imagenModal.url, imagenModal.titulo)} className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl shadow-lg border border-blue-400 flex items-center gap-2 transition active:scale-95 z-10">
              <i className="fas fa-download"></i> Descargar Imagen
           </button>
        </div>
      )}
    </>
  );
};

export default DetalleDrawer;