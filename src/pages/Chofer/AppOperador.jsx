import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, getDoc, setDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase'; // Ajusta la ruta a tu config de Firebase

const AppOperador = () => {
  // ==========================================
  // ESTADOS GLOBALES
  // ==========================================
  const [myId, setMyId] = useState(localStorage.getItem('een_chofer_id') || null);
  const [operadorNombre, setOperadorNombre] = useState('Sin identificar');
  const [misViajes, setMisViajes] = useState([]);
  const [choferesDisponibles, setChoferesDisponibles] = useState([]);
  
  const [tabActual, setTabActual] = useState('camino'); // 'camino' o 'entregado'
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [toasts, setToasts] = useState([]);

  // ==========================================
  // ESTADOS DE MODALES
  // ==========================================
  const [showLogin, setShowLogin] = useState(!localStorage.getItem('een_chofer_id'));
  const [showDocs, setShowDocs] = useState(false);
  const [docsLegales, setDocsLegales] = useState(null);
  
  const [showVisorQR, setShowVisorQR] = useState(false);
  const [qrData, setQrData] = useState({ src: '', nombre: '' });
  const [showZoomQR, setShowZoomQR] = useState(false);
  const [brilloMaximo, setBrilloMaximo] = useState(false);

  const [viajeActivoId, setViajeActivoId] = useState(null);
  
  // Modal Entrega
  const [showEntrega, setShowEntrega] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewMat, setPreviewMat] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal Falla
  const [showFalla, setShowFalla] = useState(false);
  const [motivoFalla, setMotivoFalla] = useState('');
  const [previewFalla, setPreviewFalla] = useState(null);

  // Refs para inputs ocultos de archivos
  const inputDocRef = useRef(null);
  const inputMatRef = useRef(null);
  const inputFallaRef = useRef(null);

  // Refs para Zoom QR táctil
  const zoomImgRef = useRef(null);
  const scaleRef = useRef(1);
  const currentXRef = useRef(0);
  const currentYRef = useRef(0);
  const pinchDistRef = useRef(null);
  const lastXRef = useRef(null);
  const lastYRef = useRef(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/chofer' })
        .then(reg => console.log('SW chofer aislado con éxito:', reg.scope))
        .catch(err => console.error('Error SW chofer:', err));
    }
  }, []);

  // ==========================================
  // EFECTOS Y LISTENER INICIAL
  // ==========================================
  useEffect(() => {
    // Listeners de Red
    const handleOnline = () => {
      setIsOffline(false);
      agregarToast("Conexión restaurada. Sincronizando...", "success");
      setTimeout(sincronizarColaBlindada, 1500);
    };
    const handleOffline = () => {
      setIsOffline(true);
      agregarToast("Sin conexión. Modo offline activado.", "error");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  
    document.title = "Operador | Envases La Económica del Norte";

    // Cargar Choferes para Login
    const unsubChoferes = onSnapshot(collection(db, 'choferes'), (snap) => {
      const lista = [];
      snap.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));
      setChoferesDisponibles(lista);
      if (myId) {
        const mio = lista.find(c => c.id === myId);
        if (mio) setOperadorNombre(mio.nombre);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubChoferes();
    };
  }, [myId]);

  useEffect(() => {
    if (!myId) return;

    // Listener de Viajes
    const todayStart = new Date(); 
    todayStart.setHours(0,0,0,0);
    
    const q = query(collection(db, 'rutas_logistica'), where('chofer_asignado', '==', myId));
    const unsubRutas = onSnapshot(q, (snap) => {
      let viajes = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        let mostrar = true;
        if ((data.estado === 'entregado' || data.estado === 'fallido') && data.fecha_actualizacion) {
          if (data.fecha_actualizacion.toDate() < todayStart) mostrar = false;
        }
        if (mostrar && ['camino', 'entregado', 'fallido'].includes(data.estado)) {
          viajes.push({ id: docSnap.id, ...data });
        }
      });
      viajes.sort((a,b) => (a.orden_ruta || 9999) - (b.orden_ruta || 9999));
      setMisViajes(viajes);
    });

    return () => unsubRutas();
  }, [myId]);

  // ==========================================
  // FUNCIONES CORE (Sincronización, Toasts, Auth)
  // ==========================================
  const agregarToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const guardarEnColaLocal = (id, dataObj) => {
    try {
      let cola = JSON.parse(localStorage.getItem('een_cola_sync') || '[]');
      cola = cola.filter(item => item.id !== id);
      cola.push({ id, data: dataObj, timestamp: new Date().getTime() });
      localStorage.setItem('een_cola_sync', JSON.stringify(cola));
    } catch(e) {
      console.warn("Memoria local llena.", e);
    }
  };

  const sincronizarColaBlindada = async () => {
    if (!navigator.onLine) return;
    
    let cola = JSON.parse(localStorage.getItem('een_cola_sync') || '[]');
    if (cola.length === 0) return;

    agregarToast(`Subiendo ${cola.length} entregas offline guardadas...`, "success");
    let pendientesRestantes = [];

    for (let item of cola) {
      try {
        let payload = { ...item.data };
        payload.fecha_actualizacion = serverTimestamp();
        if (payload.estado === 'entregado') {
          payload.fecha_entrega = serverTimestamp();
        }
        await setDoc(doc(db, 'rutas_logistica', item.id), payload, { merge: true });
      } catch (error) {
        console.error("Fallo al sincronizar", item.id, error);
        pendientesRestantes.push(item); 
      }
    }

    localStorage.setItem('een_cola_sync', JSON.stringify(pendientesRestantes));
    if(cola.length > 0 && pendientesRestantes.length === 0) {
      agregarToast("¡Todas las entregas offline se sincronizaron con la oficina!", "success");
    }
  };

  const iniciarSesion = (e) => {
    e.preventDefault();
    const select = e.target.elements.choferSelect.value;
    if (!select) return agregarToast("Selecciona tu nombre", "error");
    
    setMyId(select);
    localStorage.setItem('een_chofer_id', select);
    setShowLogin(false);
  };

  const cerrarSesion = () => {
    setMyId(null);
    setOperadorNombre('Sin identificar');
    setMisViajes([]);
    localStorage.removeItem('een_chofer_id');
    setShowLogin(true);
  };

  const abrirDocsLegales = async () => {
    setShowDocs(true);
    try {
      const docSnap = await getDoc(doc(db, 'configuracion', 'docs_legales'));
      if (docSnap.exists()) {
        setDocsLegales(docSnap.data());
      } else {
        setDocsLegales(null);
      }
    } catch (e) {
      agregarToast("Error al cargar docs", "error");
    }
  };

  // ==========================================
  // COMPRESIÓN ULTRA OPTIMIZADA DE FOTOS
  // ==========================================
  const processImageFile = async (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false }); 
        
        const MAX_WIDTH = 600;
        let width = img.width; 
        let height = img.height;
        
        if (width > MAX_WIDTH) { 
          height = Math.round((height * MAX_WIDTH) / width); 
          width = MAX_WIDTH; 
        }
        
        canvas.width = width; 
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.4); 
        
        // Limpieza agresiva de memoria RAM
        canvas.width = 0;
        canvas.height = 0;
        img.src = ''; 
        img.onload = null;
        img.onerror = null;
        
        resolve(base64); 
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject("Error al procesar la imagen");
      };
      
      img.src = objectUrl;
    });
  };

  const handleFileChange = (e, setPreviewFunc) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewFunc(objectUrl); // Guardamos la URL local para mostrarla
    }
  };

  const triggerInput = (ref, usarCamara) => {
    if (usarCamara) {
      ref.current.setAttribute('capture', 'environment');
    } else {
      ref.current.removeAttribute('capture');
    }
    ref.current.click();
  };

  const limpiarUrls = (urls) => {
    urls.forEach(url => { if(url) URL.revokeObjectURL(url); });
  };

  // ==========================================
  // ACCIONES DE ENTREGA Y FALLA
  // ==========================================
  const submitEntrega = async () => {
    const fileDoc = inputDocRef.current.files[0];
    const fileMat = inputMatRef.current.files[0];
    
    if (!fileDoc || !fileMat) {
      return agregarToast("⚠️ Debes capturar AMBAS fotos (Documento y Material)", "error");
    }

    setIsSubmitting(true);

    try {
      const b64Doc = await processImageFile(fileDoc);
      const b64Mat = await processImageFile(fileMat);

      let datosEntrega = {
        estado: 'entregado',
        foto_evidencia: b64Doc, 
        foto_evidencia_material: b64Mat
      };

      guardarEnColaLocal(viajeActivoId, datosEntrega);

      await setDoc(doc(db, 'rutas_logistica', viajeActivoId), {
        ...datosEntrega,
        fecha_actualizacion: serverTimestamp(),
        fecha_entrega: serverTimestamp()
      }, { merge: true });

      sincronizarColaBlindada();

      if(navigator.onLine) {
        agregarToast("¡Entrega completada con éxito!");
      } else {
        agregarToast("Guardado offline. Se enviará al tener red.", "success");
      }
      
      setShowEntrega(false);
    } catch(e) {
      console.error(e);
      agregarToast("Error al procesar las imágenes.", "error");
    } finally {
      setIsSubmitting(false);
      inputDocRef.current.value = '';
      inputMatRef.current.value = '';
      limpiarUrls([previewDoc, previewMat]);
      setPreviewDoc(null);
      setPreviewMat(null);
    }
  };

  const submitFalla = async () => {
    const motivo = motivoFalla.trim();
    if (!motivo) return agregarToast("Escribe el motivo del problema", "error");

    setIsSubmitting(true);

    try {
      const fileFalla = inputFallaRef.current.files[0];
      const b64Foto = fileFalla ? await processImageFile(fileFalla) : null; 

      let datosFalla = {
        estado: 'fallido',
        motivo_falla: motivo
      };
      if(b64Foto) datosFalla.foto_evidencia = b64Foto;

      guardarEnColaLocal(viajeActivoId, datosFalla);

      await setDoc(doc(db, 'rutas_logistica', viajeActivoId), {
        ...datosFalla,
        fecha_actualizacion: serverTimestamp()
      }, { merge: true });

      sincronizarColaBlindada();

      if(navigator.onLine) {
        agregarToast("Reporte enviado a la oficina");
      } else {
        agregarToast("Reporte guardado. Se enviará al tener red.", "success");
      }
      
      setShowFalla(false);
    } catch(e) {
      agregarToast("Error al procesar la imagen", "error");
    } finally {
      setIsSubmitting(false);
      setMotivoFalla('');
      inputFallaRef.current.value = '';
      limpiarUrls([previewFalla]);
      setPreviewFalla(null);
    }
  };

  // ==========================================
  // LÓGICA TÁCTIL (PAN & ZOOM)
  // ==========================================
  const getDistance = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const applyZoomTransform = () => {
    if (zoomImgRef.current) {
      if (scaleRef.current < 1) scaleRef.current = 1;
      if (scaleRef.current > 8) scaleRef.current = 8;
      
      if (scaleRef.current === 1) {
        currentXRef.current = 0;
        currentYRef.current = 0;
      }
      
      zoomImgRef.current.style.transform = `translate(${currentXRef.current}px, ${currentYRef.current}px) scale(${scaleRef.current})`;
    }
  };

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchDistRef.current = getDistance(e.touches);
    } else if (e.touches.length === 1) {
      lastXRef.current = e.touches[0].clientX;
      lastYRef.current = e.touches[0].clientY;
    }
  };

  const onTouchMove = (e) => {
    if (e.cancelable) e.preventDefault(); // Prevenir el scroll

    if (e.touches.length === 2 && pinchDistRef.current) {
      const currentDistance = getDistance(e.touches);
      const diff = currentDistance - pinchDistRef.current;
      scaleRef.current += diff * 0.01; 
      pinchDistRef.current = currentDistance;
      applyZoomTransform();
    } else if (e.touches.length === 1 && lastXRef.current !== null && scaleRef.current > 1) {
      const deltaX = e.touches[0].clientX - lastXRef.current;
      const deltaY = e.touches[0].clientY - lastYRef.current;
      
      currentXRef.current += deltaX;
      currentYRef.current += deltaY;
      
      lastXRef.current = e.touches[0].clientX;
      lastYRef.current = e.touches[0].clientY;
      
      applyZoomTransform();
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) pinchDistRef.current = null;
    if (e.touches.length === 0) { lastXRef.current = null; lastYRef.current = null; }
  };

  const abrirZoomQR = (e) => {
    e.stopPropagation();
    setShowZoomQR(true);
    scaleRef.current = 1;
    currentXRef.current = 0;
    currentYRef.current = 0;
  };

  // ==========================================
  // RENDER DE TARJETAS
  // ==========================================
  const renderViajes = () => {
    const filtrados = misViajes.filter(v => tabActual === 'camino' ? v.estado === 'camino' : (v.estado === 'entregado' || v.estado === 'fallido'));
    
    if(filtrados.length === 0) {
        return (
            <div className="text-center py-20 text-slate-400 font-bold">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 text-slate-400">
                    <i className={`fas ${tabActual === 'camino' ? 'fa-mug-hot' : 'fa-inbox'}`}></i>
                </div>
                Nada por aquí.
            </div>
        );
    }

    return filtrados.map((v, idx) => {
        const esUrgente = v.urgente === true;
        const docs = v.documentacion || {};
        
        let borderColor = 'border-slate-200';
        if(v.estado === 'entregado') borderColor = 'border-emerald-500';
        if(v.estado === 'fallido') borderColor = 'border-red-500';
        if(v.estado === 'camino' && esUrgente) borderColor = 'border-red-500';
        if(v.estado === 'camino' && !esUrgente) borderColor = 'border-blue-500';

        const telCard = v.destino_telefono || v.telefono_contacto;

        return (
            <div key={v.id} className={`card-entrega bg-white rounded-3xl p-4 shadow-sm mb-4 border-l-4 ${borderColor} transition transform active:scale-[0.98]`}>
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5">
                        <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px]">{idx + 1}</span>
                        <span className="text-[9px] font-mono font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">{v.folio_pedido || v.folio_factura || 'S/F'}</span>
                    </div>
                    {esUrgente && <span className="bg-red-500 text-white px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm animate-pulse"><i className="fas fa-fire-alt"></i> URGENTE</span>}
                </div>
                
                <h3 className="font-black text-slate-800 text-lg leading-tight mt-2 mb-2">{v.cliente_nombre}</h3>
                
                {v.destino_alias && (
                    <div className="bg-blue-50 text-blue-800 text-xs font-black px-2 py-1.5 rounded-lg mb-2 flex items-center gap-1.5 w-max">
                        <i className="fas fa-warehouse text-blue-500"></i> {v.destino_alias}
                    </div>
                )}
                
                <p className="text-[11px] font-semibold text-slate-600 leading-snug"><i className="fas fa-map-marker-alt text-red-500 mr-1"></i> {v.direccion}</p>
                
                {v.destino_horario && (
                    <div className="mt-2 bg-amber-50 border border-amber-100 p-2 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1.5 w-max">
                        <i className="fas fa-clock text-amber-500"></i> Horario: {v.destino_horario}
                    </div>
                )}
                
                <div className="flex gap-2 mt-3">
                    {telCard && (
                        <a href={`tel:${telCard}`} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition">
                            <i className="fas fa-phone"></i> Llamar
                        </a>
                    )}
                    {v.link_maps ? (
                        <a href={v.link_maps} target="_blank" rel="noreferrer" className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition">
                            <i className="fas fa-map-marked-alt"></i> Navegar
                        </a>
                    ) : (
                        <a href={`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(v.direccion)}`} target="_blank" rel="noreferrer" className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition">
                            <i className="fas fa-search-location"></i> Buscar GPS
                        </a>
                    )}
                </div>

                {(docs.factura || docs.certificados || docs.orden_compra || docs.qr_acceso || docs.envio_ciego) && (
                    <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Requisitos Físicos:</p>
                        <div className="flex flex-wrap gap-1 leading-none">
                            {docs.factura && <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] px-2 py-1 rounded-md font-bold shadow-sm">Factura</span>}
                            {docs.certificados && <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] px-2 py-1 rounded-md font-bold shadow-sm">Certificados</span>}
                            {docs.orden_compra && <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] px-2 py-1 rounded-md font-bold shadow-sm">OC</span>}
                            {docs.qr_acceso && <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-1 rounded-md font-bold shadow-sm"><i className="fas fa-qrcode"></i> Piden QR</span>}
                        </div>
                        {docs.envio_ciego && (
                            <div className="mt-3 bg-slate-800 text-white p-3 rounded-xl text-xs font-black flex items-center gap-3 shadow-md animate-pulse">
                                <i className="fas fa-user-secret text-2xl text-red-400"></i>
                                <div>ATENCIÓN: ENVÍO CIEGO<br/><span className="text-[10px] font-medium text-slate-300">No entregar papeles con logos EEN.</span></div>
                            </div>
                        )}
                    </div>
                )}
                
                {v.qr_imagen && (
                    <button onClick={() => { setQrData({ src: v.qr_imagen, nombre: v.cliente_nombre }); setShowVisorQR(true); setBrilloMaximo(false); }} className="w-full mt-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition">
                        <i className="fas fa-qrcode text-lg"></i> Ver QR de Acceso
                    </button>
                )}

                {v.estado === 'camino' && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button onClick={() => { setViajeActivoId(v.id); setShowFalla(true); }} className="flex-[1] bg-red-100 text-red-600 font-bold py-3.5 rounded-xl text-sm transition active:scale-95">
                            <i className="fas fa-exclamation-triangle"></i> Problema
                        </button>
                        <button onClick={() => { setViajeActivoId(v.id); setShowEntrega(true); }} className="flex-[2] bg-emerald-500 text-white font-black py-3.5 rounded-xl text-lg shadow-lg shadow-emerald-500/30 transition active:scale-95">
                            <i className="fas fa-check-circle"></i> Entregar
                        </button>
                    </div>
                )}

                {v.estado === 'entregado' && (
                    <div className="mt-4 pt-3 border-t border-slate-100 text-center text-emerald-600 font-black text-sm">
                        <i className="fas fa-check-double text-xl mb-1 block"></i> Entregado con éxito
                    </div>
                )}

                {v.estado === 'fallido' && (
                    <div className="mt-4 pt-3 border-t border-slate-100 text-center text-red-500 font-black text-sm">
                        <i className="fas fa-times-circle text-xl mb-1 block"></i> Reportado con falla
                        <p className="text-[10px] text-red-400 font-medium mt-1">"{v.motivo_falla}"</p>
                    </div>
                )}
            </div>
        );
    });
  };

  const contCamino = misViajes.filter(v => v.estado === 'camino').length;
  const contCompletados = misViajes.filter(v => ['entregado', 'fallido'].includes(v.estado)).length;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden text-slate-800 bg-slate-100 font-sans" style={{ overscrollBehaviorY: 'none' }}>
      
      {/* HEADER FIJO */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shrink-0 z-20 shadow-md">
        {isOffline && (
            <div className="bg-red-600 text-white text-center text-[10px] font-black py-1 uppercase tracking-wider shadow-inner z-50">
                <i className="fas fa-wifi"></i> Modo Sin Conexión - Las entregas se guardarán localmente
            </div>
        )}
        <div className="px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-inner font-black text-xl">
                    <i className="fas fa-truck"></i>
                </div>
                <div>
                    <h1 className="font-black text-lg leading-tight">Ruta EEN</h1>
                    <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">{operadorNombre}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={abrirDocsLegales} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="Documentos Legales">
                    <i className="fas fa-folder-open"></i>
                </button>
                <button onClick={cerrarSesion} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors">
                    <i className="fas fa-sign-out-alt"></i>
                </button>
            </div>
        </div>
        
        <div className="flex px-2 pb-2 gap-2">
            <button onClick={() => setTabActual('camino')} className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-sm transition ${tabActual === 'camino' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <i className="fas fa-box-open mr-1"></i> Por Entregar ({contCamino})
            </button>
            <button onClick={() => setTabActual('entregado')} className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${tabActual === 'entregado' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <i className="fas fa-check-double mr-1"></i> Completados ({contCompletados})
            </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 hide-scroll">
          {!myId ? (
              <div className="text-center py-20 text-slate-400"><i className="fas fa-spinner fa-spin text-3xl mb-2"></i><br/>Cargando...</div>
          ) : renderViajes()}
      </main>

      {/* ==========================================
          MODALES DE LA APLICACIÓN
          ========================================== */}

      {/* MODAL LOGIN */}
      {showLogin && (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col p-6 items-center justify-center">
            <div className="w-full max-w-sm">
                <div className="w-24 h-24 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-5xl mb-8 mx-auto shadow-2xl shadow-blue-600/30 transform rotate-3">
                    <i className="fas fa-steering-wheel"></i>
                </div>
                <h2 className="text-3xl font-black text-white text-center mb-2">Mi Ruta</h2>
                <p className="text-slate-400 text-center text-sm font-medium mb-8">Selecciona tu perfil para cargar tus entregas.</p>
                <form onSubmit={iniciarSesion} className="bg-slate-800 rounded-3xl p-5 shadow-xl border border-slate-700">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Operador / Chofer</label>
                    <select name="choferSelect" className="w-full bg-slate-900 border border-slate-700 text-white text-lg font-bold p-4 rounded-xl outline-none focus:border-blue-500 mb-6 appearance-none text-center">
                        <option value="">-- Soy... --</option>
                        {choferesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 text-lg flex items-center justify-center gap-2">
                        Iniciar Ruta <i className="fas fa-arrow-right"></i>
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL DOCS LEGALES */}
      {showDocs && (
        <div className="fixed inset-0 bg-slate-900/95 z-[90] flex flex-col items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white shrink-0">
                    <h3 className="font-black flex items-center gap-2"><i className="fas fa-file-pdf text-red-400"></i> Documentos Oficiales</h3>
                    <button onClick={() => setShowDocs(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition"><i className="fas fa-times"></i></button>
                </div>
                <div className="p-5 flex-1 space-y-3 bg-slate-50">
                    <p className="text-xs font-bold text-slate-500 text-center mb-4">Descarga tus comprobantes vigentes para acceso a plantas industriales.</p>
                    
                    {docsLegales?.imss_pdf && (
                        <a href={docsLegales.imss_pdf} download="Alta_IMSS.pdf" target="_blank" rel="noreferrer" className="w-full bg-white border border-slate-200 hover:border-blue-300 p-4 rounded-xl shadow-sm flex items-center gap-3 transition">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg shrink-0"><i className="fas fa-hospital-user"></i></div>
                            <div className="flex-1 text-left"><div className="font-black text-slate-700 text-sm">Alta IMSS</div><div className="text-[10px] text-slate-400 font-bold">Vigente. Clic para descargar.</div></div>
                        </a>
                    )}
                    {docsLegales?.sua_pdf && (
                        <a href={docsLegales.sua_pdf} download="Comprobante_SUA.pdf" target="_blank" rel="noreferrer" className="w-full bg-white border border-slate-200 hover:border-blue-300 p-4 rounded-xl shadow-sm flex items-center gap-3 transition">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-lg shrink-0"><i className="fas fa-file-invoice-dollar"></i></div>
                            <div className="flex-1 text-left"><div className="font-black text-slate-700 text-sm">Comprobante SUA</div><div className="text-[10px] text-slate-400 font-bold">Vigente. Clic para descargar.</div></div>
                        </a>
                    )}
                    {docsLegales?.otros_pdf && (
                        <a href={docsLegales.otros_pdf} download="Doc_Extra.pdf" target="_blank" rel="noreferrer" className="w-full bg-white border border-slate-200 hover:border-blue-300 p-4 rounded-xl shadow-sm flex items-center gap-3 transition">
                            <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-lg shrink-0"><i className="fas fa-shield-alt"></i></div>
                            <div className="flex-1 text-left"><div className="font-black text-slate-700 text-sm">Documento Adicional</div><div className="text-[10px] text-slate-400 font-bold">Clic para descargar.</div></div>
                        </a>
                    )}
                    
                    {(!docsLegales?.imss_pdf && !docsLegales?.sua_pdf && !docsLegales?.otros_pdf) && (
                        <div className="text-center py-6">
                            <i className="fas fa-folder-open text-slate-300 text-4xl mb-2"></i>
                            <p className="text-sm font-bold text-slate-400">Aún no hay documentos subidos.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* MODAL ENTREGA */}
      {showEntrega && (
        <div className="fixed inset-0 bg-slate-900/95 z-[50] flex flex-col items-center justify-end p-2 sm:p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in-up">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50 rounded-t-3xl sm:rounded-t-3xl shrink-0">
                    <h3 className="font-black text-emerald-800 flex items-center gap-2"><i className="fas fa-check-circle text-emerald-500"></i> Completar Entrega</h3>
                    <button onClick={() => { setShowEntrega(false); setViajeActivoId(null); limpiarUrls([previewDoc, previewMat]); setPreviewDoc(null); setPreviewMat(null); }} className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
                </div>
                
                <div className="p-4 overflow-y-auto hide-scroll flex-1 space-y-4">
                    <p className="text-sm font-bold text-slate-600 text-center">Para cerrar este pedido es obligatorio adjuntar evidencia fotográfica.</p>
                    
                    {/* Captura Documento */}
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-3 text-center">
                        <label className="block text-[11px] font-black text-blue-800 uppercase tracking-wider mb-2"><i className="fas fa-file-signature text-blue-500 mr-1"></i> 1. Documento Firmado</label>
                        <input type="file" accept="image/*" ref={inputDocRef} className="hidden" onChange={(e) => handleFileChange(e, setPreviewDoc)} />
                        
                        <div className={`w-full h-32 rounded-xl border-2 bg-cover bg-center flex flex-col justify-end p-2 mb-3 transition-colors ${previewDoc ? 'border-emerald-500 bg-slate-200' : 'border-transparent bg-slate-100'}`} style={{ backgroundImage: previewDoc ? `url(${previewDoc})` : 'none' }}>
                            {!previewDoc && <i className="fas fa-image text-slate-300 text-4xl m-auto"></i>}
                            {previewDoc && <span className="bg-emerald-500 text-white text-[11px] font-black py-1.5 px-3 rounded-lg shadow-lg self-center"><i className="fas fa-check-circle mr-1"></i> ¡Foto Lista!</span>}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => triggerInput(inputDocRef, true)} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition"><i className="fas fa-camera mr-1 text-blue-400"></i> Cámara</button>
                            <button onClick={() => triggerInput(inputDocRef, false)} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition"><i className="fas fa-images mr-1 text-indigo-500"></i> Galería</button>
                        </div>
                    </div>

                    {/* Captura Material */}
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-3 text-center">
                        <label className="block text-[11px] font-black text-amber-800 uppercase tracking-wider mb-2"><i className="fas fa-boxes text-amber-500 mr-1"></i> 2. Material Físico</label>
                        <input type="file" accept="image/*" ref={inputMatRef} className="hidden" onChange={(e) => handleFileChange(e, setPreviewMat)} />
                        
                        <div className={`w-full h-32 rounded-xl border-2 bg-cover bg-center flex flex-col justify-end p-2 mb-3 transition-colors ${previewMat ? 'border-emerald-500 bg-slate-200' : 'border-transparent bg-slate-100'}`} style={{ backgroundImage: previewMat ? `url(${previewMat})` : 'none' }}>
                            {!previewMat && <i className="fas fa-image text-slate-300 text-4xl m-auto"></i>}
                            {previewMat && <span className="bg-emerald-500 text-white text-[11px] font-black py-1.5 px-3 rounded-lg shadow-lg self-center"><i className="fas fa-check-circle mr-1"></i> ¡Foto Lista!</span>}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => triggerInput(inputMatRef, true)} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition"><i className="fas fa-camera mr-1 text-blue-400"></i> Cámara</button>
                            <button onClick={() => triggerInput(inputMatRef, false)} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition"><i className="fas fa-images mr-1 text-indigo-500"></i> Galería</button>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 bg-white border-t border-slate-100 shrink-0 pb-safe">
                    <button disabled={isSubmitting} onClick={submitEntrega} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/30 text-lg transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-cloud-upload-alt"></i> Subir y Finalizar</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL FALLA */}
      {showFalla && (
        <div className="fixed inset-0 bg-slate-900/95 z-[50] flex flex-col items-center justify-end p-2 sm:p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in-up">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-red-50 rounded-t-3xl sm:rounded-t-3xl shrink-0">
                    <h3 className="font-black text-red-800 flex items-center gap-2"><i className="fas fa-exclamation-triangle text-red-500"></i> Reportar Problema</h3>
                    <button onClick={() => { setShowFalla(false); setViajeActivoId(null); limpiarUrls([previewFalla]); setPreviewFalla(null); }} className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
                </div>
                <div className="p-4 overflow-y-auto hide-scroll flex-1">
                    <label className="block text-xs font-bold text-slate-600 mb-2">¿Qué sucedió? Describe el problema detalladamente.</label>
                    <textarea value={motivoFalla} onChange={e => setMotivoFalla(e.target.value)} rows="3" className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-sm text-slate-800 outline-none focus:border-red-500 mb-4" placeholder="Ej. El cliente no está, la dirección no existe, nadie salió..."></textarea>
                    
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-3 text-center">
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2"><i className="fas fa-camera text-slate-400 mr-1"></i> Evidencia (Opcional)</label>
                        <input type="file" accept="image/*" ref={inputFallaRef} className="hidden" onChange={(e) => handleFileChange(e, setPreviewFalla)} />
                        
                        <div className={`w-full h-32 rounded-xl border bg-cover bg-center flex flex-col justify-end p-2 mb-3 transition-colors ${previewFalla ? 'border-emerald-500 bg-slate-200' : 'border-slate-200 bg-slate-100'}`} style={{ backgroundImage: previewFalla ? `url(${previewFalla})` : 'none' }}>
                             {!previewFalla && <i className="fas fa-image text-slate-300 text-4xl m-auto"></i>}
                             {previewFalla && <span className="bg-emerald-500 text-white text-[11px] font-black py-1.5 px-3 rounded-lg shadow-lg self-center"><i className="fas fa-check-circle mr-1"></i> ¡Foto Lista!</span>}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => triggerInput(inputFallaRef, true)} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition"><i className="fas fa-camera mr-1 text-blue-400"></i> Cámara</button>
                            <button onClick={() => triggerInput(inputFallaRef, false)} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition"><i className="fas fa-images mr-1 text-indigo-500"></i> Galería</button>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-100 shrink-0 pb-safe">
                    <button disabled={isSubmitting} onClick={submitFalla} className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-xl shadow-lg shadow-red-500/30 text-lg transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-exclamation-circle"></i> Enviar Reporte</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL VISOR QR */}
      {showVisorQR && (
        <div className={`fixed inset-0 z-[95] flex flex-col items-center justify-center p-4 transition-colors duration-300 ${brilloMaximo ? 'bg-white' : 'bg-slate-900/95 backdrop-blur-md'}`}>
            <div className={`bg-white w-full max-w-sm rounded-[2rem] flex flex-col overflow-hidden relative transition-all duration-300 ${brilloMaximo ? 'scale-105 shadow-[0_0_100px_rgba(255,255,255,1)]' : 'shadow-2xl'}`}>
                
                <button onClick={() => setShowVisorQR(false)} className="absolute top-4 right-4 w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition z-10">
                    <i className="fas fa-times"></i>
                </button>

                <div className="p-8 flex flex-col items-center">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl mb-4 shadow-inner">
                        <i className="fas fa-qrcode"></i>
                    </div>
                    <h3 className="font-black text-slate-800 text-xl text-center">Código de Acceso</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-6">Mostrar en caseta de vigilancia</p>

                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 w-full flex justify-center cursor-zoom-in group relative" onClick={abrirZoomQR}>
                        <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-slate-900/10 rounded-2xl transition flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                            <i className="fas fa-search-plus text-slate-600 text-2xl"></i>
                        </div>
                        <img src={qrData.src} alt="QR" className="w-full max-w-[220px] h-auto object-contain" />
                    </div>

                    <div className="mt-6 font-black text-slate-700 text-center bg-slate-50 w-full py-3 px-4 rounded-xl border border-slate-100 text-sm">
                        {qrData.nombre}
                    </div>
                </div>

                <div className="p-4 bg-slate-900">
                    <button onClick={() => setBrilloMaximo(true)} className="w-full bg-gradient-to-r from-yellow-300 to-yellow-500 hover:from-yellow-200 hover:to-yellow-400 text-yellow-950 font-black py-4 rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.3)] transition active:scale-95 flex items-center justify-center gap-2 text-sm tracking-wide">
                        <i className="fas fa-sun"></i> MODO BRILLO ALTO
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* OVERLAY TÁCTIL ZOOM QR */}
      {showZoomQR && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-0 backdrop-blur-xl touch-none overflow-hidden">
            <button onClick={() => setShowZoomQR(false)} className="absolute top-6 right-6 w-12 h-12 bg-black/50 text-white rounded-full flex items-center justify-center transition backdrop-blur-md border border-white/20 z-[110] shadow-2xl">
                <i className="fas fa-times text-xl"></i>
            </button>

            <div 
              className="w-full h-full flex items-center justify-center relative"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
                <img 
                  ref={zoomImgRef}
                  src={qrData.src} 
                  alt="QR Zoom"
                  className="max-w-full max-h-[85vh] object-contain origin-center will-change-transform" 
                  style={{ transform: `translate(0px, 0px) scale(1)` }}
                />
            </div>

            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold tracking-wide pointer-events-none animate-pulse">
                <i className="fas fa-hand-pointer mr-1"></i> Arrastra y pellizca para hacer zoom
            </div>
        </div>
      )}

      {/* CONTENEDOR TOASTS */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 w-[90%] md:w-max z-[9999] pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className={`text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold text-center flex items-center gap-2 justify-center border border-white/10 animate-fade-in-up ${t.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
                {t.type === 'error' ? <i className="fas fa-exclamation-circle"></i> : <i className="fas fa-check-circle text-emerald-400"></i>} {t.msg}
            </div>
        ))}
      </div>

    </div>
  );
};

export default AppOperador;
