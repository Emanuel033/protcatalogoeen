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
    confirmaArchivar: '¿Deseas archivar este conteo? Se limpiará tu pantalla para iniciar uno nuevo.',
    confirmaRecuperar: '¿Deseas recuperar este conteo? Se unirá a tu lista actual y se quitará del historial.',
    noConteosDia: 'No hay conteos registrados el día de hoy.',
    archivoExito: 'Conteo archivado correctamente.',
    recuperadoExito: 'Conteo recuperado y listo para editar.',
    csvExito: 'Archivo CSV generado exitosamente.',
    cancelar: 'Cancelar',
    aceptar: 'Aceptar'
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
    confirmaArchivar: 'Voulez-vous archiver ce comptage ? L\'écran sera effacé pour un nouveau.',
    confirmaRecuperar: 'Voulez-vous récupérer ce comptage ? Il sera ajouté à votre liste actuelle.',
    noConteosDia: 'Aucun comptage enregistré aujourd\'hui.',
    archivoExito: 'Comptage archivé avec succès.',
    recuperadoExito: 'Comptage récupéré et prêt à être édité.',
    csvExito: 'Fichier CSV généré avec succès.',
    cancelar: 'Annuler',
    aceptar: 'Accepter'
  }
};

const InventarioView = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [idioma, setIdioma] = useState('es');
  const t = tInv[idioma]; 

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

  const handleFinalizarConteo = () => {
    if (listaConteo.length === 0) {
      mostrarToast(t.noArchivarVacio, 'error');
      return;
    }

    pedirConfirmacion(t.confirmaArchivar, () => {
      const nuevoRegistro = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        items: listaConteo 
      };

      const historialPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      const nuevoHistorial = [nuevoRegistro, ...historialPrevio];

      localStorage.setItem('een_historial_conteos', JSON.stringify(nuevoHistorial.slice(0, 50)));

      setListaConteo([]); 
      localStorage.removeItem('een_inventario_activo'); 
      mostrarToast(t.archivoExito, 'success');
    });
  };

  const handleRecuperarConteo = (registro) => {
    pedirConfirmacion(t.confirmaRecuperar, () => {
      setListaConteo(prev => {
        let nuevaLista = [...prev];
        registro.items.forEach(itemRecuperado => {
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
      const nuevoHistorial = historialPrevio.filter(r => r.id !== registro.id);
      localStorage.setItem('een_historial_conteos', JSON.stringify(nuevoHistorial));

      setConteoSeleccionado(null);
      setMostrarHistorial(false);
      mostrarToast(t.recuperadoExito, 'success');
    });
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

      {/* HEADER OPTIMIZADO PARA MÓVIL (Bordes más definidos) */}
      <header className="bg-slate-900 border-b border-slate-700 pt-4 pb-4 px-4 flex flex-col gap-4 shrink-0 shadow-lg z-40">
        
        {/* Fila Superior */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50 border border-blue-500/50">
              <i className={`fas ${estaEscuchando ? 'fa-microphone animate-pulse text-red-200' : 'fa-clipboard-list text-white'}`}></i>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">{t.titulo}</h1>
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                {catStatus.error ? t.errorCarga : catStatus.loading ? t.cargando : `${catStatus.count} ${t.listas}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isOffline && (
              <div className="bg-red-500 text-white px-2 py-1.5 rounded-lg font-black text-[10px] uppercase animate-pulse shadow-md flex items-center gap-1 border border-red-400">
                <i className="fas fa-wifi-slash"></i> <span className="hidden sm:inline">{t.modoOffline}</span>
              </div>
            )}
            <button 
              onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} 
              className="bg-slate-800 border border-slate-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-700 transition-colors shadow-sm text-white"
            >
              {t.idioma}
            </button>
          </div>
        </div>
        
        {/* Fila de Acciones: Botones con mayor opacidad y relieve */}
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
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full flex flex-col gap-6 custom-scroll">
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

      {/* MODAL DE HISTORIAL */}
      {mostrarHistorial && (
        <div className="fixed inset-0 z-[150] flex flex-col bg-slate-900/98 backdrop-blur-xl animate-fade-in">
          <div className="p-6 flex justify-between items-center border-b border-slate-700 bg-slate-900 sticky top-0 z-10 shadow-md">
            <h2 className="text-2xl font-black text-white">
              {conteoSeleccionado ? t.detalleConteo : t.historialArchivados}
            </h2>
            <button 
              onClick={() => conteoSeleccionado ? setConteoSeleccionado(null) : setMostrarHistorial(false)}
              className="w-12 h-12 bg-slate-800 border border-slate-600 rounded-2xl flex items-center justify-center text-white hover:bg-slate-700 transition shadow-sm"
            >
              <i className={`fas ${conteoSeleccionado ? 'fa-arrow-left' : 'fa-times'} text-lg`}></i>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-20 custom-scroll">
            {conteoSeleccionado ? (
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => handleRecuperarConteo(conteoSeleccionado)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase text-sm shadow-xl mb-2 flex items-center justify-center gap-2 transition-colors active:scale-95 border border-blue-500"
                >
                  <i className="fas fa-file-import text-lg"></i> {t.recuperar}
                </button>
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
                />
              </div>
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
