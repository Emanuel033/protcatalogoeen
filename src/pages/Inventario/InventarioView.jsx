import React, { useState, useEffect, useCallback } from 'react';
import { collection, doc, addDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
// CORRECCIÓN LÍNEA 3: Forzamos explícitamente la extensión .js para que Vite no lea firebase.json
import { db } from '../../firebase.js'; 

import EscanerManual from './components/EscanerManual';
import ListaConteo from './components/ListaConteo';
import ModalCalculadora from './components/ModalCalculadora';
import useDictadoVoz from './hooks/useDictadoVoz';

// --- DICCIONARIO BILINGÜE CENTRALIZADO ---
const tInv = {
  es: {
    titulo: 'Inventario EEN',
    cargando: 'Cargando catálogo...',
    listas: 'piezas listas',
    errorCarga: 'Error de carga',
    modoOffline: 'Modo Offline',
    csvVista: 'CSV Actual',
    csvDia: 'CSV del Día',
    historial: 'Historial',
    idioma: '🇲🇽 ES',
    detalleConteo: 'Detalle del Conteo',
    historialArchivados: 'Historial Archivados',
    recuperar: 'Recuperar Conteo',
    noArchivados: 'No hay conteos archivados.',
    skusContados: 'SKUs contados',
    cerrarVerificacion: 'Cerrar verificación',
    listaVacia: 'La lista actual está vacía.',
    noArchivarVacio: 'No hay productos para sincronizar.',
    confirmaSincronizar: '¿Deseas finalizar este conteo y enviarlo a la PC para su revisión?',
    confirmaRecuperar: '¿Deseas recuperar los productos seleccionados a tu lista actual?',
    noConteosDia: 'No hay conteos registrados el día de hoy.',
    sincExito: '¡Conteo finalizado y enviado a la PC exitosamente!',
    recuperadoExito: 'Productos recuperados y listos para editar.',
    csvExito: 'Archivo CSV generado exitosamente.',
    cancelar: 'Cancelar',
    aceptar: 'Sí, Enviar',
    // TEXTOS MODO SELECCIÓN
    seleccionar: 'Seleccionar',
    selTodo: 'Todo',
    selNada: 'Nada', 
    sincronizarSel: 'Enviar Seleccionados ({n})',
    recuperarSel: 'Recuperar ({n})',
    errorSelVacia: 'Selecciona al menos un producto.',
    // TEXTOS NUBE / VISTAS
    botonSincronizar: 'Finalizar y Sincronizar',
    pestañaConteo: '📱 Captura',
    pestañaNube: '💻 Revisión PC',
    copiado: '¡Código copiado al portapapeles!'
  },
  fr: {
    titulo: 'Inventaire EEN',
    cargando: 'Chargement du catalogue...',
    listas: 'pièces prêtes',
    errorCarga: 'Erreur de chargement',
    modoOffline: 'Hors Ligne',
    csvVista: 'CSV Actuel',
    csvDia: 'CSV du Jour',
    historial: 'Historique',
    idioma: '🇫🇷 FR',
    detalleConteo: 'Détail du comptage',
    historialArchivados: 'Historique archivé',
    recuperar: 'Récupérer Comptage',
    noArchivados: 'Aucun comptage archivé.',
    skusContados: 'SKUs comptés',
    cerrarVerificacion: 'Fermer la vérification',
    listaVacia: 'La liste actuelle est vide.',
    noArchivarVacio: 'Aucun produit à synchroniser.',
    confirmaSincronizar: 'Voulez-vous finaliser ce comptage et l\'envoyer au PC ?',
    confirmaRecuperar: 'Voulez-vous récupérer ces produits dans votre liste ?',
    noConteosDia: 'Aucun comptage enregistré aujourd\'hui.',
    sincExito: 'Comptage finalisé et envoyé au PC avec succès !',
    recuperadoExito: 'Produits récupérés et prêts à être édités.',
    csvExito: 'Fichier CSV généré avec succès.',
    cancelar: 'Annuler',
    aceptar: 'Oui, Envoyer',
    // TEXTOS MODO SELECCIÓN
    seleccionar: 'Sélectionner',
    selTodo: 'Tout',
    selNada: 'Rien', 
    sincronizarSel: 'Envoyer Sélection ({n})',
    recuperarSel: 'Récupérer ({n})',
    errorSelVacia: 'Sélectionnez au moins un produit.',
    // TEXTOS NUBE / VISTAS
    botonSincronizar: 'Finaliser et Synchroniser',
    pestañaConteo: '📱 Capture',
    pestañaNube: '💻 Révision PC',
    copiado: 'Code copié !'
  }
};

const InventarioView = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [idioma, setIdioma] = useState('es');
  const t = tInv[idioma]; 

  // --- CONTROL DE VISTAS (Móvil vs PC) ---
  const [vistaActual, setVistaActual] = useState('conteo'); 
  const [sesionesNube, setSesionesNube] = useState([]);
  const [sesionSeleccionadaNube, setSesionSeleccionadaNube] = useState(null);

  // --- ESTADOS DE SELECCIÓN ---
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  
  const [modoSeleccionHistorial, setModoSeleccionHistorial] = useState(false);
  const [seleccionadosHistorial, setSeleccionadosHistorial] = useState([]);

  // --- NOTIFICACIONES Y CONFIRMACIONES ---
  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: 'info' });
  const mostrarToast = (mensaje, tipo = 'info') => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
  };

  const [confirmar, setConfirmar] = useState({ visible: false, mensaje: '', onConfirm: null });
  const pedirConfirmacion = (mensaje, onConfirm) => {
    setConfirmar({ visible: true, mensaje, onConfirm });
  };

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const [catalogoBase, setCatalogoBase] = useState([]);
  const [catStatus, setCatStatus] = useState({ loading: true, count: 0, error: false });
  
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [conteoSeleccionado, setConteoSeleccionado] = useState(null);
  
  const [listaConteo, setListaConteo] = useState(() => {
    const guardado = localStorage.getItem('een_inventario_activo');
    return guardado ? JSON.parse(guardado) : [];
  });
  
  const [calcActiva, setCalcActiva] = useState({ isOpen: false, codigo: null, varId: null, nombre: '' });
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  useEffect(() => { localStorage.setItem('een_inventario_activo', JSON.stringify(listaConteo)); }, [listaConteo]);

  // Carga de catálogo local
  useEffect(() => {
    fetch('/catalogo_completo.json')
      .then(res => res.json())
      .then(data => {
        const piezas = data.filter(p => p.tipo_item === 'PIEZA_BASE');
        setCatalogoBase(piezas);
        setCatStatus({ loading: false, count: piezas.length, error: false });
      })
      .catch(() => setCatStatus({ loading: false, count: 0, error: true }));
  }, []);

  // Escuchar Nube en vivo
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'bitacora_inventario'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.fecha?.toMillis() || 0) - (a.fecha?.toMillis() || 0));
      setSesionesNube(data);
    });
    return () => unsubscribe();
  }, []);
  
  const manualCant = useCallback((codigo, varId, valor) => {
    const pz = parseInt(valor, 10) || 0;
    setListaConteo(prev => prev.map(prod => {
      if (prod.codigo !== codigo) return prod;
      const nuevasVariantes = prod.variantes.map(v => v.id === varId ? { ...v, contadas: Math.max(0, pz) } : v);
      const nuevoTotal = nuevasVariantes.reduce((sum, v) => sum + (v.pz * v.contadas), 0);
      return { ...prod, variantes: nuevasVariantes, totalFisico: nuevoTotal };
    }));
  }, []);

  const cambiarCant = (codigo, varId, delta) => {
    const prod = listaConteo.find(p => p.codigo === codigo);
    const variante = prod?.variantes.find(v => v.id === varId);
    if (variante) manualCant(codigo, varId, variante.contadas + delta);
  };

  const { iniciarDictado, estaEscuchando } = useDictadoVoz(idioma, (codigo, varId, cantidad) => {
    manualCant(codigo, varId, cantidad);
  });

  const agregarProductoALista = (codigoBuscado) => {
    const cod = String(codigoBuscado).trim().toLowerCase();
    let prod = catalogoBase.find(p => String(p.codigo).toLowerCase() === cod);
    if (!prod) {
      prod = catalogoBase.find(p => {
        let pkgs = Array.isArray(p.paquetes) ? p.paquetes : Object.values(p.paquetes || {});
        return pkgs.some(e => String(e.sku).toLowerCase() === cod || String(e.codigo_barras).toLowerCase() === cod);
      });
    }

    if (prod && !listaConteo.find(i => i.codigo === String(prod.codigo))) {
      let empaquesLimpios = [];
      if (prod.paquetes && Object.keys(prod.paquetes).length > 0) {
        empaquesLimpios = Object.values(prod.paquetes).filter(p => p && p.piezas);
      } else if (prod.empaques_tips && Object.keys(prod.empaques_tips).length > 0) {
        empaquesLimpios = Object.values(prod.empaques_tips).map(qty => ({ piezas: parseInt(qty) })).filter(p => p.piezas);
      }

      const variantes = [
        { id: 'sueltas', pz: 1, contadas: 0 },
        ...empaquesLimpios.map((e, i) => ({ id: `emp_${i}`, pz: parseInt(e.piezas), contadas: 0 }))
      ].sort((a, b) => b.pz - a.pz);

      setListaConteo(prev => [{
        codigo: String(prod.codigo),
        nombre: prod.descripcion_oficial || prod.nombre,
        stockSistema: parseFloat(prod.stock || 0),
        imagen: prod.image || prod.imagen || null,
        variantes,
        totalFisico: 0
      }, ...prev]);
    }
  };

  // ==========================================================================
  // FLUJO MAESTRO UNIFICADO: SINCRONIZAR A NUBE + GUARDAR HISTORIAL + CREAR MASTER
  // ==========================================================================
  const handleSincronizacionTotal = () => {
    if (listaConteo.length === 0) { mostrarToast(t.noArchivarVacio, 'error'); return; }
    if (modoSeleccion && seleccionados.length === 0) { mostrarToast(t.errorSelVacia, 'error'); return; }

    pedirConfirmacion(t.confirmaSincronizar, async () => {
      // 1. Separar lo que se procesa según selección
      const itemsAProcesar = modoSeleccion && seleccionados.length > 0 
        ? listaConteo.filter(item => seleccionados.includes(item.codigo)) 
        : [...listaConteo];
      const itemsRestantes = modoSeleccion && seleccionados.length > 0
        ? listaConteo.filter(item => !seleccionados.includes(item.codigo))
        : [];

      // 2. Dar de alta de forma transparente los paquetes nuevos (Fantasmas)
      for (const item of itemsAProcesar) {
        // Utilizamos el "codigo_sistema_oficial" nativo (o el ID del documento si no existe el campo)
        const codigoPadre = String(item.codigo).toUpperCase();
        const paquetesFantasmas = item.variantes.filter(v => v.isFantasma && v.pz > 1);
        
        for (const fantasma of paquetesFantasmas) {
          const pz = parseInt(fantasma.pz);
          const nuevoSku = `${codigoPadre}-${pz}PZ`;
          const llavePaquete = `paquete_${pz}`; // Llave limpia adaptada a tu BD maestro

          try {
            await setDoc(doc(db, 'productos_master', codigoPadre), {
              paquetes: {
                [llavePaquete]: {
                  sku: nuevoSku, 
                  nombre_paquete: `Paquete de ${pz} piezas`, 
                  piezas: pz,
                  es_default: true
                }
              }
            }, { merge: true });
          } catch (err) { console.error(`Error inyectando master ${nuevoSku}:`, err); }
        }
      }

      // 3. Subir a Nube (Bitácora Firebase)
      try {
        await addDoc(collection(db, 'bitacora_inventario'), {
          fecha: serverTimestamp(),
          items: itemsAProcesar,
          total_skus: itemsAProcesar.length,
          origen: 'Tablet Almacén'
        });
      } catch (e) { console.error("Error nube:", e); }

      // 4. Respaldar en Historial Local de la Tablet
      const nuevoRegistro = { id: Date.now(), fecha: new Date().toISOString(), items: itemsAProcesar };
      const historialPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      localStorage.setItem('een_historial_conteos', JSON.stringify([nuevoRegistro, ...historialPrevio].slice(0, 50)));

      // 5. Limpiar UI
      setListaConteo(itemsRestantes); 
      setModoSeleccion(false);
      setSeleccionados([]);
      if(itemsRestantes.length === 0) localStorage.removeItem('een_inventario_activo'); 
      
      mostrarToast(t.sincExito, 'success');
    });
  };

  const copiarCodigo = (texto) => { navigator.clipboard.writeText(texto); mostrarToast(t.copiado, 'success'); };

  // Funciones Selección Local
  const toggleSeleccion = (codigo) => setSeleccionados(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  const toggleSeleccionHistorial = (codigo) => setSeleccionadosHistorial(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  const toggleTodos = () => setSeleccionados(seleccionados.length === listaConteo.length ? [] : listaConteo.map(i => i.codigo));
  const toggleTodosHistorial = () => setSeleccionadosHistorial(seleccionadosHistorial.length === conteoSeleccionado.items.length ? [] : conteoSeleccionado.items.map(i => i.codigo));

  // Recuperar del Historial
  const handleRecuperarConteo = () => {
    const registro = conteoSeleccionado;
    if (modoSeleccionHistorial && seleccionadosHistorial.length === 0) { mostrarToast(t.errorSelVacia, 'error'); return; }
    pedirConfirmacion(t.confirmaRecuperar, () => {
      const itemsARecuperar = modoSeleccionHistorial && seleccionadosHistorial.length > 0 ? registro.items.filter(i => seleccionadosHistorial.includes(i.codigo)) : [...registro.items];
      const itemsRestantes = modoSeleccionHistorial && seleccionadosHistorial.length > 0 ? registro.items.filter(i => !seleccionadosHistorial.includes(i.codigo)) : [];

      setListaConteo(prev => {
        let nuevaLista = [...prev];
        itemsARecuperar.forEach(itemRec => {
          const idx = nuevaLista.findIndex(i => i.codigo === itemRec.codigo);
          if (idx > -1) {
            itemRec.variantes.forEach(vRec => {
              const vEx = nuevaLista[idx].variantes.find(vx => vx.id === vRec.id);
              if (vEx) vEx.contadas += vRec.contadas; else nuevaLista[idx].variantes.push({...vRec});
            });
            nuevaLista[idx].totalFisico = nuevaLista[idx].variantes.reduce((acc, v) => acc + (v.pz * v.contadas), 0);
          } else nuevaLista.push(JSON.parse(JSON.stringify(itemRec)));
        });
        return nuevaLista;
      });

      const histPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      let nuevoHist = itemsRestantes.length === 0 ? histPrevio.filter(r => r.id !== registro.id) : histPrevio.map(r => r.id === registro.id ? { ...r, items: itemsRestantes } : r);
      if (itemsRestantes.length === 0) setConteoSeleccionado(null); else setConteoSeleccionado({ ...registro, items: itemsRestantes });
      
      localStorage.setItem('een_historial_conteos', JSON.stringify(nuevoHist));
      setModoSeleccionHistorial(false); setSeleccionadosHistorial([]);
      if(itemsRestantes.length === 0) setMostrarHistorial(false);
      mostrarToast(t.recuperadoExito, 'success');
    });
  };

  // Exportaciones CSV auxiliares
  const descargarCSV = () => {
    if (listaConteo.length === 0) { mostrarToast(t.listaVacia, 'error'); return; }
    let csv = "\uFEFFCodigo,Producto,Stock Sistema,Total Fisico,Ajuste,Detalle Conteos\n";
    listaConteo.forEach(i => csv += `${i.codigo},${i.nombre.replace(/,/g, "")},${i.stockSistema},${i.totalFisico},${i.totalFisico - i.stockSistema},"${i.variantes.filter(v => v.contadas > 0).map(v => `${v.pz}pz: ${v.contadas}`).join(" | ")}"\n`);
    const l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    l.setAttribute("download", `Conteo_${Date.now()}.csv`); document.body.appendChild(l); l.click(); document.body.removeChild(l);
  };

  const generarCSVDia = () => {
    const hoyStr = new Date().toDateString();
    const conteosHoy = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]').filter(r => new Date(r.fecha).toDateString() === hoyStr);
    let todos = [...listaConteo]; conteosHoy.forEach(r => todos = [...todos, ...r.items]);
    if (todos.length === 0) { mostrarToast(t.noConteosDia, 'error'); return; }

    const agrupar = {};
    todos.forEach(i => {
      if (!agrupar[i.codigo]) agrupar[i.codigo] = JSON.parse(JSON.stringify(i));
      else {
        i.variantes.forEach(vN => { const vE = agrupar[i.codigo].variantes.find(vx => vx.id === vN.id); if (vE) vE.contadas += vN.contadas; else agrupar[i.codigo].variantes.push({...vN}); });
        agrupar[i.codigo].totalFisico = agrupar[i.codigo].variantes.reduce((sum, v) => sum + (v.pz * v.contadas), 0);
      }
    });

    let csv = "\uFEFFCodigo,Producto,Stock Sistema,Total Fisico,Ajuste,Detalle Conteos\n";
    Object.values(agrupar).forEach(i => csv += `${i.codigo},${i.nombre.replace(/,/g, "")},${i.stockSistema},${i.totalFisico},${i.totalFisico - i.stockSistema},"${i.variantes.filter(v => v.contadas > 0).map(v => `${v.pz}pz: ${v.contadas}`).join(" | ")}"\n`);
    const l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    l.setAttribute("download", `Consolidado_Dia.csv`); document.body.appendChild(l); l.click(); document.body.removeChild(l);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-slate-100 relative selection:bg-blue-500/30">
      
      {/* TOASTS Y MODALES */}
      {toast.visible && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] animate-fade-in pointer-events-none w-[90%] max-w-sm">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border-2 ${toast.tipo === 'error' ? 'bg-red-900/95 border-red-500/80' : toast.tipo === 'success' ? 'bg-emerald-900/95 border-emerald-500/80' : 'bg-slate-800/95 border-blue-500/80'} backdrop-blur-md text-white`}>
             <i className={`fas ${toast.tipo === 'error' ? 'fa-exclamation-circle text-red-400' : toast.tipo === 'success' ? 'fa-check-circle text-emerald-400' : 'fa-info-circle text-blue-400'} text-2xl`}></i>
             <p className="text-base font-bold leading-tight">{toast.mensaje}</p>
          </div>
        </div>
      )}

      {confirmar.visible && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-600 p-6 rounded-3xl max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-500/40">
                <i className="fas fa-question text-3xl text-amber-400"></i>
              </div>
              <p className="text-white text-lg font-black mb-6 leading-snug">{confirmar.mensaje}</p>
              <div className="flex gap-3">
                 <button onClick={() => setConfirmar({visible: false})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3.5 rounded-xl font-bold">{t.cancelar}</button>
                 <button onClick={() => { confirmar.onConfirm(); setConfirmar({visible: false}); }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/50">{t.aceptar}</button>
              </div>
           </div>
        </div>
      )}

      {/* HEADER LIMPIO: Solo pestañas de navegación globales e idioma */}
      <header className="bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shrink-0 shadow-md z-40">
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-inner">
          <button onClick={() => { setVistaActual('conteo'); setModoSeleccion(false); }} className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all ${vistaActual === 'conteo' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
            {t.pestañaConteo}
          </button>
          <button onClick={() => { setVistaActual('nube'); setModoSeleccion(false); }} className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${vistaActual === 'nube' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
            {t.pestañaNube}
            {sesionesNube.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isOffline && <span className="bg-red-500 text-white font-black text-[9px] px-2 py-1 rounded animate-pulse">OFFLINE</span>}
          <button onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} className="bg-slate-800 border border-slate-600 px-3 py-1.5 rounded-lg font-bold text-xs text-white">
            {t.idioma}
          </button>
        </div>
      </header>

      {/* SUB-BARRA DE HERRAMIENTAS (Visible en modo conteo) */}
      {vistaActual === 'conteo' && (
        <div className="bg-slate-850 border-b border-slate-700 p-3 px-4 flex justify-between items-center shrink-0 z-30">
          {modoSeleccion ? (
            <button onClick={toggleTodos} className="bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-2">
              <i className={`far ${seleccionados.length === listaConteo.length ? 'fa-square' : 'fa-check-square'}`}></i> {seleccionados.length === listaConteo.length ? t.selNada : t.selTodo}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setMostrarHistorial(true)} className="bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                <i className="fas fa-history text-purple-400"></i> <span className="hidden sm:inline">{t.historial}</span>
              </button>
              {listaConteo.length > 0 && (
                <>
                  <button onClick={descargarCSV} className="bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 px-2.5 py-2 rounded-xl text-[11px] font-bold" title="CSV Local"><i className="fas fa-file-excel text-emerald-400"></i></button>
                  <button onClick={generarCSVDia} className="bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 px-2.5 py-2 rounded-xl text-[11px] font-bold" title="CSV del Día"><i className="fas fa-file-csv text-blue-400"></i></button>
                </>
              )}
            </div>
          )}

          {/* BOTÓN MODO SELECCIÓN PARCIAL */}
          {listaConteo.length > 0 && (
            <button onClick={() => { setModoSeleccion(!modoSeleccion); setSeleccionados([]); }} className={`px-3 py-2 rounded-xl font-bold text-xs transition-colors border ${modoSeleccion ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'}`}>
              <i className={`fas ${modoSeleccion ? 'fa-times' : 'fa-check-square'} mr-1`}></i> {modoSeleccion ? t.cancelar : t.seleccionar}
            </button>
          )}
        </div>
      )}

      {/* CUERPO CENTRAL DE LA APLICACIÓN */}
      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full custom-scroll relative">
        
        {/* VISTA 1: CAPTURA MÓVIL */}
        {vistaActual === 'conteo' ? (
          <div className="flex flex-col gap-5 pb-24">
            {modoSeleccion && <div className="absolute top-0 left-0 right-0 h-24 z-10 bg-slate-900/50 backdrop-blur-[1px] rounded-3xl" />}
            
            <div className="bg-slate-800 p-5 rounded-3xl border border-slate-600 shadow-xl">
               <EscanerManual catalogoBase={catalogoBase} onAgregarProducto={agregarProductoALista} idioma={idioma} />
            </div>

            <ListaConteo 
              listaConteo={listaConteo} 
              idioma={idioma}
              onCambiarCant={cambiarCant}
              onManualCant={manualCant}
              onEliminar={(cod) => setListaConteo(prev => prev.filter(p => p.codigo !== cod))}
              onAgregarEmpaque={(cod, pz) => {
                setListaConteo(prev => prev.map(p => p.codigo === cod ? { ...p, variantes: [...p.variantes, { id: `f_${Date.now()}`, pz: parseInt(pz), contadas: 0, isFantasma: true }].sort((a,b) => b.pz - a.pz) } : p));
              }}
              onAbrirCalculadora={(codigo, varId) => { const p = listaConteo.find(x => x.codigo === codigo); setCalcActiva({ isOpen: true, codigo, varId, nombre: p?.nombre }); }}
              onIniciarDictado={(codigo, varId, btn, letra) => iniciarDictado(codigo, varId, letra)}
              onZoomImagen={(img) => setImagenAmpliada(img)}
              modoSeleccion={modoSeleccion}
              seleccionados={seleccionados}
              onToggleSeleccion={toggleSeleccion}
            />

            {/* BOTÓN PRINCIPAL UNIFICADO (Call to Action Infalible en la base) */}
            {listaConteo.length > 0 && (
              <div className="fixed bottom-4 left-4 right-4 max-w-5xl mx-auto z-30 animate-fade-in">
                <button 
                  onClick={handleSincronizacionTotal}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-2xl transition-all flex items-center justify-center gap-2.5 border active:scale-[0.99] ${
                    modoSeleccion 
                      ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 border-amber-400 shadow-amber-950/50' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-950/80'
                  }`}
                >
                  <i className={`fas ${modoSeleccion ? 'fa-archive' : 'fa-cloud-upload-alt'} text-lg`}></i> 
                  {modoSeleccion ? t.sincronizarSel.replace('{n}', seleccionados.length) : t.botonSincronizar}
                </button>
              </div>
            )}
          </div>
        ) : (
          
        /* VISTA 2: PANEL DE REVISIÓN PC */
          <div className="flex flex-col gap-6 animate-fade-in pb-10">
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scroll">
              {sesionesNube.length === 0 ? (
                <p className="text-slate-500 text-sm italic py-4">No hay sesiones en la nube pendientes de revisión.</p>
              ) : (
                sesionesNube.map((sesion, idx) => {
                  const isSelected = sesionSeleccionadaNube?.id === sesion.id;
                  const fechaStr = sesion.fecha ? new Date(sesion.fecha.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Reciente';
                  return (
                    <button
                      key={sesion.id}
                      onClick={() => setSesionSeleccionadaNube(sesion)}
                      className={`p-3 rounded-2xl border text-left shrink-0 transition-all flex flex-col gap-1 min-w-[160px] ${isSelected ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-950' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Sesión #{sesionesNube.length - idx}</span>
                      <span className="font-bold text-xs text-slate-200">{fechaStr} • {sesion.total_skus || 0} SKUs</span>
                      <span className="text-[9px] text-slate-500 truncate"><i className="fas fa-tablet-alt mr-1"></i>{sesion.origen || 'Almacén'}</span>
                    </button>
                  );
                })
              )}
            </div>

            {sesionSeleccionadaNube ? (
              <div className="bg-slate-800 rounded-3xl border border-slate-600 overflow-hidden shadow-2xl">
                <div className="p-4 bg-slate-850 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <i className="fas fa-table text-purple-400"></i> Tabla para Ajustes en POS
                  </h3>
                  <span className="text-xs text-slate-400">Haz clic en el SKU para copiarlo rápido</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-700">
                        <th className="p-3 pl-4">Código (SKU)</th>
                        <th className="p-3">Producto</th>
                        <th className="p-3 text-center">Sistema</th>
                        <th className="p-3 text-center">Físico</th>
                        <th className="p-3 text-center pr-4">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-xs font-medium text-slate-200">
                      {sesionSeleccionadaNube.items?.map((item) => {
                        const ajuste = item.totalFisico - item.stockSistema;
                        const colorAjuste = ajuste > 0 ? 'text-amber-400 font-black' : ajuste < 0 ? 'text-red-400 font-black' : 'text-emerald-400';
                        return (
                          <tr key={item.codigo} className="hover:bg-slate-750/50 transition-colors group">
                            <td className="p-3 pl-4 font-mono font-bold w-32">
                              <button onClick={() => copiarCodigo(item.codigo)} className="w-full text-left text-blue-400 hover:text-blue-300 flex items-center justify-between bg-slate-900/40 hover:bg-slate-900 p-1.5 rounded-lg border border-slate-700 group-hover:border-blue-500/40 transition-all" title="Copiar código">
                                <span>{item.codigo}</span> <i className="fas fa-copy text-[10px] opacity-40 group-hover:opacity-100 transition-opacity"></i>
                              </button>
                            </td>
                            <td className="p-3 font-bold text-white max-w-xs truncate">{item.nombre}</td>
                            <td className="p-3 text-center text-slate-400">{item.stockSistema}</td>
                            <td className="p-3 text-center font-bold text-white bg-slate-900/20">{item.totalFisico}</td>
                            <td className={`p-3 text-center pr-4 ${colorAjuste}`}>{ajuste > 0 ? `+${ajuste}` : ajuste}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              sesionesNube.length > 0 && (
                <div className="text-center py-12 bg-slate-800/40 rounded-3xl border border-dashed border-slate-700">
                  <i className="fas fa-desktop text-3xl text-slate-600 mb-3 animate-pulse"></i>
                  <p className="text-xs font-bold text-slate-400">Selecciona una sesión de la barra superior para revisar sus diferencias.</p>
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* MODALES AUXILIARES */}
      <ModalCalculadora isOpen={calcActiva.isOpen} tituloTarget={calcActiva.nombre} codigoItem={calcActiva.codigo} varIdItem={calcActiva.varId} onClose={() => setCalcActiva(prev => ({ ...prev, isOpen: false }))} onAplicar={(total) => cambiarCant(calcActiva.codigo, calcActiva.varId, total)} idioma={idioma} />
      {imagenAmpliada && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 touch-none" onClick={() => setImagenAmpliada(null)}><div className="relative max-w-md w-full flex flex-col items-center animate-fade-in" onClick={e => e.stopPropagation()}><button onClick={() => setImagenAmpliada(null)} className="absolute -top-14 right-0 w-12 h-12 bg-slate-800 border border-slate-600 rounded-full text-white shadow-xl flex items-center justify-center"><i className="fas fa-times text-xl"></i></button><div className="bg-white p-3 rounded-3xl shadow-2xl w-full flex justify-center"><img src={imagenAmpliada} alt="Verificación" className="w-full max-h-[70vh] object-contain rounded-2xl mix-blend-multiply" onError={(e) => e.target.src = 'https://dummyimage.com/300x300/e2e8f0/0f172a&text=Sin+Imagen'} /></div><p className="text-white font-black text-xs mt-6 uppercase tracking-widest bg-slate-800 px-6 py-3 rounded-full border border-slate-600 cursor-pointer shadow-lg active:scale-95 transition" onClick={() => setImagenAmpliada(null)}>{t.cerrarVerificacion}</p></div></div>}

      {/* HISTORIAL ARCHIVADO LOCAL */}
      {mostrarHistorial && (
        <div className="fixed inset-0 z-[150] flex flex-col bg-slate-900/98 backdrop-blur-xl animate-fade-in">
          <div className="p-5 border-b border-slate-700 bg-slate-900 sticky top-0 z-10 flex justify-between items-center">
            <h2 className="text-xl font-black text-white">{conteoSeleccionado ? t.detalleConteo : t.historialArchivados}</h2>
            <button onClick={() => { conteoSeleccionado ? setConteoSeleccionado(null) : setMostrarHistorial(false); }} className="w-11 h-11 bg-slate-800 border border-slate-600 rounded-xl flex items-center justify-center text-white"><i className={`fas ${conteoSeleccionado ? 'fa-arrow-left' : 'fa-times'} text-lg`}></i></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-20 custom-scroll">
            {conteoSeleccionado ? <ListaConteo listaConteo={conteoSeleccionado.items} idioma={idioma} soloLectura={true} /> : (
              <div className="grid gap-4 max-w-3xl mx-auto">
                {JSON.parse(localStorage.getItem('een_historial_conteos') || '[]').map(reg => (
                  <div key={reg.id} onClick={() => setConteoSeleccionado(reg)} className="bg-slate-800 border border-slate-600 p-5 rounded-3xl flex justify-between items-center cursor-pointer hover:bg-slate-750">
                    <div><p className="text-white font-black text-lg mb-1 capitalize">{new Date(reg.fecha).toLocaleDateString(idioma==='es'?'es-MX':'fr-FR', { weekday:'long', year:'numeric', month:'short', day:'numeric' })}</p><span className="text-slate-400 text-xs font-bold">{reg.items.length} {t.skusContados}</span></div>
                    <i className="fas fa-chevron-right text-slate-500 text-lg"></i>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default InventarioView;
