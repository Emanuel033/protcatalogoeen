import React, { useState, useEffect, useCallback } from 'react';
import { collection, doc, addDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase'; 

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
    usaArchivar: 'Utiliza el botón "Archivar" para guardar tu progreso.',
    skusContados: 'SKUs contados',
    cerrarVerificacion: 'Cerrar verificación',
    listaVacia: 'La lista actual está vacía.',
    noArchivarVacio: 'No hay productos para archivar.',
    confirmaArchivar: '¿Deseas archivar los productos seleccionados?',
    confirmaRecuperar: '¿Deseas recuperar los productos seleccionados a tu lista actual?',
    noConteosDia: 'No hay conteos registrados el día de hoy.',
    archivoExito: 'Productos archivados correctamente.',
    recuperadoExito: 'Productos recuperados y listos para editar.',
    csvExito: 'Archivo CSV generado exitosamente.',
    cancelar: 'Cancelar',
    aceptar: 'Aceptar',
    // TEXTOS MODO SELECCIÓN
    seleccionar: 'Seleccionar',
    selTodo: 'Todo',
    selNada: 'Nada', 
    archivarSel: 'Archivar ({n})',
    recuperarSel: 'Recuperar ({n})',
    errorSelVacia: 'Selecciona al menos un producto.',
    // TEXTOS NUBE / SINCRONIZACIÓN
    sincronizar: 'Subir a Nube',
    sincExito: 'Datos sincronizados y paquetes actualizados en servidor.',
    pestañaConteo: '📱 Captura',
    pestañaNube: '💻 Revisión PC',
    copiado: '¡Código copiado!',
    sinDiferencia: 'Sin diferencias en esta sesión.',
    ajusteAbrev: 'Ajuste'
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
    usaArchivar: 'Utilisez le bouton "Archiver" pour enregistrer votre progression.',
    skusContados: 'SKUs comptés',
    cerrarVerificacion: 'Fermer la vérification',
    listaVacia: 'La liste actuelle est vide.',
    noArchivarVacio: 'Aucun produit à archiver.',
    confirmaArchivar: 'Voulez-vous archiver les produits sélectionnés ?',
    confirmaRecuperar: 'Voulez-vous récupérer ces produits dans votre liste ?',
    noConteosDia: 'Aucun comptage enregistré aujourd\'hui.',
    archivoExito: 'Produits archivés avec succès.',
    recuperadoExito: 'Produits récupérés et prêts à être édités.',
    csvExito: 'Fichier CSV généré avec succès.',
    cancelar: 'Annuler',
    aceptar: 'Accepter',
    // TEXTOS MODO SELECCIÓN
    seleccionar: 'Sélectionner',
    selTodo: 'Tout',
    selNada: 'Rien', 
    archivarSel: 'Archiver ({n})',
    recuperarSel: 'Récupérer ({n})',
    errorSelVacia: 'Sélectionnez au moins un produit.',
    // TEXTOS NUBE / SINCRONIZACIÓN
    sincronizar: 'Sauvegarder Cloud',
    sincExito: 'Données synchronisées et paquets mis à jour.',
    pestañaConteo: '📱 Capture',
    pestañaNube: '💻 Révision PC',
    copiado: 'Code copié !',
    sinDiferencia: 'Aucune différence dans cette session.',
    ajusteAbrev: 'Ajust.'
  }
};

const InventarioView = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [idioma, setIdioma] = useState('es');
  const t = tInv[idioma]; 

  // --- CONTROL DE VISTAS (Móvil vs PC) ---
  const [vistaActual, setVistaActual] = useState('conteo'); // 'conteo' | 'nube'
  const [sesionesNube, setSesionesNube] = useState([]);
  const [sesionSeleccionadaNube, setSesionSeleccionadaNube] = useState(null);

  // --- ESTADOS DE SELECCIÓN ---
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  
  const [modoSeleccionHistorial, setModoSeleccionHistorial] = useState(false);
  const [seleccionadosHistorial, setSeleccionadosHistorial] = useState([]);

  // --- SISTEMA DE NOTIFICACIONES (TOAST) ---
  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: 'info' });
  const mostrarToast = (mensaje, tipo = 'info') => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
  };

  // --- SISTEMA DE CONFIRMACIÓN MODAL ---
  const [confirmar, setConfirmar] = useState({ visible: false, mensaje: '', onConfirm: null });
  const pedirConfirmacion = (mensaje, onConfirm) => {
    setConfirmar({ visible: true, mensaje, onConfirm });
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/inventario' })
        .then(reg => console.log('SW Inventario aislado con éxito:', reg.scope))
        .catch(err => console.error('Error SW Inventario:', err));
    }
  }, []);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

  useEffect(() => {
    document.title = "Inventario | La Económica del Norte";
  }, []);

  useEffect(() => {
    localStorage.setItem('een_inventario_activo', JSON.stringify(listaConteo));
  }, [listaConteo]);

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

  // Escuchar Bitácora en Nube en tiempo real
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
      const nuevasVariantes = prod.variantes.map(v => 
        v.id === varId ? { ...v, contadas: Math.max(0, pz) } : v
      );
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
        let pkgs = [];
        if (p.paquetes) pkgs = Array.isArray(p.paquetes) ? p.paquetes : Object.values(p.paquetes);
        return pkgs.some(e => String(e.sku).toLowerCase() === cod || String(e.codigo_barras).toLowerCase() === cod);
      });
    }

    if (prod && !listaConteo.find(i => i.codigo === String(prod.codigo))) {
      let paquetesArray = [];
      if (prod.paquetes && Object.keys(prod.paquetes).length > 0) {
        paquetesArray = Array.isArray(prod.paquetes) ? prod.paquetes : Object.values(prod.paquetes);
      } else if (prod.empaques_tips && Object.keys(prod.empaques_tips).length > 0) {
        const tips = Array.isArray(prod.empaques_tips) ? prod.empaques_tips : Object.values(prod.empaques_tips);
        paquetesArray = tips.map(qty => ({ piezas: parseInt(qty) }));
      }
      const empaquesLimpios = paquetesArray.filter(p => p && p.piezas);

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
  // SINCRONIZACIÓN MAESTRA: SUBIR BITÁCORA Y DAR DE ALTA PAQUETES NUEVOS
  // ==========================================================================
  const handleSincronizarNube = async () => {
    if (listaConteo.length === 0) {
      mostrarToast(t.listaVacia, 'error');
      return;
    }

    // 1. Damos de alta los paquetes nuevos en Firebase de forma transparente
    for (const item of listaConteo) {
      const codigoPadre = String(item.codigo).toUpperCase();
      
      // Filtramos las variantes que el usuario creó manualmente (fantasmas)
      const paquetesFantasmas = item.variantes.filter(v => v.isFantasma && v.pz > 1);
      
      for (const fantasma of paquetesFantasmas) {
        const pz = parseInt(fantasma.pz);
        const nuevoSku = `${codigoPadre}-${pz}PZ`;
        const llaveObjeto = `pkg_${codigoPadre.toLowerCase()}_${pz}pz`;

        try {
          const prodRef = doc(db, 'productos_master', codigoPadre);
          // Inyectamos el empaque en el producto maestro preservando el resto de la data
          await setDoc(prodRef, {
            paquetes: {
              [llaveObjeto]: {
                sku: nuevoSku,
                codigo_barras: nuevoSku,
                nombre: `PAQUETE ${pz}PZ`,
                piezas: pz
              }
            }
          }, { merge: true });
        } catch (err) {
          console.error(`Error inyectando paquete maestro ${nuevoSku}:`, err);
        }
      }
    }

    // 2. Subimos la sesión completa a la bitácora para que aparezca en la PC
    try {
      await addDoc(collection(db, 'bitacora_inventario'), {
        fecha: serverTimestamp(),
        items: listaConteo,
        total_skus: listaConteo.length,
        origen: 'App Conteo'
      });
      mostrarToast(t.sincExito, 'success');
    } catch (e) {
      console.error("Error subiendo bitácora:", e);
      mostrarToast("Error de conexión al sincronizar", 'error');
    }
  };

  // --- COPIAR RÁPIDO PARA AJUSTES EN PC ---
  const copiarCodigo = (texto) => {
    navigator.clipboard.writeText(texto);
    mostrarToast(t.copiado, 'success');
  };

  // --- FUNCIONES DE SELECCIÓN ---
  const toggleSeleccion = (codigo) => {
    setSeleccionados(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  };
  
  const toggleSeleccionHistorial = (codigo) => {
    setSeleccionadosHistorial(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  };
  
  const toggleTodos = () => {
    if (seleccionados.length === listaConteo.length) setSeleccionados([]);
    else setSeleccionados(listaConteo.map(i => i.codigo));
  };
  
  const toggleTodosHistorial = () => {
    if (seleccionadosHistorial.length === conteoSeleccionado.items.length) setSeleccionadosHistorial([]);
    else setSeleccionadosHistorial(conteoSeleccionado.items.map(i => i.codigo));
  };

  // --- ARCHIVAR LOCAL ---
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
      const nuevoHistorial = [nuevoRegistro, ...historialPrevio];

      localStorage.setItem('een_historial_conteos', JSON.stringify(nuevoHistorial.slice(0, 50)));

      setListaConteo(itemsRestantes); 
      setModoSeleccion(false);
      setSeleccionados([]);
      
      if(itemsRestantes.length === 0) localStorage.removeItem('een_inventario_activo'); 
      mostrarToast(t.archivoExito, 'success');
    });
  };

  // --- RECUPERAR LOCAL ---
  const handleRecuperarConteo = () => {
    const registro = conteoSeleccionado;
    if (modoSeleccionHistorial && seleccionadosHistorial.length === 0) { mostrarToast(t.errorSelVacia, 'error'); return; }

    pedirConfirmacion(t.confirmaRecuperar, () => {
      const itemsARecuperar = modoSeleccionHistorial && seleccionadosHistorial.length > 0
        ? registro.items.filter(item => seleccionadosHistorial.includes(item.codigo))
        : [...registro.items];

      const itemsRestantesEnHistorial = modoSeleccionHistorial && seleccionadosHistorial.length > 0
        ? registro.items.filter(item => !seleccionadosHistorial.includes(item.codigo))
        : [];

      setListaConteo(prev => {
        let nuevaLista = [...prev];
        itemsARecuperar.forEach(itemRecuperado => {
          const index = nuevaLista.findIndex(i => i.codigo === itemRecuperado.codigo);
          if (index > -1) {
            itemRecuperado.variantes.forEach(vRec => {
              const vEx = nuevaLista[index].variantes.find(vx => vx.id === vRec.id);
              if (vEx) vEx.contadas += vRec.contadas;
              else nuevaLista[index].variantes.push({...vRec});
            });
            nuevaLista[index].totalFisico = nuevaLista[index].variantes.reduce((acc, v) => acc + (v.pz * v.contadas), 0);
          } else {
            nuevaLista.push(JSON.parse(JSON.stringify(itemRecuperado)));
          }
        });
        return nuevaLista;
      });

      const historialPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      let nuevoHistorial;
      
      if (itemsRestantesEnHistorial.length === 0) {
        nuevoHistorial = historialPrevio.filter(r => r.id !== registro.id);
        setConteoSeleccionado(null);
      } else {
        nuevoHistorial = historialPrevio.map(r => r.id === registro.id ? { ...r, items: itemsRestantesEnHistorial } : r);
        setConteoSeleccionado({ ...registro, items: itemsRestantesEnHistorial }); 
      }
      
      localStorage.setItem('een_historial_conteos', JSON.stringify(nuevoHistorial));
      setModoSeleccionHistorial(false);
      setSeleccionadosHistorial([]);
      
      if(itemsRestantesEnHistorial.length === 0) setMostrarHistorial(false);
      mostrarToast(t.recuperadoExito, 'success');
    });
  };

  // --- EXPORTACIONES CSV ---
  const descargarCSV = () => {
    if (listaConteo.length === 0) { mostrarToast(t.listaVacia, 'error'); return; }
    let csv = "\uFEFFCodigo,Producto,Stock Sistema,Total Fisico,Ajuste,Detalle Conteos\n";
    listaConteo.forEach(item => {
      const ajuste = item.totalFisico - item.stockSistema;
      const detalle = item.variantes.filter(v => v.contadas > 0).map(v => `${v.pz}pz: ${v.contadas}`).join(" | ");
      csv += `${item.codigo},${item.nombre.replace(/,/g, "")},${item.stockSistema},${item.totalFisico},${ajuste},"${detalle}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Inventario_Actual_${Date.now()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    mostrarToast(t.csvExito, 'success');
  };

  const generarCSVDia = () => {
    const historial = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
    const hoyStr = new Date().toDateString();
    const conteosHoy = historial.filter(reg => new Date(reg.fecha).toDateString() === hoyStr);
    
    let todosLosItems = [...listaConteo];
    conteosHoy.forEach(reg => { todosLosItems = [...todosLosItems, ...reg.items]; });
    if (todosLosItems.length === 0) { mostrarToast(t.noConteosDia, 'error'); return; }

    const itemsAgrupados = {};
    todosLosItems.forEach(item => {
      if (!itemsAgrupados[item.codigo]) itemsAgrupados[item.codigo] = JSON.parse(JSON.stringify(item));
      else {
        const existente = itemsAgrupados[item.codigo];
        item.variantes.forEach(vNueva => {
          const vEx = existente.variantes.find(vx => vx.id === vNueva.id);
          if (vEx) vEx.contadas += vNueva.contadas;
          else existente.variantes.push({...vNueva});
        });
        existente.totalFisico = existente.variantes.reduce((sum, v) => sum + (v.pz * v.contadas), 0);
      }
    });

    let csv = "\uFEFFCodigo,Producto,Stock Sistema,Total Fisico,Ajuste,Detalle Conteos\n";
    Object.values(itemsAgrupados).forEach(item => {
      const ajuste = item.totalFisico - item.stockSistema;
      const detalle = item.variantes.filter(v => v.contadas > 0).map(v => `${v.pz}pz: ${v.contadas}`).join(" | ");
      csv += `${item.codigo},${item.nombre.replace(/,/g, "")},${item.stockSistema},${item.totalFisico},${ajuste},"${detalle}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Consolidado_Dia_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    mostrarToast(t.csvExito, 'success');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-slate-100 relative selection:bg-blue-500/30">
      
      {/* TOASTS Y MODALES */}
      {toast.visible && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] animate-fade-in pointer-events-none w-[90%] max-w-sm">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border-2 ${
            toast.tipo === 'error' ? 'bg-red-900/95 border-red-500/80 text-white' : 
            toast.tipo === 'success' ? 'bg-emerald-900/95 border-emerald-500/80 text-white' : 
            'bg-slate-800/95 border-blue-500/80 text-white'
          } backdrop-blur-md`}>
             <i className={`fas ${toast.tipo === 'error' ? 'fa-exclamation-circle text-red-400' : toast.tipo === 'success' ? 'fa-check-circle text-emerald-400' : 'fa-info-circle text-blue-400'} text-2xl`}></i>
             <p className="text-base font-bold leading-tight">{toast.mensaje}</p>
          </div>
        </div>
      )}

      {confirmar.visible && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-600 p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-500/40">
                <i className="fas fa-question text-3xl text-amber-400"></i>
              </div>
              <p className="text-white text-lg font-black mb-6 leading-snug">{confirmar.mensaje}</p>
              <div className="flex gap-3">
                 <button onClick={() => setConfirmar({visible: false})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3.5 rounded-xl font-bold transition-colors border border-slate-600">{t.cancelar}</button>
                 <button onClick={() => { confirmar.onConfirm(); setConfirmar({visible: false}); }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/50 transition-colors border border-blue-500">{t.aceptar}</button>
              </div>
           </div>
        </div>
      )}

      {/* HEADER PRINCIPAL CON SWITCH DE VISTAS */}
      <header className={`border-b shrink-0 shadow-lg z-40 transition-colors ${modoSeleccion ? 'bg-blue-900/40 border-blue-500/50' : 'bg-slate-900 border-slate-700'} p-4 flex flex-col gap-4`}>
        <div className="flex justify-between items-center">
          
          {/* SWITCH DE VISTA: Pestañas nativas integradas */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-inner">
            <button 
              onClick={() => { setVistaActual('conteo'); setModoSeleccion(false); }}
              className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all ${vistaActual === 'conteo' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              {t.pestañaConteo}
            </button>
            <button 
              onClick={() => { setVistaActual('nube'); setModoSeleccion(false); }}
              className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${vistaActual === 'nube' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              {t.pestañaNube}
              {sesionesNube.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {vistaActual === 'conteo' && listaConteo.length > 0 && !modoSeleccion && (
              <button 
                onClick={handleSincronizarNube}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl font-black text-xs transition-all shadow-md shadow-emerald-950 flex items-center gap-1.5 border border-emerald-500 active:scale-95"
              >
                <i className="fas fa-cloud-upload-alt"></i> {t.sincronizar}
              </button>
            )}

            {vistaActual === 'conteo' && listaConteo.length > 0 && (
              <button 
                onClick={() => { setModoSeleccion(!modoSeleccion); setSeleccionados([]); }} 
                className={`px-3 py-2 rounded-xl font-bold text-xs transition-colors border ${modoSeleccion ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'}`}
              >
                <i className={`fas ${modoSeleccion ? 'fa-times' : 'fa-check-square'}`}></i>
              </button>
            )}

            {!modoSeleccion && (
              <button onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} className="bg-slate-800 border border-slate-600 px-3 py-2 rounded-xl font-bold text-xs text-white">
                {t.idioma}
              </button>
            )}
          </div>
        </div>

        {/* SUB-BARRA DE ACCIONES (Solo visible en modo Conteo) */}
        {vistaActual === 'conteo' && (
          modoSeleccion ? (
            <div className="flex gap-3">
               <button onClick={toggleTodos} className="flex-1 bg-slate-800 border border-slate-600 text-white p-2.5 rounded-xl font-bold text-xs flex justify-center items-center gap-2">
                 <i className={`far ${seleccionados.length === listaConteo.length ? 'fa-square' : 'fa-check-square'}`}></i> {seleccionados.length === listaConteo.length ? t.selNada : t.selTodo}
               </button>
               <button onClick={handleFinalizarConteo} className="flex-[2] bg-amber-500 text-amber-950 p-2.5 rounded-xl font-black text-xs uppercase flex justify-center items-center gap-2">
                 <i className="fas fa-archive"></i> {t.archivarSel.replace('{n}', seleccionados.length)}
               </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <button onClick={handleFinalizarConteo} className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
                <i className="fas fa-archive"></i> {t.archivar}
              </button>
              <button onClick={descargarCSV} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
                <i className="fas fa-file-excel"></i> {t.csvVista}
              </button>
              <button onClick={generarCSVDia} className="bg-blue-500/10 border border-blue-500/30 text-blue-400 p-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
                <i className="fas fa-file-csv"></i> {t.csvDia}
              </button>
              <button onClick={() => setMostrarHistorial(true)} className="bg-purple-500/10 border border-purple-500/30 text-purple-400 p-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
                <i className="fas fa-history"></i> {t.historial}
              </button>
            </div>
          )
        )}
      </header>

      {/* CUERPO CENTRAL DE LA APLICACIÓN */}
      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full custom-scroll relative">
        
        {/* =================================================================== */}
        {/* VISTA 1: CAPTURA MÓVIL (Mismo comportamiento que ya conoces)        */}
        {/* =================================================================== */}
        {vistaActual === 'conteo' ? (
          <div className="flex flex-col gap-5 pb-20">
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
                setListaConteo(prev => prev.map(p => p.codigo === cod ? 
                  { ...p, variantes: [...p.variantes, { id: `f_${Date.now()}`, pz: parseInt(pz), contadas: 0, isFantasma: true }].sort((a,b) => b.pz - a.pz) } : p
                ));
              }}
              onAbrirCalculadora={(codigo, varId) => {
                const p = listaConteo.find(x => x.codigo === codigo);
                setCalcActiva({ isOpen: true, codigo, varId, nombre: p?.nombre });
              }}
              onIniciarDictado={(codigo, varId, btn, letra) => iniciarDictado(codigo, varId, letra)}
              onZoomImagen={(img) => setImagenAmpliada(img)}
              modoSeleccion={modoSeleccion}
              seleccionados={seleccionados}
              onToggleSeleccion={toggleSeleccion}
            />
          </div>
        ) : (
          
        /* =================================================================== */
        /* VISTA 2: PANEL DE REVISIÓN PC (Tablita Excel para el Administrador) */
        /* =================================================================== */
          <div className="flex flex-col gap-6 animate-fade-in pb-10">
            
            {/* Lista Lateral/Superior de Sesiones Subidas */}
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scroll">
              {sesionesNube.length === 0 ? (
                <p className="text-slate-500 text-sm italic py-4">No hay sesiones de conteo activas en la nube.</p>
              ) : (
                sesionesNube.map((sesion, index) => {
                  const isSelected = sesionSeleccionadaNube?.id === sesion.id;
                  const fechaStr = sesion.fecha ? new Date(sesion.fecha.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Reciente';
                  return (
                    <button
                      key={sesion.id}
                      onClick={() => setSesionSeleccionadaNube(sesion)}
                      className={`p-3 rounded-2xl border text-left shrink-0 transition-all flex flex-col gap-1 min-w-[160px] ${
                        isSelected ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-950' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Sesión #{sesionesNube.length - index}</span>
                      <span className="font-bold text-xs text-slate-200">{fechaStr} • {sesion.total_skus || 0} SKUs</span>
                      <span className="text-[9px] text-slate-500 truncate"><i className="fas fa-desktop mr-1"></i>{sesion.dispositivo || 'Remoto'}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* TABLITA EXCEL DE LA SESIÓN SELECCIONADA */}
            {sesionSeleccionadaNube ? (
              <div className="bg-slate-800 rounded-3xl border border-slate-600 overflow-hidden shadow-2xl">
                <div className="p-4 bg-slate-850 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <i className="fas fa-table text-purple-400"></i> Tabla de Ajustes (PC)
                  </h3>
                  <span className="text-xs text-slate-400">Haz clic en cualquier código para copiarlo al POS</span>
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
                            {/* BOTÓN RÁPIDO DE COPIADO */}
                            <td className="p-3 pl-4 font-mono font-bold w-32">
                              <button 
                                onClick={() => copiarCodigo(item.codigo)}
                                className="w-full text-left text-blue-400 hover:text-blue-300 flex items-center justify-between bg-slate-900/40 hover:bg-slate-900 p-1.5 rounded-lg border border-slate-700 group-hover:border-blue-500/40 transition-all"
                                title="Copiar al portapapeles"
                              >
                                <span>{item.codigo}</span>
                                <i className="fas fa-copy text-[10px] opacity-40 group-hover:opacity-100 transition-opacity"></i>
                              </button>
                            </td>
                            <td className="p-3 font-bold text-white max-w-xs truncate">{item.nombre}</td>
                            <td className="p-3 text-center text-slate-400">{item.stockSistema}</td>
                            <td className="p-3 text-center font-bold text-white bg-slate-900/20">{item.totalFisico}</td>
                            <td className={`p-3 text-center pr-4 ${colorAjuste}`}>
                              {ajuste > 0 ? `+${ajuste}` : ajuste}
                            </td>
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
                  <i className="fas fa-hand-pointer text-3xl text-slate-600 mb-3 animate-bounce"></i>
                  <p className="text-xs font-bold text-slate-400">Selecciona una sesión arriba para ver la tabla de diferencias.</p>
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* MODALES EXTERNOS (Se quedan idénticos) */}
      <ModalCalculadora 
        isOpen={calcActiva.isOpen}
        tituloTarget={calcActiva.nombre}
        codigoItem={calcActiva.codigo} 
        varIdItem={calcActiva.varId}   
        onClose={() => setCalcActiva(prev => ({ ...prev, isOpen: false }))}
        onAplicar={(total) => cambiarCant(calcActiva.codigo, calcActiva.varId, total)}
        idioma={idioma}
      />

      {imagenAmpliada && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 touch-none" onClick={() => setImagenAmpliada(null)}>
          <div className="relative max-w-md w-full flex flex-col items-center animate-fade-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setImagenAmpliada(null)} className="absolute -top-14 right-0 w-12 h-12 bg-slate-800 border border-slate-600 rounded-full text-white shadow-xl flex items-center justify-center hover:bg-slate-700 transition">
              <i className="fas fa-times text-xl"></i>
            </button>
            <div className="bg-white p-3 rounded-3xl shadow-2xl w-full flex justify-center">
                <img src={imagenAmpliada} alt="Verificación" className="w-full max-h-[70vh] object-contain rounded-2xl mix-blend-multiply" onError={(e) => e.target.src = 'https://dummyimage.com/300x300/e2e8f0/0f172a&text=Sin+Imagen'} />
            </div>
            <p className="text-white font-black text-xs mt-6 uppercase tracking-widest bg-slate-800 px-6 py-3 rounded-full border border-slate-600 cursor-pointer shadow-lg active:scale-95 transition" onClick={() => setImagenAmpliada(null)}>
              {t.cerrarVerificacion}
            </p>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL ARCHIVADO LOCAL */}
      {mostrarHistorial && (
        <div className="fixed inset-0 z-[150] flex flex-col bg-slate-900/98 backdrop-blur-xl animate-fade-in">
          <div className={`p-5 flex flex-col gap-4 border-b shrink-0 shadow-md transition-colors sticky top-0 z-10 ${modoSeleccionHistorial ? 'bg-blue-900/40 border-blue-500/50' : 'bg-slate-900 border-slate-700'}`}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white">
                  {modoSeleccionHistorial ? `${seleccionadosHistorial.length} Seleccionados` : conteoSeleccionado ? t.detalleConteo : t.historialArchivados}
                </h2>
                {conteoSeleccionado && !modoSeleccionHistorial && (
                  <p className="text-blue-400 text-[10px] font-bold uppercase mt-1">
                    {new Date(conteoSeleccionado.fecha).toLocaleString(idioma==='es'?'es-MX':'fr-FR')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {conteoSeleccionado && (
                   <button onClick={() => { setModoSeleccionHistorial(!modoSeleccionHistorial); setSeleccionadosHistorial([]); }} className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm border ${modoSeleccionHistorial ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'}`}>
                     <i className={`fas ${modoSeleccionHistorial ? 'fa-times' : 'fa-check-square'}`}></i>
                   </button>
                )}
                {!modoSeleccionHistorial && (
                  <button onClick={() => { conteoSeleccionado ? setConteoSeleccionado(null) : setMostrarHistorial(false); setModoSeleccionHistorial(false); }} className="w-11 h-11 bg-slate-800 border border-slate-600 rounded-xl flex items-center justify-center text-white hover:bg-slate-700 transition shadow-sm">
                    <i className={`fas ${conteoSeleccionado ? 'fa-arrow-left' : 'fa-times'} text-lg`}></i>
                  </button>
                )}
              </div>
            </div>

            {conteoSeleccionado && modoSeleccionHistorial && (
               <div className="flex gap-3 animate-fade-in">
                  <button onClick={toggleTodosHistorial} className="flex-1 bg-slate-800 border border-slate-600 text-white p-3 rounded-xl font-bold text-xs flex justify-center items-center gap-2">
                    <i className={`far ${seleccionadosHistorial.length === conteoSeleccionado.items.length ? 'fa-square' : 'fa-check-square'}`}></i> {seleccionadosHistorial.length === conteoSeleccionado.items.length ? t.selNada : t.selTodo}
                  </button>
                  <button onClick={handleRecuperarConteo} className="flex-[2] bg-blue-600 text-white p-3 rounded-xl font-black text-xs uppercase flex justify-center items-center gap-2">
                    <i className="fas fa-file-import"></i> {t.recuperarSel.replace('{n}', seleccionadosHistorial.length)}
                  </button>
               </div>
            )}

            {conteoSeleccionado && !modoSeleccionHistorial && (
                <button onClick={handleRecuperarConteo} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-xs shadow-lg flex items-center justify-center gap-2">
                  <i className="fas fa-file-import text-lg"></i> Recuperar Todo
                </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-20 custom-scroll">
            {conteoSeleccionado ? (
                <ListaConteo 
                  listaConteo={conteoSeleccionado.items} 
                  idioma={idioma} 
                  soloLectura={true}
                  modoSeleccion={modoSeleccionHistorial}
                  seleccionados={seleccionadosHistorial}
                  onToggleSeleccion={toggleSeleccionHistorial}
                />
            ) : (
              <div className="grid gap-4 max-w-3xl mx-auto">
                {JSON.parse(localStorage.getItem('een_historial_conteos') || '[]').length === 0 ? (
                  <div className="text-center text-slate-400 mt-20">
                    <i className="fas fa-box-open text-6xl mb-6 opacity-30"></i>
                    <p className="font-black text-xl text-white">{t.noArchivados}</p>
                  </div>
                ) : (
                  JSON.parse(localStorage.getItem('een_historial_conteos') || '[]').map(reg => (
                    <div key={reg.id} onClick={() => setConteoSeleccionado(reg)} className="bg-slate-800 border border-slate-600 p-5 rounded-3xl flex justify-between items-center cursor-pointer hover:bg-slate-700">
                      <div>
                        <p className="text-white font-black text-lg mb-1.5 capitalize">
                          {new Date(reg.fecha).toLocaleDateString(idioma === 'es' ? 'es-MX' : 'fr-FR', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <span className="text-slate-300 text-xs font-bold">{reg.items.length} {t.skusContados}</span>
                      </div>
                      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-slate-400 border border-slate-600">
                        <i className="fas className-chevron-right text-lg"></i>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default InventarioView;
