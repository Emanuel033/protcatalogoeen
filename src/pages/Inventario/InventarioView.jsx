import React, { useState, useEffect, useCallback } from 'react';
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
    errorSelVacia: 'Selecciona al menos un producto.'
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
    errorSelVacia: 'Sélectionnez au moins un produit.'
  }
};

const InventarioView = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [idioma, setIdioma] = useState('es');
  const t = tInv[idioma]; 

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

  // --- FUNCIONES DE SELECCIÓN ---
  const toggleSeleccion = (codigo) => {
    setSeleccionados(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  };
  
  const toggleSeleccionHistorial = (codigo) => {
    setSeleccionadosHistorial(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  };
  
  const toggleTodos = () => {
    if (seleccionados.length === listaConteo.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(listaConteo.map(i => i.codigo));
    }
  };
  
  const toggleTodosHistorial = () => {
    if (seleccionadosHistorial.length === conteoSeleccionado.items.length) {
      setSeleccionadosHistorial([]);
    } else {
      setSeleccionadosHistorial(conteoSeleccionado.items.map(i => i.codigo));
    }
  };

  // --- ARCHIVAR (Modificado para parciales) ---
  const handleFinalizarConteo = () => {
    if (listaConteo.length === 0) {
      mostrarToast(t.noArchivarVacio, 'error');
      return;
    }

    if (modoSeleccion && seleccionados.length === 0) {
      mostrarToast(t.errorSelVacia, 'error');
      return;
    }

    pedirConfirmacion(t.confirmaArchivar, () => {
      // Separar lo que se archiva de lo que se queda
      const itemsAArchivar = modoSeleccion && seleccionados.length > 0 
        ? listaConteo.filter(item => seleccionados.includes(item.codigo)) 
        : [...listaConteo];
        
      const itemsRestantes = modoSeleccion && seleccionados.length > 0
        ? listaConteo.filter(item => !seleccionados.includes(item.codigo))
        : [];

      // Guardar en Historial
      const nuevoRegistro = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        items: itemsAArchivar 
      };

      const historialPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      const nuevoHistorial = [nuevoRegistro, ...historialPrevio];

      localStorage.setItem('een_historial_conteos', JSON.stringify(nuevoHistorial.slice(0, 50)));

      // Actualizar Pantalla (Dejamos solo lo que NO se seleccionó)
      setListaConteo(itemsRestantes); 
      setModoSeleccion(false);
      setSeleccionados([]);
      
      if(itemsRestantes.length === 0) {
        localStorage.removeItem('een_inventario_activo'); 
      }
      
      mostrarToast(t.archivoExito, 'success');
    });
  };

  // --- RECUPERAR (Modificado para parciales) ---
  const handleRecuperarConteo = () => {
    const registro = conteoSeleccionado;

    if (modoSeleccionHistorial && seleccionadosHistorial.length === 0) {
      mostrarToast(t.errorSelVacia, 'error');
      return;
    }

    pedirConfirmacion(t.confirmaRecuperar, () => {
      // Separar lo que se recupera de lo que se queda en el historial
      const itemsARecuperar = modoSeleccionHistorial && seleccionadosHistorial.length > 0
        ? registro.items.filter(item => seleccionadosHistorial.includes(item.codigo))
        : [...registro.items];

      const itemsRestantesEnHistorial = modoSeleccionHistorial && seleccionadosHistorial.length > 0
        ? registro.items.filter(item => !seleccionadosHistorial.includes(item.codigo))
        : [];

      // Unir a la pantalla actual (sumando cantidades si ya existe)
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

      // Actualizar o Eliminar el bloque del historial
      const historialPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      let nuevoHistorial;
      
      if (itemsRestantesEnHistorial.length === 0) {
        // Se vació por completo, eliminar el registro
        nuevoHistorial = historialPrevio.filter(r => r.id !== registro.id);
        setConteoSeleccionado(null);
      } else {
        // Quedan items, actualizar el registro
        nuevoHistorial = historialPrevio.map(r => r.id === registro.id ? { ...r, items: itemsRestantesEnHistorial } : r);
        setConteoSeleccionado({ ...registro, items: itemsRestantesEnHistorial }); 
      }
      
      localStorage.setItem('een_historial_conteos', JSON.stringify(nuevoHistorial));

      setModoSeleccionHistorial(false);
      setSeleccionadosHistorial([]);
      
      if(itemsRestantesEnHistorial.length === 0) {
        setMostrarHistorial(false);
      }
      
      mostrarToast(t.recuperadoExito, 'success');
    });
  };

  const descargarCSV = () => {
    if (listaConteo.length === 0) {
      mostrarToast(t.listaVacia, 'error');
      return;
    }

    let csv = "\uFEFF"; 
    csv += "Codigo,Producto,Stock Sistema,Total Fisico,Ajuste,Detalle Conteos\n";

    listaConteo.forEach(item => {
      const ajuste = item.totalFisico - item.stockSistema;
      const detalle = item.variantes
        .filter(v => v.contadas > 0)
        .map(v => `${v.pz}${idioma === 'es' ? 'pz' : 'pc'}: ${v.contadas}`)
        .join(" | ");
      const nombreLimpio = item.nombre.replace(/,/g, "");

      csv += `${item.codigo},${nombreLimpio},${item.stockSistema},${item.totalFisico},${ajuste},"${detalle}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Inventario_Actual_EEN_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarToast(t.csvExito, 'success');
  };

  const generarCSVDia = () => {
    const historial = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
    const hoyStr = new Date().toDateString();
    
    const conteosHoy = historial.filter(reg => new Date(reg.fecha).toDateString() === hoyStr);
    
    let todosLosItems = [...listaConteo];
    conteosHoy.forEach(reg => {
      todosLosItems = [...todosLosItems, ...reg.items];
    });

    if (todosLosItems.length === 0) {
      mostrarToast(t.noConteosDia, 'error');
      return;
    }

    const itemsAgrupados = {};
    todosLosItems.forEach(item => {
      if (!itemsAgrupados[item.codigo]) {
        itemsAgrupados[item.codigo] = JSON.parse(JSON.stringify(item));
      } else {
        const existente = itemsAgrupados[item.codigo];
        item.variantes.forEach(vNueva => {
          const vEx = existente.variantes.find(vx => vx.id === vNueva.id);
          if (vEx) {
            vEx.contadas += vNueva.contadas;
          } else {
            existente.variantes.push({...vNueva});
          }
        });
        existente.totalFisico = existente.variantes.reduce((sum, v) => sum + (v.pz * v.contadas), 0);
      }
    });

    const finalArray = Object.values(itemsAgrupados);

    let csv = "\uFEFF"; 
    csv += "Codigo,Producto,Stock Sistema,Total Fisico,Ajuste,Detalle Conteos\n";

    finalArray.forEach(item => {
      const ajuste = item.totalFisico - item.stockSistema;
      const detalle = item.variantes
        .filter(v => v.contadas > 0)
        .map(v => `${v.pz}${idioma === 'es' ? 'pz' : 'pc'}: ${v.contadas}`)
        .join(" | ");
      const nombreLimpio = item.nombre.replace(/,/g, "");

      csv += `${item.codigo},${nombreLimpio},${item.stockSistema},${item.totalFisico},${ajuste},"${detalle}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Inventario_Consolidado_Dia_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarToast(t.csvExito, 'success');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-slate-100 relative selection:bg-blue-500/30">
      
      {/* COMPONENTE TOAST (Alto Contraste) */}
      {toast.visible && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] animate-fade-in pointer-events-none w-[90%] max-w-sm">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border-2 ${
            toast.tipo === 'error' ? 'bg-red-900/95 border-red-500/80 text-white' : 
            toast.tipo === 'success' ? 'bg-emerald-900/95 border-emerald-500/80 text-white' : 
            'bg-slate-800/95 border-blue-500/80 text-white'
          } backdrop-blur-md`}>
             <i className={`fas ${
               toast.tipo === 'error' ? 'fa-exclamation-circle text-red-400' : 
               toast.tipo === 'success' ? 'fa-check-circle text-emerald-400' : 
               'fa-info-circle text-blue-400'
             } text-2xl`}></i>
             <p className="text-base font-bold leading-tight">{toast.mensaje}</p>
          </div>
        </div>
      )}

      {/* COMPONENTE CONFIRMAR MODAL */}
      {confirmar.visible && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-600 p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-500/40">
                <i className="fas fa-question text-3xl text-amber-400"></i>
              </div>
              <p className="text-white text-lg font-black mb-6 leading-snug">{confirmar.mensaje}</p>
              <div className="flex gap-3">
                 <button onClick={() => setConfirmar({visible: false})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3.5 rounded-xl font-bold transition-colors border border-slate-600">
                   {t.cancelar}
                 </button>
                 <button onClick={() => { confirmar.onConfirm(); setConfirmar({visible: false}); }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/50 transition-colors border border-blue-500">
                   {t.aceptar}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* HEADER DINÁMICO (NORMAL VS SELECCIÓN) */}
      <header className={`border-b shrink-0 shadow-lg z-40 transition-colors ${modoSeleccion ? 'bg-blue-900/40 border-blue-500/50' : 'bg-slate-900 border-slate-700'} pt-4 pb-4 px-4 flex flex-col gap-4`}>
        
        {/* Fila Superior */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg border ${modoSeleccion ? 'bg-blue-500 border-blue-400 text-white' : 'bg-blue-600 border-blue-500/50 shadow-blue-900/50'}`}>
              <i className={`fas ${modoSeleccion ? 'fa-check-double' : estaEscuchando ? 'fa-microphone animate-pulse text-red-200' : 'fa-clipboard-list text-white'}`}></i>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">
                {modoSeleccion ? `${seleccionados.length} Seleccionados` : t.titulo}
              </h1>
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                {modoSeleccion ? 'Modo de edición parcial' : (catStatus.error ? t.errorCarga : catStatus.loading ? t.cargando : `${catStatus.count} ${t.listas}`)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!modoSeleccion && isOffline && (
              <div className="bg-red-500 text-white px-2 py-1.5 rounded-lg font-black text-[10px] uppercase animate-pulse shadow-md flex items-center gap-1 border border-red-400">
                <i className="fas fa-wifi-slash"></i> <span className="hidden sm:inline">{t.modoOffline}</span>
              </div>
            )}
            
            {/* BOTÓN SELECCIONAR / CANCELAR */}
            {listaConteo.length > 0 && (
              <button 
                onClick={() => { setModoSeleccion(!modoSeleccion); setSeleccionados([]); }} 
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm border ${modoSeleccion ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30'}`}
              >
                <i className={`fas ${modoSeleccion ? 'fa-times' : 'fa-check-square'} mr-1.5`}></i>
                {modoSeleccion ? t.cancelar : t.seleccionar}
              </button>
            )}

            {!modoSeleccion && (
              <button 
                onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} 
                className="bg-slate-800 border border-slate-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-700 transition-colors shadow-sm text-white"
              >
                {t.idioma}
              </button>
            )}
          </div>
        </div>
        
        {/* Fila de Acciones (Cambia según el modo) */}
        {modoSeleccion ? (
          <div className="flex gap-3">
             <button 
               onClick={toggleTodos} 
               className="flex-1 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white p-3 rounded-2xl transition-all shadow-sm font-bold text-sm flex justify-center items-center gap-2 active:scale-95"
             >
               <i className={`far ${seleccionados.length === listaConteo.length ? 'fa-square' : 'fa-check-square'}`}></i> 
               {seleccionados.length === listaConteo.length ? t.selNada : t.selTodo}
             </button>
             <button 
               onClick={handleFinalizarConteo} 
               className="flex-[2] bg-amber-500 border border-amber-400 hover:bg-amber-400 text-amber-950 p-3 rounded-2xl transition-all shadow-lg font-black text-sm uppercase tracking-wider flex justify-center items-center gap-2 active:scale-95"
             >
               <i className="fas fa-archive"></i> {t.archivarSel.replace('{n}', seleccionados.length)}
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            <button 
              onClick={handleFinalizarConteo} 
              className="flex flex-col items-center justify-center gap-1.5 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-400 p-3 rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <i className="fas fa-archive text-xl"></i>
              <span className="text-[10px] font-black uppercase text-center leading-tight tracking-tighter text-amber-200">{t.archivar}</span>
            </button>

            <button 
              onClick={descargarCSV} 
              className="flex flex-col items-center justify-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-400 p-3 rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <i className="fas fa-file-excel text-xl"></i>
              <span className="text-[10px] font-black uppercase text-center leading-tight tracking-tighter text-emerald-200">{t.csvVista}</span>
            </button>

            <button 
              onClick={generarCSVDia} 
              className="flex flex-col items-center justify-center gap-1.5 bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500/30 text-blue-400 p-3 rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <i className="fas fa-file-csv text-xl"></i>
              <span className="text-[10px] font-black uppercase text-center leading-tight tracking-tighter text-blue-200">{t.csvDia}</span>
            </button>

            <button 
              onClick={() => setMostrarHistorial(true)} 
              className="flex flex-col items-center justify-center gap-1.5 bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-400 p-3 rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <i className="fas fa-history text-xl"></i>
              <span className="text-[10px] font-black uppercase text-center leading-tight tracking-tighter text-purple-200">{t.historial}</span>
            </button>
          </div>
        )}
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full flex flex-col gap-6 custom-scroll relative">
        
        {/* Capa que bloquea el escáner si estamos en modo selección */}
        {modoSeleccion && (
          <div className="absolute top-0 left-0 right-0 h-24 z-10 bg-slate-900/50 backdrop-blur-[1px] rounded-3xl" />
        )}
        
        <div className="bg-slate-800 p-5 rounded-3xl border border-slate-600 shadow-xl relative">
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
          
          // NUEVAS PROPS PARA SELECCIÓN
          modoSeleccion={modoSeleccion}
          seleccionados={seleccionados}
          onToggleSeleccion={toggleSeleccion}
        />
      </main>

      {/* MODAL CALCULADORA */}
      <ModalCalculadora 
        isOpen={calcActiva.isOpen}
        tituloTarget={calcActiva.nombre}
        codigoItem={calcActiva.codigo} 
        varIdItem={calcActiva.varId}   
        onClose={() => setCalcActiva(prev => ({ ...prev, isOpen: false }))}
        onAplicar={(total) => cambiarCant(calcActiva.codigo, calcActiva.varId, total)}
        idioma={idioma}
      />

      {/* MODAL IMAGEN AMPLIADA */}
      {imagenAmpliada && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 touch-none" 
          onClick={() => setImagenAmpliada(null)}
        >
          <div className="relative max-w-md w-full flex flex-col items-center animate-fade-in" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setImagenAmpliada(null)} 
              className="absolute -top-14 right-0 w-12 h-12 bg-slate-800 border border-slate-600 rounded-full text-white shadow-xl flex items-center justify-center hover:bg-slate-700 transition"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
            <div className="bg-white p-3 rounded-3xl shadow-2xl w-full flex justify-center">
                <img 
                  src={imagenAmpliada} 
                  alt="Verificación visual" 
                  className="w-full max-h-[70vh] object-contain rounded-2xl mix-blend-multiply"
                  onError={(e) => e.target.src = 'https://dummyimage.com/300x300/e2e8f0/0f172a&text=Sin+Imagen'}
                />
            </div>
            <p className="text-white font-black text-xs mt-6 uppercase tracking-widest bg-slate-800 px-6 py-3 rounded-full border border-slate-600 cursor-pointer shadow-lg active:scale-95 transition" onClick={() => setImagenAmpliada(null)}>
              {t.cerrarVerificacion}
            </p>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL (CON MODO SELECCIÓN) */}
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
                   <button 
                     onClick={() => { setModoSeleccionHistorial(!modoSeleccionHistorial); setSeleccionadosHistorial([]); }} 
                     className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm border ${modoSeleccionHistorial ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'}`}
                   >
                     <i className={`fas ${modoSeleccionHistorial ? 'fa-times' : 'fa-check-square'}`}></i>
                   </button>
                )}
                {!modoSeleccionHistorial && (
                  <button 
                    onClick={() => { conteoSeleccionado ? setConteoSeleccionado(null) : setMostrarHistorial(false); setModoSeleccionHistorial(false); }} 
                    className="w-11 h-11 bg-slate-800 border border-slate-600 rounded-xl flex items-center justify-center text-white hover:bg-slate-700 transition shadow-sm"
                  >
                    <i className={`fas ${conteoSeleccionado ? 'fa-arrow-left' : 'fa-times'} text-lg`}></i>
                  </button>
                )}
              </div>
            </div>

            {/* Fila Acciones Historial */}
            {conteoSeleccionado && modoSeleccionHistorial && (
               <div className="flex gap-3 animate-fade-in">
                  <button 
                    onClick={toggleTodosHistorial} 
                    className="flex-1 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white p-3 rounded-xl transition-all shadow-sm font-bold text-xs uppercase flex justify-center items-center gap-2 active:scale-95"
                  >
                    <i className={`far ${seleccionadosHistorial.length === conteoSeleccionado.items.length ? 'fa-square' : 'fa-check-square'}`}></i> 
                    {seleccionadosHistorial.length === conteoSeleccionado.items.length ? t.selNada : t.selTodo}
                  </button>
                  <button 
                    onClick={handleRecuperarConteo} 
                    className="flex-[2] bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-900/50 font-black text-xs uppercase tracking-wider flex justify-center items-center gap-2 active:scale-95"
                  >
                    <i className="fas fa-file-import"></i> {t.recuperarSel.replace('{n}', seleccionadosHistorial.length)}
                  </button>
               </div>
            )}

            {conteoSeleccionado && !modoSeleccionHistorial && (
                <button 
                  onClick={handleRecuperarConteo} 
                  className="w-full bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
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
                  onCambiarCant={() => {}} 
                  onManualCant={() => {}} 
                  onEliminar={() => {}} 
                  onAgregarEmpaque={() => {}} 
                  onAbrirCalculadora={() => {}} 
                  onIniciarDictado={() => {}} 
                  onZoomImagen={(img) => setImagenAmpliada(img)}
                  
                  // Props de Selección para Historial
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
                    <p className="text-sm mt-3 opacity-80 px-6 leading-relaxed">{t.usaArchivar}</p>
                  </div>
                ) : (
                  JSON.parse(localStorage.getItem('een_historial_conteos') || '[]').map(reg => (
                    <div 
                      key={reg.id} 
                      onClick={() => setConteoSeleccionado(reg)} 
                      className="bg-slate-800 border border-slate-600 p-5 rounded-3xl flex justify-between items-center cursor-pointer hover:bg-slate-700 active:scale-[0.98] transition-all shadow-md"
                    >
                      <div>
                        <p className="text-white font-black text-lg mb-1.5 capitalize">
                          {new Date(reg.fecha).toLocaleDateString(idioma === 'es' ? 'es-MX' : 'fr-FR', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-3 text-xs font-bold">
                           <span className="text-blue-200 bg-blue-600/30 border border-blue-500/40 px-2.5 py-1.5 rounded-lg shadow-sm">
                             <i className="far fa-clock mr-1"></i> {new Date(reg.fecha).toLocaleTimeString(idioma === 'es' ? 'es-MX' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                           <span className="text-slate-300">
                             {reg.items.length} {t.skusContados}
                           </span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-slate-400 border border-slate-600 shadow-inner">
                        <i className="fas fa-chevron-right text-lg"></i>
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
