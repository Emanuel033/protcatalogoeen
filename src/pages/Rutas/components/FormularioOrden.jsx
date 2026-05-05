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
      } else {
        setFolioPedido(''); setFolioFactura(''); setClienteNombre(''); setCodigoSAP('');
        setTelefonoCliente(''); setUrgente(false); setMetodoEnvio('bodega_cliente');
        setBodegaSeleccionada(''); setAliasDestino(''); setDireccionFisica('');
        setTelefonoBodega(''); setHorariosEntrega(''); setLinkMaps('');
        setDocs({ factura: true, certificados: false, orden_compra: false, envio_ciego: false });
        setPosicionPin({ lat: 25.6866, lng: -100.3161 });
      }
    }
  }, [isOpen, ordenAEditar]);

  const clientesLista = clientes || [];
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
        setAliasDestino(''); setDireccionFisica(''); setTelefonoBodega(''); setHorariosEntrega(''); setLinkMaps('');
        return;
    }
    const destino = listaDestinos[val]; 
    if (destino) {
        setAliasDestino(destino.alias || destino.nombre || '');
        setDireccionFisica(destino.direccion || '');
        setTelefonoBodega(destino.telefono || '');
        setHorariosEntrega(destino.horario || '');
        setLinkMaps(destino.link_maps || '');
        if (destino.coordenadas && !isNaN(destino.coordenadas.lat)) setPosicionPin(destino.coordenadas);
    }
  };

  const handleGuardar = async () => {
    if(!clienteNombre || !direccionFisica || isNaN(posicionPin.lat) || isNaN(posicionPin.lng)) { alert("Cliente y Dirección son obligatorios"); return; }

    const payload = {
        folio_pedido: folioPedido || null,
        folio_factura: folioFactura || null,
        cliente_codigo: codigoSAP || null,
        cliente_nombre: clienteNombre,
        telefono_contacto: telefonoCliente || null,
        tipo_envio: metodoEnvio,
        destino_alias: aliasDestino,
        direccion: direccionFisica,
        destino_telefono: telefonoBodega,
        destino_horario: horariosEntrega,
        link_maps: linkMaps || null,
        coordenadas: { lat: posicionPin.lat, lng: posicionPin.lng },
        documentacion: docs,
        urgente: urgente,
        fecha_actualizacion: serverTimestamp()
    };

    try {
        if(ordenAEditar?.id) {
            await updateDoc(doc(db, 'rutas_logistica', ordenAEditar.id), payload);
        } else {
            payload.estado = 'pendiente';
            payload.fecha_creacion = serverTimestamp();
            payload.fecha_salida = null;
            payload.fecha_entrega = null;
            payload.lote_id = null;
            await addDoc(collection(db, 'rutas_logistica'), payload);
        }
        onClose(); 
    } catch(e) { console.error(e); alert("Error al guardar en base de datos"); }
  };

  if (!isOpen) return null;

  return (
    // CONTENEDOR PRINCIPAL: Solo fondo oscuro, SIN BLUR
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-2 sm:p-4">
      {/* MODAL: Aquí va el cristal maestro, SIN transform-gpu */}
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[98vh] sm:max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-slate-900/70 border-b border-white/20 p-4 sm:p-5 text-white flex justify-between items-center shrink-0 shadow-md z-20">
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2 drop-shadow-sm">
            <i className={`fas ${ordenAEditar ? 'fa-edit text-amber-400' : 'fa-box-open text-blue-300'}`}></i> 
            {ordenAEditar ? 'Editar Orden' : 'Orden de Entrega'}
          </h3>
          <button onClick={onClose} className="text-white hover:text-red-200 transition w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/50 flex items-center justify-center border border-white/20"><i className="fas fa-times"></i></button>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            
            <div className="space-y-4">
              {/* PANELES SIN BLUR ADICIONAL, solo fondo traslucido */}
              <div className="bg-white/60 p-4 rounded-2xl shadow-sm border border-white/60">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5"><i className="fas fa-hashtag"></i> Identificadores</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-bold text-slate-700 mb-1">Folio de Pedido</label><input type="text" value={folioPedido} onChange={e => setFolioPedido(e.target.value)} className="w-full border border-white/80 rounded-xl p-2.5 focus:border-blue-400 outline-none text-sm font-bold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="Ej. PED-1025" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-700 mb-1">Folio de Factura</label><input type="text" value={folioFactura} onChange={e => setFolioFactura(e.target.value)} className="w-full border border-emerald-200 rounded-xl p-2.5 focus:border-emerald-400 outline-none text-sm font-bold text-emerald-900 bg-emerald-50/80 focus:bg-emerald-50 transition" placeholder="Ej. FAC-A992" /></div>
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-2xl shadow-sm border border-white/60 relative">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5"><i className="fas fa-user-tag"></i> Información del Cliente</h4>
                <div className="grid grid-cols-3 gap-3 mb-3 relative">
                  <div className="col-span-1"><label className="block text-[10px] font-bold text-slate-700 mb-1">Cód. SAP</label><input type="text" value={codigoSAP} onChange={e => { setCodigoSAP(e.target.value); setFiltroActivo('codigo'); setMostrarSugerencias(true); }} onFocus={() => { setFiltroActivo('codigo'); setMostrarSugerencias(true); }} onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)} className="w-full border border-white/80 rounded-xl p-2.5 focus:border-blue-400 outline-none text-sm font-mono font-bold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="C001" /></div>
                  <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-700 mb-1">Razón Social / Nombre</label><input type="text" value={clienteNombre} onChange={e => { setClienteNombre(e.target.value); setFiltroActivo('nombre'); setMostrarSugerencias(true); }} onFocus={() => { setFiltroActivo('nombre'); setMostrarSugerencias(true); }} onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)} className="w-full border border-white/80 rounded-xl p-2.5 focus:border-blue-400 outline-none text-sm font-bold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="Escribe para buscar..." /></div>
                  {mostrarSugerencias && clientesFiltrados.length > 0 && (
                    <ul className="absolute top-[65px] left-0 z-50 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                      {clientesFiltrados.map((cliente) => (
                        <li key={cliente.id} onClick={() => { setClienteNombre(cliente.nombre); setCodigoSAP(cliente.codigo && cliente.codigo !== 'S/C' ? cliente.codigo : ''); setTelefonoCliente(cliente.telefono || ''); setClienteSeleccionado(cliente); setMostrarSugerencias(false); }} className="p-3 text-xs border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center">
                          <span className="font-bold text-slate-800 truncate pr-2">{cliente.nombre}</span><span className="text-[10px] text-blue-700 font-mono font-bold bg-blue-100/50 px-2 py-0.5 rounded border border-blue-200 shrink-0">{cliente.codigo !== 'S/C' ? cliente.codigo : 'Sin Cód'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Teléfono Contacto Cliente</label>
                  <div className="relative"><i className="fas fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i><input type="text" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} className="w-full border border-white/80 rounded-xl py-2.5 pl-9 pr-3 focus:border-blue-400 outline-none text-sm font-bold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="Ej. 81 1234 5678" /></div>
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-2xl shadow-sm border border-white/60">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5"><i className="fas fa-file-contract"></i> Documentación a Entregar</h4>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`cursor-pointer flex justify-center items-center gap-1.5 p-2 border rounded-xl transition font-bold text-[10px] ${docs.factura ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-white/80 text-slate-700 border-white hover:bg-white'}`}><input type="checkbox" checked={docs.factura} onChange={e => setDocs({...docs, factura: e.target.checked})} className="hidden" /><i className="fas fa-file-invoice"></i> Factura</label>
                  <label className={`cursor-pointer flex justify-center items-center gap-1.5 p-2 border rounded-xl transition font-bold text-[10px] ${docs.certificados ? 'bg-amber-500 text-white border-amber-400 shadow-md' : 'bg-white/80 text-slate-700 border-white hover:bg-white'}`}><input type="checkbox" checked={docs.certificados} onChange={e => setDocs({...docs, certificados: e.target.checked})} className="hidden" /><i className="fas fa-certificate"></i> Certificados</label>
                  <label className={`cursor-pointer flex justify-center items-center gap-1.5 p-2 border rounded-xl transition font-bold text-[10px] ${docs.orden_compra ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-white/80 text-slate-700 border-white hover:bg-white'}`}><input type="checkbox" checked={docs.orden_compra} onChange={e => setDocs({...docs, orden_compra: e.target.checked})} className="hidden" /><i className="fas fa-file-signature"></i> O. Compra</label>
                  <label className={`col-span-3 cursor-pointer flex justify-center items-center gap-1.5 p-2 border rounded-xl transition font-bold text-[10px] ${docs.envio_ciego ? 'bg-slate-800 text-white border-slate-600 shadow-md' : 'bg-white/80 text-slate-700 border-white hover:bg-white'}`}><input type="checkbox" checked={docs.envio_ciego} onChange={e => setDocs({...docs, envio_ciego: e.target.checked})} className="hidden" /><i className="fas fa-user-secret"></i> Envío Ciego (Sin Logos)</label>
                </div>
              </div>
            </div>

            <div className="space-y-4 flex flex-col h-full">
              <div className="bg-white/60 p-4 rounded-2xl shadow-sm border border-white/60 shrink-0">
                <div className="flex justify-between items-center mb-3 border-b border-white/80 pb-2">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5"><i className="fas fa-route"></i> Destino Físico</h4>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition"><input type="checkbox" checked={urgente} onChange={e => setUrgente(e.target.checked)} className="w-3 h-3 text-red-600 rounded border-red-400 focus:ring-red-500" /><span className="text-[10px] font-black text-red-700 uppercase">Urgente</span></label>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Método de Envío</label>
                    <select value={metodoEnvio} onChange={e => { setMetodoEnvio(e.target.value); setBodegaSeleccionada(''); }} className="w-full border border-white/80 rounded-xl p-2 focus:border-blue-400 outline-none text-xs font-bold text-slate-800 bg-white/80 focus:bg-white cursor-pointer transition">
                      <option value="bodega_cliente">Reparto Local (Directo a Cliente)</option><option value="fletera_domicilio">Fletera Foránea (A Domicilio)</option><option value="fletera_ocurre">Fletera Foránea (Ocurre)</option>
                    </select>
                  </div>
                  <div className={`p-2 rounded-xl border ${isBodega ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'}`}>
                     <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wide ${isBodega ? 'text-blue-900' : 'text-purple-900'}`}>{isBodega ? 'Bodegas del Cliente' : 'Catálogo Global de Fleteras'}</label>
                     <select value={bodegaSeleccionada} onChange={handleDestinoChange} className={`w-full border rounded-xl p-2 outline-none text-xs font-bold cursor-pointer bg-white transition ${isBodega ? 'border-blue-200 text-blue-900 focus:border-blue-500' : 'border-purple-200 text-purple-900 focus:border-purple-500'}`}>
                        <option value="">- Selecciona una {isBodega ? 'Dirección / Bodega' : 'Fletera'} -</option>
                        {listaDestinos.map((dest, i) => (<option key={i} value={i}>{isBodega ? '🏢' : '🚛'} {dest.alias || dest.nombre} - {(dest.direccion || '').substring(0, 30)}...</option>))}
                        <option value="nueva">+ AGREGAR NUEVA {isBodega ? 'DIRECCIÓN AL CLIENTE' : 'FLETERA AL CATÁLOGO'}...</option>
                     </select>
                  </div>
                  <div><label className="block text-[10px] font-bold text-slate-700 mb-1">Alias / Nombre del Destino</label><input type="text" value={aliasDestino} onChange={e => setAliasDestino(e.target.value)} className="w-full border border-white/80 rounded-xl p-2 focus:border-blue-400 outline-none text-xs font-semibold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="Ej. Sucursal Matriz, Castores MTY..." /></div>
                  <div>
                    <div className="flex justify-between items-end mb-1"><label className="block text-[10px] font-bold text-slate-700">Dirección Física Exacta</label><button className="text-[9px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 drop-shadow-sm"><i className="fas fa-search-location"></i> Ubicar Pin</button></div>
                    <textarea rows="2" value={direccionFisica} onChange={e => setDireccionFisica(e.target.value)} className="w-full border border-white/80 rounded-xl p-2 focus:border-blue-400 outline-none text-xs font-semibold text-slate-800 bg-white/80 focus:bg-white transition resize-none" placeholder="Calle, Número, Colonia..."></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-[10px] font-bold text-slate-700 mb-1">Teléfono Bodega/Fletera</label><input type="text" value={telefonoBodega} onChange={e => setTelefonoBodega(e.target.value)} className="w-full border border-white/80 rounded-xl p-2 focus:border-blue-400 outline-none text-xs font-semibold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="Para el chofer" /></div>
                    <div><label className="block text-[10px] font-bold text-slate-700 mb-1">Horarios de Entrega</label><input type="text" value={horariosEntrega} onChange={e => setHorariosEntrega(e.target.value)} className="w-full border border-white/80 rounded-xl p-2 focus:border-blue-400 outline-none text-xs font-semibold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="Ej. L-V 8am a 5pm" /></div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Link de Google Maps</label>
                    <div className="relative"><i className="fas fa-map-marker-alt absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i><input type="text" value={linkMaps} onChange={e => setLinkMaps(e.target.value)} className="w-full border border-white/80 rounded-xl py-2 pl-8 pr-2 focus:border-blue-400 outline-none text-xs font-semibold text-slate-800 bg-white/80 focus:bg-white transition" placeholder="https://maps.app.goo.gl/..." /></div>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 p-2 rounded-2xl shadow-sm border border-white/60 flex-1 flex flex-col min-h-[220px]">
                <div className="flex justify-between items-center px-2 pb-2 mb-1 border-b border-white/80"><span className="text-[10px] font-bold text-blue-800 flex items-center gap-1.5"><i className="fas fa-hand-pointer"></i> Arrastra el pin para confirmar</span><div className="flex gap-2 text-[10px] font-mono text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-white"><span>{posicionPin.lat.toFixed(6)}</span><span>{posicionPin.lng.toFixed(6)}</span></div></div>
                <div className="flex-1 rounded-xl overflow-hidden relative z-0 border border-white shadow-inner">
                  <MapContainer center={[posicionPin.lat, posicionPin.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><RecenterMap lat={posicionPin.lat} lng={posicionPin.lng} /><Marker draggable={true} eventHandlers={eventHandlers} position={posicionPin} ref={markerRef}/>
                  </MapContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-white/40 bg-white/40 shrink-0 flex gap-3 z-20">
          <button onClick={onClose} className="flex-1 bg-white/60 border border-white text-slate-700 font-bold py-3 sm:py-3.5 rounded-xl hover:bg-white transition text-xs sm:text-sm shadow-sm">Cancelar</button>
          <button onClick={handleGuardar} className="flex-[2] bg-blue-600 text-white font-black py-3 sm:py-3.5 rounded-xl shadow-lg hover:bg-blue-700 transition active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 border border-blue-500">
            <i className="fas fa-save"></i> Guardar Logística
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormularioOrden;