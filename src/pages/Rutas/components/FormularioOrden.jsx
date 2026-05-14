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
  
  // --- ESTADOS: COLUMNA IZQUIERDA (IDENTIFICADORES, CLIENTE, DOCS, QR) ---
  const [folioPedido, setFolioPedido] = useState('');
  const [folioFactura, setFolioFactura] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [codigoSAP, setCodigoSAP] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [docs, setDocs] = useState({ factura: true, certificados: false, orden_compra: false, envio_ciego: false });
  const [qrBase64, setQrBase64] = useState('');

  // --- ESTADOS: COLUMNA DERECHA (DESTINO) ---
  const [urgente, setUrgente] = useState(false);
  const [metodoEnvio, setMetodoEnvio] = useState('bodega_cliente');
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState('');
  const [aliasDestino, setAliasDestino] = useState('');
  const [direccionFisica, setDireccionFisica] = useState('');
  const [contactoDestino, setContactoDestino] = useState('');
  const [telefonoBodega, setTelefonoBodega] = useState('');
  const [horariosEntrega, setHorariosEntrega] = useState('');
  const [linkMaps, setLinkMaps] = useState('');
  const [posicionPin, setPosicionPin] = useState({ lat: 25.6866, lng: -100.3161 });
  const markerRef = useRef(null);

  // --- ESTADOS: BÚSQUEDA Y SUGERENCIAS ---
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState(''); 

  // --- LÓGICA: CARGA DE IMAGEN QR ---
  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setQrBase64(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const linkStr = String(linkMaps || '');
    if (linkStr && linkStr.includes('@')) {
        const match = linkStr.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
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
        setFolioPedido(String(ordenAEditar.folio_pedido || ''));
        setFolioFactura(String(ordenAEditar.folio_factura || ''));
        setClienteNombre(String(ordenAEditar.cliente_nombre || ''));
        setCodigoSAP(String(ordenAEditar.cliente_codigo || ''));
        setTelefonoCliente(String(ordenAEditar.telefono_contacto || ''));
        setUrgente(ordenAEditar.urgente || false);
        setMetodoEnvio(ordenAEditar.tipo_envio || 'bodega_cliente');
        setAliasDestino(String(ordenAEditar.destino_alias || ''));
        setDireccionFisica(String(ordenAEditar.direccion || ''));
        setContactoDestino(String(ordenAEditar.destino_contacto || ''));
        setTelefonoBodega(String(ordenAEditar.destino_telefono || ''));
        setHorariosEntrega(String(ordenAEditar.destino_horario || ''));
        setLinkMaps(String(ordenAEditar.link_maps || ''));
        
        // Validación segura para evitar crasheos si faltan campos en la base de datos
        setDocs({ 
            factura: ordenAEditar.documentacion?.factura ?? true, 
            certificados: ordenAEditar.documentacion?.certificados ?? false, 
            orden_compra: ordenAEditar.documentacion?.orden_compra ?? false, 
            envio_ciego: ordenAEditar.documentacion?.envio_ciego ?? false 
        });
        
        setQrBase64(ordenAEditar.qr_imagen || '');
        
        // Validación segura para coordenadas
        if (ordenAEditar.coordenadas) {
            const lat = parseFloat(ordenAEditar.coordenadas.lat);
            const lng = parseFloat(ordenAEditar.coordenadas.lng);
            if (!isNaN(lat) && !isNaN(lng)) setPosicionPin({ lat, lng });
        }

        const nombreAEditar = String(ordenAEditar.cliente_nombre || '').toUpperCase();
        const codigoAEditar = String(ordenAEditar.cliente_codigo || '').toUpperCase();

        const foundClient = clientesLista.find(c => 
            (c.nombre && c.nombre.toUpperCase() === nombreAEditar) ||
            (codigoAEditar && codigoAEditar !== 'S/C' && c.codigo && c.codigo.toUpperCase() === codigoAEditar)
        );
        setClienteSeleccionado(foundClient || null);
      } else {
        setFolioPedido(''); setFolioFactura(''); setClienteNombre(''); setCodigoSAP(''); setTelefonoCliente('');
        setUrgente(false); setMetodoEnvio('bodega_cliente'); setBodegaSeleccionada(''); setAliasDestino('');
        setDireccionFisica(''); setContactoDestino(''); setTelefonoBodega(''); setHorariosEntrega(''); setLinkMaps('');
        setDocs({ factura: true, certificados: false, orden_compra: false, envio_ciego: false });
        setQrBase64('');
        setPosicionPin({ lat: 25.6866, lng: -100.3161 });
        setClienteSeleccionado(null);
      }
    }
  }, [isOpen, ordenAEditar, clientesLista]);

  // --- NUEVO: SINCRONIZADOR DEL DROPDOWN AL EDITAR (LÓGICA AISLADA Y SEGURA) ---
  useEffect(() => {
    if (isOpen && ordenAEditar) {
      let indexEncontrado = -1;
      const esBodegaLocal = metodoEnvio === 'bodega_cliente';
      let destinoEncontrado = null; // Guardamos la referencia para sacar sus datos

      if (esBodegaLocal) {
        // Buscamos en las bodegas del cliente
        const dirs = clienteSeleccionado?.direcciones || [];
        indexEncontrado = dirs.findIndex(d => 
          (d && d.alias === ordenAEditar.destino_alias) || 
          (d && d.direccion === ordenAEditar.direccion)
        );
        if (indexEncontrado !== -1) destinoEncontrado = dirs[indexEncontrado];
      } else {
        // Buscamos en las fleteras foráneas
        const listaFleteras = fleteras || [];
        indexEncontrado = listaFleteras.findIndex(f => 
          (f && f.id === ordenAEditar.fletera_asignada_id) || 
          (f && f.nombre === ordenAEditar.destino_alias)
        );
        if (indexEncontrado !== -1) destinoEncontrado = listaFleteras[indexEncontrado];
      }

      // Si encuentra coincidencia, asigna el índice al dropdown.
      if (indexEncontrado !== -1) {
        setBodegaSeleccionada(String(indexEncontrado));
        
        // ¡LA MAGIA AQUÍ! Rellenar si en la orden venía vacío, pero en el catálogo sí existe
        if (destinoEncontrado) {
            setTelefonoBodega(prev => prev || String(destinoEncontrado.telefono || ''));
            setHorariosEntrega(prev => prev || String(destinoEncontrado.horario || ''));
            setContactoDestino(prev => prev || String(destinoEncontrado.contacto || ''));
            setLinkMaps(prev => prev || String(destinoEncontrado.link_maps || ''));
        }
      } else {
        setBodegaSeleccionada('');
      }
    }
  }, [isOpen, ordenAEditar, clienteSeleccionado, fleteras, metodoEnvio]);
  // ----------------------------------------------------------------------------

  const clientesFiltrados = clientesLista.filter(c => {
    const nombreSafe = String(clienteNombre || '').toLowerCase();
    const codigoSafe = String(codigoSAP || '').toLowerCase();
    if (filtroActivo === 'nombre' && nombreSafe.length > 0) return c.nombre?.toLowerCase().includes(nombreSafe);
    if (filtroActivo === 'codigo' && codigoSafe.length > 0) return c.codigo?.toLowerCase().includes(codigoSafe);
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
        setAliasDestino(''); setDireccionFisica(''); setContactoDestino(''); setTelefonoBodega(''); setHorariosEntrega(''); setLinkMaps('');
        return;
    }
    const destino = listaDestinos[val]; 
    if (destino) {
        setAliasDestino(String(destino.alias || destino.nombre || ''));
        setDireccionFisica(String(destino.direccion || ''));
        setContactoDestino(String(destino.contacto || '')); 
        setTelefonoBodega(String(destino.telefono || ''));
        setHorariosEntrega(String(destino.horario || ''));
        setLinkMaps(String(destino.link_maps || ''));
        if (destino.coordenadas && !isNaN(destino.coordenadas.lat)) {
            setPosicionPin({ lat: destino.coordenadas.lat, lng: destino.coordenadas.lng });
        }
    }
  };

  const handleGuardar = async () => {
    const nombreLimpio = String(clienteNombre || '').trim().toUpperCase();
    const codigoLimpio = String(codigoSAP || '').trim().toUpperCase();
    const pedidoLimpio = String(folioPedido || '').trim().toUpperCase();
    const facturaLimpia = String(folioFactura || '').trim().toUpperCase();
    const aliasDestinoLimpio = String(aliasDestino || '').trim();
    const direccionLimpia = String(direccionFisica || '').trim();
    const contactoDestinoLimpio = String(contactoDestino || '').trim();
    const telefonoBodegaLimpio = String(telefonoBodega || '').trim();
    const horariosEntregaLimpio = String(horariosEntrega || '').trim();
    const linkMapsLimpio = String(linkMaps || '').trim();

    const formatoCodigoValido = /^C?\d+$/.test(codigoLimpio);

    if (!codigoLimpio || codigoLimpio === 'S/C') return alert("⚠️ ERROR: El CÓDIGO SAP es obligatorio.");
    if (!formatoCodigoValido) return alert("⚠️ ERROR: Formato de CÓDIGO SAP inválido.");
    if (!nombreLimpio) return alert("⚠️ ERROR: La Razón Social / Nombre del cliente es obligatoria.");
    if (!pedidoLimpio && !facturaLimpia) return alert("⚠️ ERROR: Debes ingresar al menos el Folio de Pedido o el Folio de Factura.");
    if (!metodoEnvio) return alert("⚠️ ERROR: Debes seleccionar un Método de Envío válido.");
    if (!aliasDestinoLimpio) return alert("⚠️ ERROR: El Nombre o Alias del Destino es obligatorio.");
    if (!direccionLimpia) return alert("⚠️ ERROR: La Dirección Exacta es obligatoria.");

    let clienteIdVinculado = ordenAEditar?.cliente_id_vinculado || null;
    let fleteraIdVinculada = ordenAEditar?.fletera_asignada_id || null;
    
    try {
        const clienteExistente = clientesLista.find(c => {
            const matchNombre = c.nombre?.toUpperCase() === nombreLimpio;
            const matchCodigo = c.codigo?.toUpperCase() === codigoLimpio;
            return matchNombre || matchCodigo;
        });

        if (clienteExistente) {
            clienteIdVinculado = clienteExistente.id;
            let datosAActualizarCliente = { nombre: nombreLimpio, codigo: codigoLimpio, telefono: String(telefonoCliente || '').trim() };
            
            if (isBodega) {
                let direccionesActuales = [...(clienteExistente.direcciones || [])];
                const nuevaDireccionObj = {
                    alias: aliasDestinoLimpio, direccion: direccionLimpia, contacto: contactoDestinoLimpio,
                    telefono: telefonoBodegaLimpio, horario: horariosEntregaLimpio, link_maps: linkMapsLimpio,
                    coordenadas: { lat: posicionPin.lat, lng: posicionPin.lng }
                };
                const indexDir = direccionesActuales.findIndex(d => d.direccion.toLowerCase() === direccionLimpia.toLowerCase() || d.alias.toLowerCase() === nuevaDireccionObj.alias.toLowerCase());
                if (indexDir >= 0) direccionesActuales[indexDir] = { ...direccionesActuales[indexDir], ...nuevaDireccionObj }; 
                else direccionesActuales.push(nuevaDireccionObj); 
                datosAActualizarCliente.direcciones = direccionesActuales;
            }
            await updateDoc(doc(db, 'clientes_logistica', clienteExistente.id), datosAActualizarCliente);
        } else {
            const nuevoClienteData = {
                nombre: nombreLimpio, codigo: codigoLimpio, telefono: String(telefonoCliente || '').trim(),
                direcciones: [], fecha_creacion: serverTimestamp()
            };
            if (isBodega) {
                nuevoClienteData.direcciones.push({
                    alias: aliasDestinoLimpio, direccion: direccionLimpia, contacto: contactoDestinoLimpio,
                    telefono: telefonoBodegaLimpio, horario: horariosEntregaLimpio, link_maps: linkMapsLimpio,
                    coordenadas: { lat: posicionPin.lat, lng: posicionPin.lng }
                });
            }
            const docRef = await addDoc(collection(db, 'clientes_logistica'), nuevoClienteData);
            clienteIdVinculado = docRef.id; 
        }

        if (!isBodega && aliasDestinoLimpio) {
            const fleteraExistente = fleteras.find(f => f.nombre?.toUpperCase() === aliasDestinoLimpio.toUpperCase());
            if (fleteraExistente) fleteraIdVinculada = fleteraExistente.id;
            else {
                const nuevaFleteraObj = {
                    nombre: aliasDestinoLimpio.toUpperCase(), direccion: direccionLimpia, contacto: contactoDestinoLimpio,
                    telefono: telefonoBodegaLimpio, link_maps: linkMapsLimpio, coordenadas: { lat: posicionPin.lat, lng: posicionPin.lng }
                };
                const fRef = await addDoc(collection(db, 'catalogo_fleteras'), nuevaFleteraObj);
                fleteraIdVinculada = fRef.id;
            }
        }

        const payload = {
            folio_pedido: pedidoLimpio || null, folio_factura: facturaLimpia || null, cliente_codigo: codigoLimpio, cliente_nombre: nombreLimpio,
            telefono_contacto: String(telefonoCliente || '').trim() || null, tipo_envio: metodoEnvio,
            destino_alias: aliasDestinoLimpio, direccion: direccionLimpia, destino_contacto: contactoDestinoLimpio,
            destino_telefono: telefonoBodegaLimpio, destino_horario: horariosEntregaLimpio, link_maps: linkMapsLimpio || null,
            coordenadas: { lat: posicionPin.lat, lng: posicionPin.lng }, documentacion: docs, qr_imagen: qrBase64 || null,
            urgente: urgente, cliente_id_vinculado: clienteIdVinculado, fletera_asignada_id: isBodega ? null : fleteraIdVinculada, 
            fecha_actualizacion: serverTimestamp()
        };

        if(ordenAEditar?.id) await updateDoc(doc(db, 'rutas_logistica', ordenAEditar.id), payload);
        else {
            payload.estado = 'pendiente'; payload.fecha_creacion = serverTimestamp();
            await addDoc(collection(db, 'rutas_logistica'), payload);
        }
        onClose(); 
    } catch(e) { 
        console.error(e); alert("Error al guardar en base de datos. Detalle: " + e.message); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm transition-opacity opacity-100 bg-slate-900/80">
      <div className="rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden transform scale-100 transition-transform flex flex-col max-h-[98vh] sm:max-h-[90vh] bg-slate-50">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 text-white flex justify-between items-center shrink-0 shadow-md z-20 bg-slate-900">
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
            <i className={`fas ${ordenAEditar ? 'fa-edit text-amber-400' : 'fa-box-open text-blue-400'}`}></i> 
            {ordenAEditar ? 'Editar Orden' : 'Orden de Entrega'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><i className="fas fa-times"></i></button>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="space-y-4">
              
              <div className="p-4 rounded-2xl shadow-sm border border-slate-200 bg-white">
                <h4 className="text-[10px] font-black uppercase tracking-wider mb-3 text-slate-400"><i className="fas fa-hashtag mr-1"></i> Identificadores</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold mb-1 opacity-70">Folio de Pedido</label>
                    <input type="text" value={folioPedido} onChange={e => setFolioPedido(e.target.value)} className="w-full border rounded-xl p-2.5 outline-none text-sm font-bold bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-800" placeholder="Ej. PED-1025" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1 opacity-70">Folio de Factura</label>
                    <input type="text" value={folioFactura} onChange={e => setFolioFactura(e.target.value)} className="w-full border rounded-xl p-2.5 outline-none text-sm font-bold bg-emerald-50 border-slate-300 focus:border-emerald-500 text-emerald-800" placeholder="Ej. FAC-A992" />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl shadow-sm border border-slate-200 relative bg-white">
                <h4 className="text-[10px] font-black uppercase tracking-wider mb-3 text-slate-400"><i className="fas fa-user-tag mr-1"></i> Información del Cliente</h4>
                <div className="grid grid-cols-3 gap-3 mb-3 relative">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold mb-1 opacity-70">Cód. SAP <span className="text-red-500">*</span></label>
                    <input type="text" value={codigoSAP} onChange={e => { setCodigoSAP(e.target.value); setFiltroActivo('codigo'); setMostrarSugerencias(true); }} onFocus={() => { setFiltroActivo('codigo'); setMostrarSugerencias(true); }} className="w-full border rounded-xl p-2.5 outline-none text-sm font-mono font-bold bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-800" placeholder="C1234" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold mb-1 opacity-70">Razón Social / Nombre <span className="text-red-500">*</span></label>
                    <input type="text" value={clienteNombre} onChange={e => { setClienteNombre(e.target.value); setFiltroActivo('nombre'); setMostrarSugerencias(true); }} onFocus={() => { setFiltroActivo('nombre'); setMostrarSugerencias(true); }} className="w-full border rounded-xl p-2.5 outline-none text-sm font-bold bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-800" placeholder="Escribe para buscar..." />
                  </div>
                  {mostrarSugerencias && clientesFiltrados.length > 0 && (
                    <div className="absolute top-[65px] left-0 z-30 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {clientesFiltrados.map((cliente) => (
                        <div key={cliente.id} onClick={() => { setClienteNombre(cliente.nombre); setCodigoSAP(cliente.codigo !== 'S/C' ? cliente.codigo : ''); setTelefonoCliente(cliente.telefono || ''); setClienteSeleccionado(cliente); setMostrarSugerencias(false); }} className="p-3 border-b hover:bg-blue-50 cursor-pointer transition flex flex-col border-slate-100">
                          <div className="flex justify-between items-center mb-0.5"><span className="font-bold text-xs text-slate-800">{cliente.nombre}</span><span className="font-mono text-[9px] font-bold px-1 rounded bg-slate-100 text-blue-600">{cliente.codigo}</span></div>
                          <div className="text-[9px] truncate text-slate-500">{(cliente.direcciones && cliente.direcciones.length > 0) ? (cliente.direcciones.length + ' destinos guardados') : 'Sin destinos guardados'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold mb-1 opacity-70">Teléfono Contacto Cliente</label>
                  <div className="relative">
                    <i className="fas fa-phone absolute left-3 top-1/2 transform -translate-y-1/2 text-xs opacity-50"></i>
                    <input type="tel" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} className="w-full border rounded-xl pl-8 p-2.5 outline-none text-sm font-semibold bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-800" placeholder="Ej. 81 1234 5678" />
                  </div>
                </div>
              </div>

              {/* Documentación a Entregar */}
              <div className="p-4 rounded-2xl shadow-sm border border-slate-200 bg-white">
                <h4 className="text-[10px] font-black uppercase tracking-wider mb-3 text-slate-400"><i className="fas fa-file-contract mr-1"></i> Documentación a Entregar</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="cursor-pointer">
                    <input type="checkbox" checked={!!docs?.factura} onChange={e => setDocs({...docs, factura: e.target.checked})} className="peer sr-only" />
                    <div className="rounded-xl p-2 text-center text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-slate-200 bg-slate-50 text-slate-600 hover:brightness-95 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 shadow-sm">
                      <i className="fas fa-file-invoice"></i> Factura
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input type="checkbox" checked={!!docs?.certificados} onChange={e => setDocs({...docs, certificados: e.target.checked})} className="peer sr-only" />
                    <div className="rounded-xl p-2 text-center text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-slate-200 bg-slate-50 text-slate-600 hover:brightness-95 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 shadow-sm">
                      <i className="fas fa-certificate"></i> Certificados
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input type="checkbox" checked={!!docs?.orden_compra} onChange={e => setDocs({...docs, orden_compra: e.target.checked})} className="peer sr-only" />
                    <div className="rounded-xl p-2 text-center text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-slate-200 bg-slate-50 text-slate-600 hover:brightness-95 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 shadow-sm">
                      <i className="fas fa-file-signature"></i> O. Compra
                    </div>
                  </label>
                  <label className="cursor-pointer sm:col-span-3">
                    <input type="checkbox" checked={!!docs?.envio_ciego} onChange={e => setDocs({...docs, envio_ciego: e.target.checked})} className="peer sr-only" />
                    <div className="rounded-xl p-2 text-center text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-slate-200 bg-slate-50 text-slate-600 hover:brightness-95 peer-checked:bg-slate-800 peer-checked:text-white peer-checked:border-slate-900 shadow-sm">
                      <i className="fas fa-user-secret"></i> Envío Ciego (Sin Logos)
                    </div>
                  </label>
                </div>
                
                {/* QR Upload */}
                <div className="mt-4 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">
                    <i className="fas fa-qrcode mr-1"></i> Imagen QR de Acceso (Opcional)
                  </label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleQrUpload} 
                    className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" 
                  />
                  {qrBase64 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-1 rounded border text-emerald-600 bg-emerald-50 border-emerald-200">
                        <i className="fas fa-check-circle"></i> QR ya guardado. Sube otro para reemplazar.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="space-y-4 flex flex-col h-full">
              <div className="p-4 rounded-2xl shadow-sm border border-slate-200 shrink-0 bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400"><i className="fas fa-route mr-1"></i> Destino Físico</h4>
                  <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg border transition bg-red-50 border-red-100 hover:bg-red-100"><input type="checkbox" checked={urgente} onChange={e => setUrgente(e.target.checked)} className="w-3.5 h-3.5 rounded border-red-300 text-red-500" /><span className="text-[10px] font-black uppercase text-red-600">Urgente</span></label>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="mb-3">
                    <label className="block text-[10px] font-bold mb-1 opacity-70 text-slate-600">Método de Envío</label>
                    <select value={metodoEnvio} onChange={e => { setMetodoEnvio(e.target.value); setBodegaSeleccionada(''); }} className="w-full border rounded-xl p-2.5 outline-none text-sm font-bold cursor-pointer border-slate-300 focus:border-blue-500 bg-slate-50 text-slate-800">
                      <option value="bodega_cliente">Reparto Local (Directo a Cliente)</option><option value="fletera_domicilio">Fletera Foránea (A Domicilio)</option><option value="fletera_ocurre">Fletera Foránea (Ocurre)</option>
                    </select>
                  </div>

                  <div className={`mb-3 p-3 rounded-xl border ${isBodega ? 'bg-blue-50/50 border-blue-100' : 'bg-purple-50/50 border-purple-100'}`}>
                     <label className={`block text-[10px] font-black mb-1 uppercase tracking-wider ${isBodega ? 'text-blue-800' : 'text-purple-800'}`}>{isBodega ? 'Bodegas del Cliente' : 'Catálogo Global de Fleteras'}</label>
                     <select value={bodegaSeleccionada} onChange={handleDestinoChange} className={`w-full border rounded-xl p-2 outline-none text-xs font-bold cursor-pointer shadow-sm bg-white focus:border-blue-500 ${isBodega ? 'border-blue-200 text-blue-900' : 'border-purple-200 text-purple-900'}`}>
                        <option value="">{isBodega ? '-- Selecciona una Dirección / Bodega --' : '-- Selecciona una Fletera --'}</option>
                        {listaDestinos.map((dest, i) => (<option key={i} value={i}>{isBodega ? '🏢' : '🚛'} {dest.alias || dest.nombre}</option>))}
                        <option value="nueva">➕ AGREGAR {isBodega ? 'NUEVA DIRECCIÓN AL CLIENTE...' : 'NUEVA FLETERA AL CATÁLOGO...'}</option>
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2"><label className="block text-[10px] font-bold mb-1 opacity-70 text-slate-600">Alias / Nombre del Destino</label><input type="text" value={aliasDestino} onChange={e => setAliasDestino(e.target.value)} className="w-full border rounded-xl p-2 outline-none text-xs font-bold border-slate-300 focus:border-blue-500 bg-slate-50 text-slate-800" placeholder="Ej. Sucursal Matriz, Castores MTY..." /></div>
                    <div className="col-span-2 relative">
                      <div className="flex justify-between items-end mb-1">
                        <label className="block text-[10px] font-bold text-slate-600">Dirección Física Exacta <span className="text-red-500">*</span></label>
                      </div>
                      <textarea rows="2" value={direccionFisica} onChange={e => setDireccionFisica(e.target.value)} className="w-full border rounded-xl p-2 outline-none text-xs font-semibold resize-none border-slate-300 focus:border-blue-500 bg-slate-50 text-slate-800" placeholder="Calle, Número, Colonia..."></textarea>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <h4 className="text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500"><i className="fas fa-id-card"></i> Información de Contacto en Destino</h4>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                       <div><label className="block text-[10px] font-bold mb-1 opacity-70 text-slate-600">Nombre Contacto</label><input type="text" value={contactoDestino} onChange={e => setContactoDestino(e.target.value)} className="w-full border rounded-xl p-2 text-xs font-semibold border-slate-300 bg-slate-50 text-slate-800" placeholder="Ej: Juan Pérez" /></div>
                       <div><label className="block text-[10px] font-bold mb-1 opacity-70 text-slate-600">Tel. Bodega/Fletera</label><input type="text" value={telefonoBodega} onChange={e => setTelefonoBodega(e.target.value)} className="w-full border rounded-xl p-2 text-xs font-semibold border-slate-300 bg-slate-50 text-slate-800" placeholder="Para el chofer" /></div>
                    </div>
                    <div className="mb-2">
                       <label className="block text-[10px] font-bold mb-1 opacity-70 text-slate-600">Horarios de entrega</label>
                       <input type="text" value={horariosEntrega} onChange={e => setHorariosEntrega(e.target.value)} className="w-full border rounded-xl p-2 text-xs font-semibold border-slate-300 bg-slate-50 text-slate-800" placeholder="Ej. L-V 8am a 5pm" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-bold mb-1 opacity-70 text-slate-600">Link de Google Maps</label>
                       <div className="relative"><i className="fas fa-map-pin absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50 text-slate-400"></i><input type="url" value={linkMaps} onChange={e => setLinkMaps(e.target.value)} className="w-full border rounded-xl py-2 pl-8 pr-2 text-xs font-semibold border-slate-300 bg-slate-50 text-blue-600" placeholder="Pega el link aquí..." /></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mapa */}
              <div className="p-2 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[180px] bg-white">
                <div className="flex justify-between items-center px-2 pb-2 shrink-0"><span className="text-[10px] font-bold text-slate-500"><i className="fas fa-hand-pointer text-blue-500 animate-pulse mr-1"></i> Arrastra el pin para confirmar</span></div>
                <div className="flex-1 rounded-xl overflow-hidden relative z-0 border border-slate-200 bg-slate-200">
                  <MapContainer center={[posicionPin.lat, posicionPin.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><RecenterMap lat={posicionPin.lat} lng={posicionPin.lng} /><Marker draggable={true} eventHandlers={eventHandlers} position={posicionPin} ref={markerRef}/>
                  </MapContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 shrink-0 flex gap-3 z-20 bg-white">
          <button onClick={onClose} className="flex-1 border font-bold py-3 md:py-3.5 rounded-xl transition text-sm bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200">Cancelar</button>
          <button onClick={handleGuardar} className="flex-[2] text-white font-black py-3 md:py-3.5 rounded-xl transition active:scale-95 text-sm flex items-center justify-center gap-2 bg-blue-600 shadow-lg shadow-blue-500/30 hover:bg-blue-700">
            <i className="fas fa-save"></i> Guardar Logística
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormularioOrden;
