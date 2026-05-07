import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLogistica } from '../context/LogisticaContext';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
};

const FormularioOrden = ({ isOpen, onClose, ordenAEditar = null }) => {
  const { clientes, fleteras } = useLogistica();
  const clientesLista = clientes || [];
  
  const [folioPedido, setFolioPedido] = useState('');
  const [folioFactura, setFolioFactura] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [codigoSAP, setCodigoSAP] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [metodoEnvio, setMetodoEnvio] = useState('bodega_cliente');
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState('');
  const [aliasDestino, setAliasDestino] = useState('');
  const [direccionFisica, setDireccionFisica] = useState('');
  const [telefonoBodega, setTelefonoBodega] = useState('');
  const [horariosEntrega, setHorariosEntrega] = useState('');
  const [linkMaps, setLinkMaps] = useState('');
  const [docs, setDocs] = useState({ factura: true, certificados: false, orden_compra: false, envio_ciego: false });
  const [posicionPin, setPosicionPin] = useState({ lat: 25.6866, lng: -100.3161 });
  const markerRef = useRef(null);

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState(''); 

  // --- EXTRACTOR AUTOMÁTICO DE COORDENADAS DESDE LINK ---
  useEffect(() => {
    if (linkMaps && linkMaps.includes('@')) {
        const match = linkMaps.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match && match.length >= 3) {
            const newLat = parseFloat(match[1]);
            const newLng = parseFloat(match[2]);
            if (!isNaN(newLat) && !isNaN(newLng)) {
                setPosicionPin({ lat: newLat, lng: newLng });
            }
        }
    }
  }, [linkMaps]);

  useEffect(() => {
    if (isOpen) {
      if (ordenAEditar) {
        setFolioPedido(ordenAEditar.folio_pedido || '');
        setFolioFactura(ordenAEditar.folio_factura || '');
        setClienteNombre(ordenAEditar.cliente_nombre || '');
        setCodigoSAP(ordenAEditar.cliente_codigo || '');
        setTelefonoCliente(ordenAEditar.telefono_contacto || '');
        setUrgente(ordenAEditar.urgente || false);
        setMetodoEnvio(ordenAEditar.tipo_envio || 'bodega_cliente');
        setAliasDestino(ordenAEditar.destino_alias || '');
        setDireccionFisica(ordenAEditar.direccion || '');
        setTelefonoBodega(ordenAEditar.destino_telefono || '');
        setHorariosEntrega(ordenAEditar.destino_horario || '');
        setLinkMaps(ordenAEditar.link_maps || '');
        setDocs(ordenAEditar.documentacion || { factura: true, certificados: false, orden_compra: false, envio_ciego: false });
        if (ordenAEditar.coordenadas?.lat) setPosicionPin(ordenAEditar.coordenadas);

        const foundClient = clientesLista.find(c => 
            (c.nombre?.toUpperCase() === (ordenAEditar.cliente_nombre || '').toUpperCase()) ||
            (ordenAEditar.cliente_codigo && ordenAEditar.cliente_codigo !== 'S/C' && c.codigo?.toUpperCase() === ordenAEditar.cliente_codigo.toUpperCase())
        );
        setClienteSeleccionado(foundClient || null);
      } else {
        setFolioPedido(''); setFolioFactura(''); setClienteNombre(''); setCodigoSAP('');
        setTelefonoCliente(''); setUrgente(false); setMetodoEnvio('bodega_cliente');
        setBodegaSeleccionada(''); setAliasDestino(''); setDireccionFisica('');
        setTelefonoBodega(''); setHorariosEntrega(''); setLinkMaps('');
        setDocs({ factura: true, certificados: false, orden_compra: false, envio_ciego: false });
        setPosicionPin({ lat: 25.6866, lng: -100.3161 });
        setClienteSeleccionado(null);
      }
    }
  }, [isOpen, ordenAEditar, clientesLista]);

  const clientesFiltrados = clientesLista.filter(c => {
    if (filtroActivo === 'nombre' && clienteNombre.length > 0) return c.nombre?.toLowerCase().includes(clienteNombre.toLowerCase());
    if (filtroActivo === 'codigo' && codigoSAP.length > 0) return c.codigo?.toLowerCase().includes(codigoSAP.toLowerCase());
    return false;
  });

  const eventHandlers = useMemo(() => ({
    dragend() { const marker = markerRef.current; if (marker != null) setPosicionPin(marker.getLatLng()); },
  }), []);

  const isBodega = metodoEnvio === 'bodega_cliente';
  const listaDestinos = isBodega ? (clienteSeleccionado?.direcciones || []) : (fleteras || []);

  const handleDestinoChange = (e) => {
    const val = e.target.value;
    setBodegaSeleccionada(val);
    
    if (val === '' || val === 'nueva') {
        setAliasDestino(''); 
        setDireccionFisica(''); 
        setTelefonoBodega(''); 
        setHorariosEntrega(''); 
        setLinkMaps('');
        return;
    }

    const destino = listaDestinos[val]; 
    if (destino) {
        setAliasDestino(destino.alias || destino.nombre || '');
        setDireccionFisica(destino.direccion || '');
        setTelefonoBodega(destino.telefono || '');
        setHorariosEntrega(destino.horario || '');
        setLinkMaps(destino.link_maps || '');
        if (destino.coordenadas && !isNaN(destino.coordenadas.lat)) {
            setPosicionPin({ lat: destino.coordenadas.lat, lng: destino.coordenadas.lng });
        }
    }
  };

  const handleGuardar = async () => {
    // ==========================================
    // 🛡️ VALIDACIONES ESTRICTAS BLINDADAS 🛡️
    // ==========================================
    const nombreLimpio = (clienteNombre || '').trim().toUpperCase();
    const codigoLimpio = (codigoSAP || '').trim().toUpperCase();
    const pedidoLimpio = (folioPedido || '').trim().toUpperCase();
    const facturaLimpia = (folioFactura || '').trim().toUpperCase();
    const direccionLimpia = (direccionFisica || '').trim();

    // Regex: Empieza opcionalmente con "C" (^C?) y luego tiene uno o más números (\d+), hasta el final ($)
    const formatoCodigoValido = /^C?\d+$/.test(codigoLimpio);

    if (!codigoLimpio) {
        alert("⚠️ ERROR: El CÓDIGO SAP es obligatorio.");
        return;
    }
    if (!formatoCodigoValido) {
        alert("⚠️ ERROR: Formato de CÓDIGO SAP inválido.\n\nDebe ser la letra 'C' seguida de números (ej. C1234) o exclusivamente números (ej. 1234).");
        return;
    }
    if (!nombreLimpio) {
        alert("⚠️ ERROR: La Razón Social / Nombre del cliente es obligatoria.");
        return;
    }
    if (!pedidoLimpio && !facturaLimpia) {
        alert("⚠️ ERROR: Debes ingresar al menos el Folio de Pedido o el Folio de Factura.");
        return;
    }
    if (!metodoEnvio) {
        alert("⚠️ ERROR: Debes seleccionar un Método de Envío válido (Reparto Local o Fletera).");
        return;
    }
    if (!direccionLimpia) {
        alert("⚠️ ERROR: La Dirección Exacta es obligatoria.");
        return;
    }

    // Si pasamos las validaciones, procedemos al guardado
    let clienteIdVinculado = ordenAEditar?.cliente_id_vinculado || null;
    let fleteraIdVinculada = ordenAEditar?.fletera_asignada_id || null;
    
    try {
        // --- 1. GESTIÓN DEL CLIENTE EN CATÁLOGO (BÚSQUEDA OR: NOMBRE O CÓDIGO) ---
        const clienteExistente = clientesLista.find(c => {
            const matchNombre = c.nombre?.toUpperCase() === nombreLimpio;
            const matchCodigo = c.codigo?.toUpperCase() === codigoLimpio;
            return matchNombre || matchCodigo;
        });

        if (clienteExistente) {
            clienteIdVinculado = clienteExistente.id;
            
            // Preparamos los datos para ACTUALIZAR el cliente
            let datosAActualizarCliente = {
                nombre: nombreLimpio,
                codigo: codigoLimpio,
                telefono: telefonoCliente || ''
            };
            
            if (isBodega) {
                let direccionesActuales = [...(clienteExistente.direcciones || [])];
                const nuevaDireccionObj = {
                    alias: aliasDestino.trim() || 'Bodega Principal',
                    direccion: direccionLimpia,
                    telefono: telefonoBodega.trim() || '',
                    horario: horariosEntrega.trim() || '',
                    link_maps: linkMaps.trim() || '',
                    coordenadas: { lat: posicionPin.lat, lng: posicionPin.lng }
                };

                const indexDir = direccionesActuales.findIndex(
                    d => d.direccion.toLowerCase() === direccionLimpia.toLowerCase() ||
                         d.alias.toLowerCase() === nuevaDireccionObj.alias.toLowerCase()
                );

                if (indexDir >= 0) {
                    direccionesActuales[indexDir] = { ...direccionesActuales[indexDir], ...nuevaDireccionObj }; 
                } else {
                    direccionesActuales.push(nuevaDireccionObj); 
                }

                datosAActualizarCliente.direcciones = direccionesActuales;
            }

            await updateDoc(doc(db, 'clientes_logistica', clienteExistente.id), datosAActualizarCliente);

        } else {
            // SI NO SE ENCUENTRA, SE CREA NUEVO
            const nuevoClienteData = {
                nombre: nombreLimpio,
                codigo: codigoLimpio,
                telefono: telefonoCliente || '',
                direcciones: [],
                fecha_creacion: serverTimestamp()
            };

            if (isBodega) {
                nuevoClienteData.direcciones.push({
                    alias: aliasDestino.trim() || 'Bodega Principal',
                    direccion: direccionLimpia,
                    telefono: telefonoBodega.trim() || '',
                    horario: horariosEntrega.trim() || '',
                    link_maps: linkMaps.trim() || '',
                    coordenadas: { lat: posicionPin.lat, lng: posicionPin.lng }
                });
            }

            const docRef = await addDoc(collection(db, 'clientes_logistica'), nuevoClienteData);
            clienteIdVinculado = docRef.id; 
        }

        // --- 2. GESTIÓN DE FLETERAS MANUALES ---
        if (!isBodega && aliasDestino.trim()) {
            const fleteraExistente = fleteras.find(f => f.nombre.toUpperCase() === aliasDestino.trim().toUpperCase());
            if (fleteraExistente) {
                fleteraIdVinculada = fleteraExistente.id;
            } else {
                const nuevaFleteraObj = {
                    nombre: aliasDestino.trim().toUpperCase(),
                    direccion: direccionLimpia,
                    telefono: telefonoBodega.trim() || '',
                    link_maps: linkMaps.trim() || '',
                    coordenadas: { lat: posicionPin.lat, lng: posicionPin.lng }
                };
                const fRef = await addDoc(collection(db, 'catalogo_fleteras'), nuevaFleteraObj);
                fleteraIdVinculada = fRef.id;
            }
        }

        // --- 3. GUARDAR EL VIAJE ---
        const payload = {
            folio_pedido: pedidoLimpio || null,
            folio_factura: facturaLimpia || null,
            cliente_codigo: codigoLimpio,
            cliente_nombre: nombreLimpio,
            telefono_contacto: telefonoCliente || null,
            tipo_envio: metodoEnvio,
            destino_alias: aliasDestino.trim(),
            direccion: direccionLimpia,
            destino_telefono: telefonoBodega.trim(),
            destino_horario: horariosEntrega.trim(),
            link_maps: linkMaps.trim() || null,
            coordenadas: { lat: posicionPin.lat, lng: posicionPin.lng },
            documentacion: docs,
            urgente: urgente,
            cliente_id_vinculado: clienteIdVinculado, 
            fletera_asignada_id: isBodega ? null : fleteraIdVinculada, 
            fecha_actualizacion: serverTimestamp()
        };

        if(ordenAEditar?.id) {
            await updateDoc(doc(db, 'rutas_logistica', ordenAEditar.id), payload);
        } else {
            payload.estado = 'pendiente';
            payload.fecha_creacion = serverTimestamp();
            await addDoc(collection(db, 'rutas_logistica'), payload);
        }
        onClose(); 
    } catch(e) { 
        console.error(e); 
        alert("Error al guardar en base de datos. Verifica tu cuota de Firebase. Detalle: " + e.message); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[98vh] sm:max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-slate-900/70 border-b border-white/20 p-4 sm:p-5 text-white flex justify-between items-center shrink-0 shadow-md z-20">
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2 drop-shadow-sm">
            <i className={`fas ${ordenAEditar ? 'fa-edit text-amber-400' : 'fa-box-open text-blue-300'}`}></i> 
            {ordenAEditar ? 'Editar Orden' : 'Nueva Orden de Entrega'}
          </h3>
          <button onClick={onClose} className="text-white hover:text-red-200 transition w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/50 flex items-center justify-center border border-white/20"><i className="fas fa-times"></i></button>
        </div>
        
        {/* CUERPO DEL FORMULARIO */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="space-y-4">
              <div className="bg-white/60 p-4 rounded-2xl shadow-sm border border-white/60">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <i className="fas fa-hashtag"></i> Identificadores <span className="text-[9px] text-red-500 font-bold ml-2">(Al menos uno *)</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-bold text-slate-700 mb-1">Folio de Pedido</label><input type="text" value={folioPedido} onChange={e => setFolioPedido(e.target.value)} className="w-full border border-white/80 rounded-xl p-2.5 focus:border-blue-400 outline-none text-sm font-bold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="PED-123" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-700 mb-1">Folio de Factura</label><input type="text" value={folioFactura} onChange={e => setFolioFactura(e.target.value)} className="w-full border border-emerald-200 rounded-xl p-2.5 focus:border-emerald-400 outline-none text-sm font-bold text-emerald-900 bg-emerald-50/80 focus:bg-emerald-50 transition" placeholder="FAC-456" /></div>
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-2xl shadow-sm border border-white/60 relative">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5"><i className="fas fa-user-tag"></i> Información del Cliente</h4>
                <div className="grid grid-cols-3 gap-3 mb-3 relative">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Cód. SAP <span className="text-red-500">*</span></label>
                    <input type="text" value={codigoSAP} onChange={e => { setCodigoSAP(e.target.value); setFiltroActivo('codigo'); setMostrarSugerencias(true); }} onFocus={() => { setFiltroActivo('codigo'); setMostrarSugerencias(true); }} className="w-full border border-white/80 rounded-xl p-2.5 focus:border-blue-400 outline-none text-sm font-mono font-bold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="C1234" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Razón Social <span className="text-red-500">*</span></label>
                    <input type="text" value={clienteNombre} onChange={e => { setClienteNombre(e.target.value); setFiltroActivo('nombre'); setMostrarSugerencias(true); }} onFocus={() => { setFiltroActivo('nombre'); setMostrarSugerencias(true); }} className="w-full border border-white/80 rounded-xl p-2.5 focus:border-blue-400 outline-none text-sm font-bold text-slate-800 bg-white/80 focus:bg-white transition" />
                  </div>
                  {mostrarSugerencias && clientesFiltrados.length > 0 && (
                    <ul className="absolute top-[65px] left-0 z-50 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                      {clientesFiltrados.map((cliente) => (
                        <li key={cliente.id} onClick={() => { setClienteNombre(cliente.nombre); setCodigoSAP(cliente.codigo !== 'S/C' ? cliente.codigo : ''); setTelefonoCliente(cliente.telefono || ''); setClienteSeleccionado(cliente); setMostrarSugerencias(false); }} className="p-3 text-xs border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center">
                          <span className="font-bold text-slate-800">{cliente.nombre}</span><span className="text-[10px] text-blue-700 font-mono bg-blue-100 px-2 py-0.5 rounded">{cliente.codigo}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-2xl shadow-sm border border-white/60">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5"><i className="fas fa-file-contract"></i> Documentación</h4>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`cursor-pointer flex justify-center items-center gap-1.5 p-2 border rounded-xl transition font-bold text-[10px] ${docs.factura ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-white/80 text-slate-700 border-white hover:bg-white'}`}><input type="checkbox" checked={docs.factura} onChange={e => setDocs({...docs, factura: e.target.checked})} className="hidden" />Factura</label>
                  <label className={`cursor-pointer flex justify-center items-center gap-1.5 p-2 border rounded-xl transition font-bold text-[10px] ${docs.certificados ? 'bg-amber-500 text-white border-amber-400 shadow-md' : 'bg-white/80 text-slate-700 border-white hover:bg-white'}`}><input type="checkbox" checked={docs.certificados} onChange={e => setDocs({...docs, certificados: e.target.checked})} className="hidden" />Certificados</label>
                  <label className={`cursor-pointer flex justify-center items-center gap-1.5 p-2 border rounded-xl transition font-bold text-[10px] ${docs.orden_compra ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-white/80 text-slate-700 border-white hover:bg-white'}`}><input type="checkbox" checked={docs.orden_compra} onChange={e => setDocs({...docs, orden_compra: e.target.checked})} className="hidden" />O. Compra</label>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="space-y-4 flex flex-col h-full">
              <div className="bg-white/60 p-4 rounded-2xl shadow-sm border border-white/60 shrink-0">
                <div className="flex justify-between items-center mb-3 border-b border-white/80 pb-2">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5"><i className="fas fa-route"></i> Destino Físico</h4>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20"><input type="checkbox" checked={urgente} onChange={e => setUrgente(e.target.checked)} /><span className="text-[10px] font-black text-red-700 uppercase">Urgente</span></label>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Método de Envío <span className="text-red-500">*</span></label>
                    <select value={metodoEnvio} onChange={e => { setMetodoEnvio(e.target.value); setBodegaSeleccionada(''); }} className="w-full border border-white/80 rounded-xl p-2 text-xs font-bold text-slate-800 bg-white/80 focus:bg-white transition">
                      <option value="bodega_cliente">Reparto Local</option><option value="fletera_domicilio">Fletera (A Domicilio)</option><option value="fletera_ocurre">Fletera (Ocurre)</option>
                    </select>
                  </div>
                  <div className={`p-2 rounded-xl border ${isBodega ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'}`}>
                     <label className="block text-[10px] font-bold mb-1 uppercase text-slate-600">{isBodega ? 'Direcciones del Cliente' : 'Catálogo de Fleteras'}</label>
                     <select value={bodegaSeleccionada} onChange={handleDestinoChange} className="w-full border rounded-xl p-2 text-xs font-bold bg-white">
                        <option value="">- Selecciona -</option>
                        {listaDestinos.map((dest, i) => (<option key={i} value={i}>{dest.alias || dest.nombre}</option>))}
                        <option value="nueva">+ Agregar Nueva...</option>
                     </select>
                  </div>
                  <div><label className="block text-[10px] font-bold text-slate-700 mb-1">Nombre / Alias del Destino</label><input type="text" value={aliasDestino} onChange={e => setAliasDestino(e.target.value)} className="w-full border border-white/80 rounded-xl p-2 text-xs font-semibold text-slate-800 bg-white/80 focus:bg-white transition" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-700 mb-1">Dirección Exacta <span className="text-red-500">*</span></label><textarea rows="2" value={direccionFisica} onChange={e => setDireccionFisica(e.target.value)} className="w-full border border-white/80 rounded-xl p-2 text-xs font-semibold text-slate-800 bg-white/80 focus:bg-white transition resize-none"></textarea></div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Link de Google Maps</label>
                    <div className="relative"><i className="fas fa-map-marker-alt absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i><input type="text" value={linkMaps} onChange={e => setLinkMaps(e.target.value)} className="w-full border border-white/80 rounded-xl py-2 pl-8 pr-2 text-xs font-semibold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="Pega el link aquí para ubicar el pin" /></div>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 p-2 rounded-2xl shadow-sm border border-white/60 flex-1 flex flex-col min-h-[220px]">
                <div className="flex justify-between items-center px-2 pb-1"><span className="text-[10px] font-bold text-blue-800">Ubicación en Mapa</span><span className="text-[10px] font-mono text-slate-600">{posicionPin.lat.toFixed(6)}, {posicionPin.lng.toFixed(6)}</span></div>
                <div className="flex-1 rounded-xl overflow-hidden relative z-0 border border-white">
                  <MapContainer center={[posicionPin.lat, posicionPin.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><RecenterMap lat={posicionPin.lat} lng={posicionPin.lng} /><Marker draggable={true} eventHandlers={eventHandlers} position={posicionPin} ref={markerRef}/>
                  </MapContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* FOOTER */}
        <div className="p-4 border-t border-white/40 bg-white/40 shrink-0 flex gap-3 z-20">
          <button onClick={onClose} className="flex-1 bg-white/60 border border-white text-slate-700 font-bold py-3 rounded-xl hover:bg-white transition text-xs">Cancelar</button>
          <button onClick={handleGuardar} className="flex-[2] bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg hover:bg-blue-700 transition active:scale-95 text-xs flex items-center justify-center gap-2">
            <i className="fas fa-save"></i> Guardar Logística
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormularioOrden;
