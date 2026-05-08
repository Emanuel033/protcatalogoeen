import React, { useState, useEffect, useCallback } from 'react';
import EscanerManual from './components/EscanerManual';
import ListaConteo from './components/ListaConteo';
import ModalCalculadora from './components/ModalCalculadora';
import useDictadoVoz from './hooks/useDictadoVoz';

const InventarioView = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
  const [idioma, setIdioma] = useState('es');
  const [catalogoBase, setCatalogoBase] = useState([]);
  const [estadoCatalogo, setEstadoCatalogo] = useState('Cargando...');
  
  // NUEVOS ESTADOS PARA HISTORIAL
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [conteoSeleccionado, setConteoSeleccionado] = useState(null);
  
  // 1. INICIALIZAMOS LA LISTA LEYENDO EL LOCALSTORAGE
  const [listaConteo, setListaConteo] = useState(() => {
    const guardado = localStorage.getItem('een_inventario_activo');
    return guardado ? JSON.parse(guardado) : [];
  });
  
  const [calcActiva, setCalcActiva] = useState({ isOpen: false, codigo: null, varId: null, nombre: '' });
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  useEffect(() => {
    document.title = "Inventario | La Económica del Norte";
  }, []);

  // 2. EFECTO DE AUTO-GUARDADO: CADA VEZ QUE CAMBIA LA LISTA, SE GUARDA
  useEffect(() => {
    localStorage.setItem('een_inventario_activo', JSON.stringify(listaConteo));
  }, [listaConteo]);

  // Carga de Catálogo
  useEffect(() => {
    fetch('/catalogo_completo.json')
      .then(res => res.json())
      .then(data => {
        const piezas = data.filter(p => p.tipo_item === 'PIEZA_BASE');
        setCatalogoBase(piezas);
        setEstadoCatalogo(`${piezas.length} piezas listas`);
      })
      .catch(() => setEstadoCatalogo('Error de carga'));
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
      alert(idioma === 'es' ? "La lista está vacía" : "La liste est vide");
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
  };

  // 3. FUNCIÓN PARA ARCHIVAR Y LIMPIAR EL CONTEO (Reemplaza a Nuevo Conteo)
  const handleFinalizarConteo = () => {
    if (listaConteo.length === 0) {
      alert(idioma === 'es' ? "No hay productos para archivar." : "Aucun produit à archiver.");
      return;
    }

    const msj = idioma === 'es' 
      ? "¿Deseas archivar este conteo? Se guardará en tu historial y se limpiará la pantalla para uno nuevo." 
      : "Voulez-vous archiver ce comptage ? Il sera sauvegardé dans l'historique et l'écran sera effacé.";
    
    if (window.confirm(msj)) {
      const nuevoRegistro = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        items: listaConteo 
      };

      const historialPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      const nuevoHistorial = [nuevoRegistro, ...historialPrevio];

      // Límite ampliado a 50
      localStorage.setItem('een_historial_conteos', JSON.stringify(nuevoHistorial.slice(0, 50)));

      setListaConteo([]); 
      localStorage.removeItem('een_inventario_activo'); 
    }
  };

  // 4. FUNCIÓN PARA GENERAR EL CSV CONSOLIDADO DEL DÍA
  const generarCSVDia = () => {
    const historial = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
    const hoyStr = new Date().toDateString();
    
    const conteosHoy = historial.filter(reg => new Date(reg.fecha).toDateString() === hoyStr);
    
    let todosLosItems = [...listaConteo];
    conteosHoy.forEach(reg => {
      todosLosItems = [...todosLosItems, ...reg.items];
    });

    if (todosLosItems.length === 0) {
      alert(idioma === 'es' ? "No hay conteos registrados el día de hoy." : "Aucun comptage enregistré aujourd'hui.");
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
            vEx.contadas += vNueva.contadas; // Sumamos usando tu variable 'contadas'
          } else {
            existente.variantes.push({...vNueva});
          }
        });
        // Recalculamos el total físico con tu fórmula exacta
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
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-slate-50">
      
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex flex-wrap justify-between items-center shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/50">
            <i className={`fas ${estaEscuchando ? 'fa-microphone animate-pulse text-red-400' : 'fa-clipboard-list text-white'}`}></i>
          </div>
          
          <div>
            <h1 className="text-xl font-black">{idioma === 'es' ? 'Inventario' : 'Inventaire'}</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{estadoCatalogo}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* INDICADOR OFFLINE */}
          {isOffline && (
            <div className="bg-red-500 text-white px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider animate-pulse flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
              <i className="fas fa-wifi-slash"></i> <span className="hidden sm:inline">Modo Offline</span>
            </div>
          )}
          
          {/* BOTÓN ARCHIVAR / NUEVO CONTEO */}
          <button 
            onClick={handleFinalizarConteo} 
            className="bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
          >
            <i className="fas fa-archive"></i>
            <span className="hidden sm:inline">{idioma === 'es' ? 'Archivar' : 'Archiver'}</span>
          </button>

          {/* BOTÓN CSV ACTUAL */}
          <button 
            onClick={descargarCSV} 
            className="bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
            title={idioma === 'es' ? 'Descargar vista actual' : 'Télécharger la vue actuelle'}
          >
            <i className="fas fa-file-excel text-emerald-400"></i>
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* BOTÓN CSV CONSOLIDADO DEL DÍA */}
          <button 
            onClick={generarCSVDia} 
            className="bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
            title={idioma === 'es' ? 'Descargar todo el día' : 'Télécharger toute la journée'}
          >
            <i className="fas fa-file-csv text-blue-400"></i>
            <span className="hidden sm:inline">Día</span>
          </button>

          {/* BOTÓN HISTORIAL */}
          <button 
            onClick={() => setMostrarHistorial(true)} 
            className="bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
            title={idioma === 'es' ? 'Ver Historial' : 'Voir Historique'}
          >
            <i className="fas fa-history text-purple-400"></i>
          </button>

          {/* BOTÓN IDIOMA */}
          <button 
            onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} 
            className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl font-bold text-sm"
          >
            {idioma === 'es' ? '🇲🇽 ES' : '🇫🇷 FR'}
          </button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full flex flex-col gap-6 custom-scroll">
        <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg">
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
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 touch-none" 
          onClick={() => setImagenAmpliada(null)}
        >
          <div className="relative max-w-md w-full flex flex-col items-center animate-fade-in" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setImagenAmpliada(null)} 
              className="absolute -top-12 right-0 w-10 h-10 bg-slate-800 border border-slate-700 rounded-full text-white shadow-lg flex items-center justify-center hover:bg-slate-700 transition"
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="bg-white p-2 rounded-2xl shadow-2xl w-full flex justify-center">
                <img 
                  src={imagenAmpliada} 
                  alt="Verificación visual" 
                  className="w-full max-h-[70vh] object-contain rounded-xl mix-blend-multiply"
                  onError={(e) => e.target.src = 'https://dummyimage.com/300x300/e2e8f0/0f172a&text=Sin+Imagen'}
                />
            </div>
            <p className="text-slate-400 font-bold text-[10px] mt-4 uppercase tracking-widest bg-slate-800 px-5 py-2.5 rounded-full border border-slate-700 cursor-pointer shadow-lg active:scale-95 transition" onClick={() => setImagenAmpliada(null)}>
              {idioma === 'es' ? 'Cerrar verificación' : 'Fermer la vérification'}
            </p>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL */}
      {mostrarHistorial && (
        <div className="fixed inset-0 z-[150] flex flex-col bg-slate-900/98 backdrop-blur-xl animate-fade-in">
          <div className="p-6 flex justify-between items-center border-b border-slate-800">
            <h2 className="text-xl font-black text-white">
              {conteoSeleccionado 
                ? (idioma === 'es' ? "Detalle del Conteo" : "Détail du comptage") 
                : (idioma === 'es' ? "Historial Archivados" : "Historique archivé")}
            </h2>
            <button 
              onClick={() => conteoSeleccionado ? setConteoSeleccionado(null) : setMostrarHistorial(false)}
              className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-white hover:bg-slate-700 transition"
            >
              <i className={`fas ${conteoSeleccionado ? 'fa-arrow-left' : 'fa-times'}`}></i>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-20 custom-scroll">
            {conteoSeleccionado ? (
              <ListaConteo 
                listaConteo={conteoSeleccionado.items} 
                idioma={idioma} 
                soloLectura={true}
                // Funciones vacías por seguridad en modo lectura
                onCambiarCant={() => {}}
                onManualCant={() => {}}
                onEliminar={() => {}}
                onAgregarEmpaque={() => {}}
                onAbrirCalculadora={() => {}}
                onIniciarDictado={() => {}}
                onZoomImagen={(img) => setImagenAmpliada(img)}
              />
            ) : (
              <div className="grid gap-3 max-w-3xl mx-auto">
                {JSON.parse(localStorage.getItem('een_historial_conteos') || '[]').length === 0 ? (
                  <div className="text-center text-slate-500 mt-20">
                    <i className="fas fa-box-open text-5xl mb-4 opacity-40"></i>
                    <p className="font-bold">{idioma === 'es' ? 'No hay conteos archivados.' : 'Aucun comptage archivé.'}</p>
                    <p className="text-xs mt-2 opacity-60">
                      {idioma === 'es' ? 'Utiliza el botón "Archivar" para guardar tu progreso.' : 'Utilisez le bouton "Archiver" pour enregistrer votre progression.'}
                    </p>
                  </div>
                ) : (
                  JSON.parse(localStorage.getItem('een_historial_conteos') || '[]').map(reg => (
                    <div 
                      key={reg.id} 
                      onClick={() => setConteoSeleccionado(reg)}
                      className="bg-slate-800/80 border border-slate-700 p-5 rounded-3xl flex justify-between items-center cursor-pointer hover:bg-slate-700 active:scale-[0.98] transition-all shadow-lg"
                    >
                      <div>
                        <p className="text-white font-bold text-lg mb-1 capitalize">
                          {new Date(reg.fecha).toLocaleDateString(idioma === 'es' ? 'es-MX' : 'fr-FR', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-3 text-xs font-bold">
                           <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
                             <i className="far fa-clock mr-1"></i> {new Date(reg.fecha).toLocaleTimeString(idioma === 'es' ? 'es-MX' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                           <span className="text-slate-400">
                             {reg.items.length} {idioma === 'es' ? 'SKUs contados' : 'SKUs comptés'}
                           </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-slate-500 border border-slate-700">
                        <i className="fas fa-chevron-right"></i>
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
