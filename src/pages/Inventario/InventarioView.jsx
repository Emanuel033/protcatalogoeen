import React, { useState, useEffect, useCallback } from 'react';
import { collection, doc, addDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
// Importación explícita con extensión .js para evitar conflictos en el build de GitHub Actions
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
    archivar: 'Archivar',
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
    noArchivarVacio: 'No hay productos para procesar.',
    confirmaArchivar: '¿Deseas archivar localmente tu progreso actual?',
    confirmaSincronizar: '¿Deseas finalizar este conteo y enviarlo a la nube/PC para su revisión?',
    confirmaRecuperar: '¿Deseas recuperar los productos seleccionados a tu lista actual?',
    noConteosDia: 'No hay conteos registrados el día de hoy.',
    archivoExito: 'Productos archivados localmente con éxito.',
    sincExito: '¡Conteo finalizado y respaldado en la nube exitosamente!',
    recuperadoExito: 'Productos recuperados y listos para editar.',
    csvExito: 'Archivo CSV generado exitosamente.',
    cancelar: 'Cancelar',
    aceptar: 'Aceptar',
    aceptarSinc: 'Sí, Sincronizar',
    // TEXTOS MODO SELECCIÓN
    seleccionar: 'Seleccionar',
    selTodo: 'Todo',
    selNada: 'Nada', 
    archivarSel: 'Archivar ({n})',
    sincronizarSel: 'Sincronizar ({n})',
    recuperarSel: 'Recuperar ({n})',
    errorSelVacia: 'Selecciona al menos un producto.',
    // TEXTOS NUBE / VISTAS
    botonSincronizar: 'Finalizar y Sincronizar',
    pestañaConteo: '📱 Captura',
    pestañaNube: '☁️ Nube / PC',
    copiado: '¡Código copiado al portapapeles!',
    // TRADUCCIONES TABLA NUBE
    nubeVacia: 'No hay sesiones sincronizadas pendientes.',
    sesionNum: 'Sesión #{n}',
    origenDispositivo: 'Almacén',
    tablaTitulo: 'Revisión de Ajustes (Nube)',
    tablaSub: 'Toca el SKU para copiarlo al POS',
    colSku: 'Código (SKU)',
    colProd: 'Producto',
    colSis: 'Sistema',
    colFis: 'Físico',
    colDif: 'Dif.',
    sinSesionSel: 'Selecciona una sesión de la barra superior para revisar sus diferencias.',
    copiarBoton: 'Copiar'
  },
  fr: {
    titulo: 'Inventaire EEN',
    cargando: 'Chargement du catalogue...',
    listas: 'pièces prêtes',
    errorCarga: 'Erreur de chargement',
    modoOffline: 'Hors Ligne',
    archivar: 'Archiver',
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
    noArchivarVacio: 'Aucun produit à traiter.',
    confirmaArchivar: 'Voulez-vous archiver localement votre progression ?',
    confirmaSincronizar: 'Voulez-vous finaliser ce comptage et l\'envoyer au serveur ?',
    confirmaRecuperar: 'Voulez-vous récupérer ces produits dans votre liste ?',
    noConteosDia: 'Aucun comptage enregistré aujourd\'hui.',
    archivoExito: 'Produits archivés localement avec succès.',
    sincExito: 'Comptage finalisé et synchronisé avec succès !',
    recuperadoExito: 'Produits récupérés et prêts à être édités.',
    csvExito: 'Fichier CSV généré avec succès.',
    cancelar: 'Annuler',
    aceptar: 'Accepter',
    aceptarSinc: 'Oui, Synchroniser',
    // TEXTOS MODO SELECCIÓN
    seleccionar: 'Sélectionner',
    selTodo: 'Tout',
    selNada: 'Rien', 
    archivarSel: 'Archiver ({n})',
    sincronizarSel: 'Synchroniser ({n})',
    recuperarSel: 'Récupérer ({n})',
    errorSelVacia: 'Sélectionnez au moins un produit.',
    // TEXTOS NUBE / VISTAS
    botonSincronizar: 'Finaliser et Synchroniser',
    pestañaConteo: '📱 Capture',
    pestañaNube: '☁️ Serveur / PC',
    copiado: 'Code copié dans le presse-papiers !',
    // TRADUCCIONES TABLA NUBE
    nubeVacia: 'Aucune session synchronisée en attente.',
    sesionNum: 'Session #{n}',
    origenDispositivo: 'Entrepôt',
    tablaTitulo: 'Révision des Ajustements',
    tablaSub: 'Touchez le SKU pour le copier',
    colSku: 'Code (SKU)',
    colProd: 'Produit',
    colSis: 'Système',
    colFis: 'Physique',
    colDif: 'Diff.',
    sinSesionSel: 'Sélectionnez une session ci-dessus pour voir les différences.',
    copiarBoton: 'Copier'
  }
};

const InventarioView = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [idioma, setIdioma] = useState('es');
  const t = tInv[idioma]; 

  // --- CONTROL DE VISTAS ---
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

  const [confirmar, setConfirmar] = useState({ visible: false, mensaje: '', onConfirm: null, textoAceptar: t.aceptar });
  const pedirConfirmacion = (mensaje, onConfirm, textoPersonalizado = t.aceptar) => {
    setConfirmar({ visible: true, mensaje, onConfirm, textoAceptar: textoPersonalizado });
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
  // FLUJO 1: SINCRONIZACIÓN MAESTRA A NUBE (Incluye creación de Master)
  // ==========================================================================
  const handleSincronizacionTotal = () => {
    if (listaConteo.length === 0) { mostrarToast(t.noArchivarVacio, 'error'); return; }
    if (modoSeleccion && seleccionados.length === 0) { mostrarToast(t.errorSelVacia, 'error'); return; }

    pedirConfirmacion(t.confirmaSincronizar, async () => {
      const itemsAProcesar = modoSeleccion && seleccionados.length > 0 
        ? listaConteo.filter(item => seleccionados.includes(item.codigo)) 
        : [...listaConteo];
      const itemsRestantes = modoSeleccion && seleccionados.length > 0
        ? listaConteo.filter(item => !seleccionados.includes(item.codigo))
        : [];

      // Inyectar empaques nuevos en productos_master
      for (const item of itemsAProcesar) {
        const codigoPadre = String(item.codigo).toUpperCase();
        const paquetesFantasmas = item.variantes.filter(v => v.isFantasma && v.pz > 1);
        
        for (const fantasma of paquetesFantasmas) {
          const pz = parseInt(fantasma.pz);
          const nuevoSku = `${codigoPadre}-${pz}PZ`;
          try {
            await setDoc(doc(db, 'productos_master', codigoPadre), {
              paquetes: {
                [`paquete_${pz}`]: {
                  sku: nuevoSku, nombre_paquete: `Paquete de ${pz} piezas`, piezas: pz, es_default: true
                }
              }
            }, { merge: true });
          } catch (err) { console.error(`Error inyectando master ${nuevoSku}:`, err); }
        }
      }

      // Subir Bitácora Firebase
      try {
        await addDoc(collection(db, 'bitacora_inventario'), {
          fecha: serverTimestamp(),
          items: itemsAProcesar,
          total_skus: itemsAProcesar.length,
          origen: t.origenDispositivo
        });
      } catch (e) { console.error("Error nube:", e); }

      // Respaldar en Historial Local
      const nuevoRegistro = { id: Date.now(), fecha: new Date().toISOString(), items: itemsAProcesar };
      const historialPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      localStorage.setItem('een_historial_conteos', JSON.stringify([nuevoRegistro, ...historialPrevio].slice(0, 50)));

      setListaConteo(itemsRestantes); 
      setModoSeleccion(false);
      setSeleccionados([]);
      if(itemsRestantes.length === 0) localStorage.removeItem('een_inventario_activo'); 
      
      mostrarToast(t.sincExito, 'success');
    }, t.aceptarSinc);
  };

  // ==========================================================================
  // FLUJO 2: ARCHIVADO EXCLUSIVAMENTE LOCAL (Comportamiento Clásico)
  // ==========================================================================
  const handleFinalizarConteo = () => {
    if (listaConteo.length === 0) { mostrarToast(t.noArchivarVacio, 'error'); return; }
    if (modoSeleccion && seleccionados.length === 0) { mostrarToast(t.errorSelVacia, 'error'); return; }

    pedirConfirmacion(t.confirmaArchivar, () => {
      const itemsAArchivar = modoSeleccion && seleccionados.length > 0 
        ? listaConteo.filter(item => seleccionados.includes(item.codigo)) 
        : [...listaConteo];
        
      const itemsRestantes = modoSeleccion && seleccionados.length > 0
        ? listaConteo.filter(item => !seleccionados.includes(item.codigo))
        : [];

      const nuevoRegistro = { id: Date.now(), fecha: new Date().toISOString(), items: itemsAArchivar };
      const historialPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      localStorage.setItem('een_historial_conteos', JSON.stringify([nuevoRegistro, ...historialPrevio].slice(0, 50)));

      setListaConteo(itemsRestantes); 
      setModoSeleccion(false);
      setSeleccionados([]);
      
      if(itemsRestantes.length === 0) localStorage.removeItem('een_inventario_activo'); 
      mostrarToast(t.archivoExito, 'success');
    });
  };

  const copiarCodigo = (texto) => { navigator.clipboard.writeText(texto); mostrarToast(t.copiado, 'success'); };

  // Selección Local
  const toggleSeleccion = (codigo) => setSeleccionados(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  const toggleSeleccionHistorial = (codigo) => setSeleccionadosHistorial(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  const toggleTodos = () => setSeleccionados(seleccionados.length === listaConteo.length ? [] : listaConteo.map(i => i.codigo));
  const toggleTodosHistorial = () => setSeleccionadosHistorial(seleccionadosHistorial.length === conteoSeleccionado.items.length ? [] : conteoSeleccionado.items.map(i => i.codigo));

  // Recuperar Historial
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

  // Exportaciones CSV
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
                 <button onClick={() => { confirmar.onConfirm(); setConfirmar({visible: false}); }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/50">{confirmar.textoAceptar}</button>
              </div>
           </div>
        </div>
      )}

      {/* 1. BARRA SUPERIOR DE NAVEGACIÓN GLOBAL ULTRA COMPACTA */}
      <div className="bg-slate-950 border-b border-slate-850 px-4 py-2.5 flex justify-between items-center shrink-0 z-50">
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-750 shadow-inner">
          <button onClick={() => { setVistaActual('conteo'); setModoSeleccion(false); }} className={`px-3 py-1 rounded-lg font-black text-xs transition-all ${vistaActual === 'conteo' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
            {t.pestañaConteo}
          </button>
          <button onClick={() => { setVistaActual('nube'); setModoSeleccion(false); }} className={`px-3 py-1 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${vistaActual === 'nube' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
            {t.pestañaNube}
            {sesionesNube.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isOffline && <span className="bg-red-500 text-white font-black text-[9px] px-2 py-1 rounded animate-pulse">OFFLINE</span>}
          <button onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} className="bg-slate-800 border border-slate-700 hover:bg-slate-750 px-3 py-1 rounded-lg font-bold text-xs text-white transition-colors">
            {t.idioma}
          </button>
        </div>
      </div>

      {/* 2. CABECERA DINÁMICA ORIGINAL (Solo activa en Captura) */}
      {vistaActual === 'conteo' && (
        <header className={`border-b shrink-0 shadow-lg z-40 transition-colors ${modoSeleccion ? 'bg-blue-900/40 border-blue-500/50' : 'bg-slate-900 border-slate-700'} p-4 flex flex-col gap-4`}>
          
          {/* Fila del Título Principal */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg border shrink-0 ${modoSeleccion ? 'bg-blue-500 border-blue-400 text-white' : 'bg-blue-600 border-blue-500/50 shadow-blue-900/50'}`}>
                <i className={`fas ${modoSeleccion ? 'fa-check-double' : estaEscuchando ? 'fa-microphone animate-pulse text-red-200' : 'fa-clipboard-list text-white'}`}></i>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight text-white truncate">
                  {modoSeleccion ? `${seleccionados.length} Seleccionados` : t.titulo}
                </h1>
                <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider truncate">
                  {modoSeleccion ? 'Modo de edición parcial' : (catStatus.error ? t.errorCarga : catStatus.loading ? t.cargando : `${catStatus.count} ${t.listas}`)}
                </p>
              </div>
            </div>

            {/* Botón de Selección Parcial */}
            {listaConteo.length > 0 && (
              <button 
                onClick={() => { setModoSeleccion(!modoSeleccion); setSeleccionados([]); }} 
                className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm border shrink-0 ${modoSeleccion ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30'}`}
              >
                <i className={`fas ${modoSeleccion ? 'fa-times' : 'fa-check-square'} mr-1.5`}></i>
                {modoSeleccion ? t.cancelar : t.seleccionar}
              </button>
            )}
          </div>

          {/* Fila de Botonera Maestra */}
          {modoSeleccion ? (
            <div className="flex gap-3">
               <button onClick={toggleTodos} className="flex-1 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white p-3 rounded-2xl transition-all shadow-sm font-bold text-sm flex justify-center items-center gap-2 active:scale-95">
                 <i className={`far ${seleccionados.length === listaConteo.length ? 'fa-square' : 'fa-check-square'}`}></i> {seleccionados.length === listaConteo.length ? t.selNada : t.selTodo}
               </button>
               <button onClick={handleSincronizacionTotal} className="flex-[2] bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 text-white p-3 rounded-2xl transition-all shadow-lg font-black text-sm uppercase tracking-wider flex justify-center items-center gap-2 active:scale-95">
                 <i className="fas fa-cloud-upload-alt"></i> {t.sincronizarSel?.replace('{n}', seleccionados.length)}
               </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              
              {/* BOTÓN MAESTRO DE NUBE (Fácil acceso arriba) */}
              {listaConteo.length > 0 && (
                <button 
                  onClick={handleSincronizacionTotal}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/50 border border-emerald-400 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <i className="fas fa-cloud-upload-alt text-lg"></i> {t.botonSincronizar}
                </button>
              )}

              {/* TUS 4 BOTONES GRANDES CLÁSICOS EN CUADRÍCULA */}
              <div className="grid grid-cols-4 gap-3">
                <button onClick={handleFinalizarConteo} className="flex flex-col items-center justify-center gap-1.5 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-400 p-3 rounded-2xl transition-all shadow-sm active:scale-95">
                  <i className="fas fa-archive text-xl"></i>
                  <span className="text-[10px] font-black uppercase text-center leading-tight tracking-tighter text-amber-200">{t.archivar}</span>
                </button>
                <button onClick={descargarCSV} className="flex flex-col items-center justify-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-400 p-3 rounded-2xl transition-all shadow-sm active:scale-95">
                  <i className="fas fa-file-excel text-xl"></i>
                  <span className="text-[10px] font-black uppercase text-center leading-tight tracking-tighter text-emerald-200">{t.csvVista}</span>
                </button>
                <button onClick={generarCSVDia} className="flex flex-col items-center justify-center gap-1.5 bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500/30 text-blue-400 p-3 rounded-2xl transition-all shadow-sm active:scale-95">
                  <i className="fas fa-file-csv text-xl"></i>
                  <span className="text-[10px] font-black uppercase text-center leading-tight tracking-tighter text-blue-200">{t.csvDia}</span>
                </button>
                <button onClick={() => setMostrarHistorial(true)} className="flex flex-col items-center justify-center gap-1.5 bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-400 p-3 rounded-2xl transition-all shadow-sm active:scale-95">
                  <i className="fas fa-history text-xl"></i>
                  <span className="text-[10px] font-black uppercase text-center leading-tight tracking-tighter text-purple-200">{t.historial}</span>
                </button>
              </div>

            </div>
          )}
        </header>
      )}

      {/* CUERPO CENTRAL */}
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

            {/* BOTÓN INFERIOR FIJO (Mantenido como red de seguridad al final del scroll) */}
            {listaConteo.length > 0 && (
              <div className="fixed bottom-4 left-4 right-4 max-w-5xl mx-auto z-30 animate-fade-in">
                <button 
                  onClick={handleSincronizacionTotal}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-2xl transition-all flex items-center justify-center gap-2.5 border active:scale-[0.99] ${
                    modoSeleccion ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 border-amber-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                  }`}
                >
                  <i className={`fas ${modoSeleccion ? 'fa-archive' : 'fa-cloud-upload-alt'} text-lg`}></i> 
                  {modoSeleccion ? t.sincronizarSel.replace('{n}', seleccionados.length) : t.botonSincronizar}
                </button>
              </div>
            )}
          </div>
        ) : (
          
        /* VISTA 2: NUBE / REVISIÓN RESPONSIVA (MÓVIL + TRADUCCIÓN FRANCÉS) */
          <div className="flex flex-col gap-5 animate-fade-in pb-10">
            
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scroll">
              {sesionesNube.length === 0 ? (
                <p className="text-slate-500 text-sm italic py-4">{t.nubeVacia}</p>
              ) : (
                sesionesNube.map((sesion, idx) => {
                  const isSelected = sesionSeleccionadaNube?.id === sesion.id;
                  const fechaStr = sesion.fecha ? new Date(sesion.fecha.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Live';
                  return (
                    <button
                      key={sesion.id}
                      onClick={() => setSesionSeleccionadaNube(sesion)}
                      className={`p-3 rounded-2xl border text-left shrink-0 transition-all flex flex-col gap-1 min-w-[140px] ${isSelected ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                        {t.sesionNum.replace('{n}', sesionesNube.length - idx)}
                      </span>
                      <span className="font-bold text-xs text-slate-200">{fechaStr} • {sesion.total_skus || 0} SKUs</span>
                      <span className="text-[9px] text-slate-500 truncate"><i className="fas fa-warehouse mr-1"></i>{sesion.origen || t.origenDispositivo}</span>
                    </button>
                  );
                })
              )}
            </div>

            {sesionSeleccionadaNube ? (
              <div className="flex flex-col gap-4">
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <i className="fas fa-cloud-download-alt text-purple-400"></i> {t.tablaTitulo}
                  </h3>
                  <span className="text-[11px] text-slate-400">{t.tablaSub}</span>
                </div>

                {/* VISTA MÓVIL: Listado de Tarjetas Compactas */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {sesionSeleccionadaNube.items?.map((item) => {
                    const ajuste = item.totalFisico - item.stockSistema;
                    const colorDif = ajuste > 0 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : ajuste < 0 ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-emerald-400 border-slate-700 bg-slate-800/50';
                    
                    return (
                      <div key={item.codigo} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
                        <button 
                          onClick={() => copiarCodigo(item.codigo)}
                          className="w-full bg-slate-900 border border-slate-650 hover:border-blue-500 text-blue-400 p-2.5 rounded-xl font-mono font-black text-sm flex items-center justify-between active:scale-[0.98] transition-all"
                        >
                          <span className="tracking-wider">{item.codigo}</span>
                          <span className="text-[10px] font-sans font-bold bg-blue-600/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30 uppercase tracking-widest flex items-center gap-1">
                            <i className="fas fa-copy"></i> {t.copiarBoton}
                          </span>
                        </button>
                        
                        <p className="font-bold text-xs text-white leading-tight">{item.nombre}</p>

                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-700/60 text-center">
                          <div className="bg-slate-900/40 p-2 rounded-lg">
                            <span className="block text-[9px] font-black text-slate-500 uppercase">{t.colSis}</span>
                            <span className="font-bold text-xs text-slate-300">{item.stockSistema}</span>
                          </div>
                          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-750">
                            <span className="block text-[9px] font-black text-blue-400 uppercase">{t.colFis}</span>
                            <span className="font-black text-xs text-white">{item.totalFisico}</span>
                          </div>
                          <div className={`p-2 rounded-lg border ${colorDif}`}>
                            <span className="block text-[9px] font-black uppercase opacity-80">{t.colDif}</span>
                            <span className="font-black text-xs">{ajuste > 0 ? `+${ajuste}` : ajuste}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* VISTA ESCRITORIO: Tabla Clásica Ancha */}
                <div className="hidden md:block bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-700">
                        <th className="p-3 pl-4 w-36">{t.colSku}</th>
                        <th className="p-3">{t.colProd}</th>
                        <th className="p-3 text-center w-20">{t.colSis}</th>
                        <th className="p-3 text-center w-20">{t.colFis}</th>
                        <th className="p-3 text-center pr-4 w-20">{t.colDif}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-xs font-medium text-slate-200">
                      {sesionSeleccionadaNube.items?.map((item) => {
                        const ajuste = item.totalFisico - item.stockSistema;
                        const colorDif = ajuste > 0 ? 'text-amber-400 font-black' : ajuste < 0 ? 'text-red-400 font-black' : 'text-emerald-400';
                        return (
                          <tr key={item.codigo} className="hover:bg-slate-750/50 transition-colors group">
                            <td className="p-3 pl-4 font-mono font-bold">
                              <button onClick={() => copiarCodigo(item.codigo)} className="w-full text-left text-blue-400 hover:text-blue-300 flex items-center justify-between bg-slate-900/40 hover:bg-slate-900 p-1.5 rounded-lg border border-slate-700 group-hover:border-blue-500/40 transition-all">
                                <span>{item.codigo}</span> <i className="fas fa-copy text-[10px] opacity-40 group-hover:opacity-100"></i>
                              </button>
                            </td>
                            <td className="p-3 font-bold text-white truncate max-w-sm">{item.nombre}</td>
                            <td className="p-3 text-center text-slate-400">{item.stockSistema}</td>
                            <td className="p-3 text-center font-bold text-white bg-slate-900/20">{item.totalFisico}</td>
                            <td className={`p-3 text-center pr-4 ${colorDif}`}>{ajuste > 0 ? `+${ajuste}` : ajuste}</td>
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
                  <i className="fas fa-mobile-alt text-3xl text-slate-600 mb-3 animate-pulse"></i>
                  <p className="text-xs font-bold text-slate-400">{t.sinSesionSel}</p>
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
