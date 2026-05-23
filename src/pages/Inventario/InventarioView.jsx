import React, { useState, useEffect, useCallback } from 'react';
import { collection, doc, addDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.js'; 

import EscanerManual from './components/EscanerManual';
import ListaConteo from './components/ListaConteo';
import ModalCalculadora from './components/ModalCalculadora';
import useDictadoVoz from './hooks/useDictadoVoz';
import QRScannerInventario from './components/QRScannerInventario';

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
    confirmaSincronizar: '¿Deseas finalizar este conteo y enviar el CONSOLIDADO DEL DÍA a la PC?',
    confirmaRecuperar: '¿Deseas recuperar los productos seleccionados a tu lista actual?',
    noConteosDia: 'No hay conteos registrados el día de hoy.',
    archivoExito: 'Productos archivados localmente con éxito.',
    recuperadoExito: 'Productos recuperados y listos para editar.',
    csvExito: 'Archivo CSV generado exitosamente.',
    cancelar: 'Cancelar',
    aceptar: 'Aceptar',
    aceptarSinc: 'Sí, Sincronizar Día',
    seleccionar: 'Seleccionar',
    selTodo: 'Todo',
    selNada: 'Nada', 
    archivarSel: 'Archivar ({n})',
    sincronizarSel: 'Sincronizar ({n})',
    recuperarSel: 'Récupérer ({n})',
    errorSelVacia: 'Selecciona al menos un producto.',
    botonSincronizar: 'Finalizar y Sincronizar Día',
    pestañaConteo: '📱 Captura',
    pestañaNube: '☁️ Nube / PC',
    copiado: '¡Código copiado!',
    ajusteCopiado: '¡Diferencia copiada!',
    nubeVacia: 'No hay sesiones sincronizadas pendientes.',
    sesionNum: 'Sesión #{n}',
    origenDispositivo: 'Almacén',
    tablaTitulo: 'Consolidado del Día (Nube)',
    tablaSub: 'Edita "Sistema" solo en registros de hoy.',
    colSku: 'Código (SKU)',
    colProd: 'Producto',
    colSis: 'Sistema',
    colFis: 'Físico',
    colDif: 'Dif.',
    sinSesionSel: 'Selecciona una sesión de la barra superior para revisar sus diferencias.',
    copiarBoton: 'Copiar',
    sincExito: '¡Consolidado del día respaldado en la nube exitosamente!',
    sincOffline: '⚠️ Guardado localmente. Se sincronizará automáticamente al tener internet.',
    etiquetaConsolidado: '📊 Consolidado Hoy',
    tituloEntradas: "🟢 ENTRADAS (Sobrantes)",
    tituloSalidas: "🔴 SALIDAS (Faltantes)",
    tituloCorrectos: "⚪ SIN DIFERENCIA (Correctos)",
    auditarSesion: "📋 Auditar Sesión",
    msgAuditoria: "¿Cargar productos para auditoría? (Se actualizará el stock contra el sistema actual)",
    // ✨ NUEVOS TEXTOS PARA LIMPIAR
    limpiarLista: 'Vaciar lista',
    confirmaLimpiar: '¿Seguro que deseas vaciar toda la lista? Se perderá el progreso no archivado.',
    siLimpiar: 'Sí, vaciar',
    listaLimpiada: 'Lista vaciada correctamente.'
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
    confirmaSincronizar: 'Voulez-vous finaliser et envoyer le CUMUL DU JOUR au PC ?',
    confirmaRecuperar: 'Voulez-vous récupérer ces produits dans votre liste ?',
    noConteosDia: 'Aucun comptage enregistré aujourd\'hui.',
    archivoExito: 'Produits archivés localement avec succès.',
    recuperadoExito: 'Produits récupérés et prêts à être édités.',
    csvExito: 'Fichier CSV généré avec succès.',
    cancelar: 'Annuler',
    aceptar: 'Accepter',
    aceptarSinc: 'Oui, Synchroniser Jour',
    seleccionar: 'Sélectionner',
    selTodo: 'Tout',
    selNada: 'Rien', 
    archivarSel: 'Archiver ({n})',
    sincronizarSel: 'Synchroniser ({n})',
    recuperarSel: 'Récupérer ({n})',
    errorSelVacia: 'Sélectionnez au moins un produit.',
    botonSincronizar: 'Finaliser et Synchroniser Jour',
    pestañaConteo: '📱 Capture',
    pestañaNube: '☁️ Serveur / PC',
    copiado: 'Code copié !',
    ajusteCopiado: 'Différence copiée !',
    nubeVacia: 'Aucune session synchronisée en attente.',
    sesionNum: 'Session #{n}',
    origenDispositivo: 'Entrepôt',
    tablaTitulo: 'Cumul Global du Jour',
    tablaSub: 'Modifiez "Système" uniquement aujourd\'hui.',
    colSku: 'Code (SKU)',
    colProd: 'Produit',
    colSis: 'Système',
    colFis: 'Physique',
    colDif: 'Diff.',
    sinSesionSel: 'Sélectionnez une session ci-dessus pour voir les différences.',
    copiarBoton: 'Copier',
    sincExito: 'Cumul du jour synchronisé avec succès !',
    sincOffline: '⚠️ Sauvegardé localement. Il sera synchronisé dès la connexion internet.',
    etiquetaConsolidado: '📊 Cumul du Jour',
    tituloEntradas: "🟢 ENTRÉES (Excédents)",
    tituloSalidas: "🔴 SORTIES (Manquants)",
    tituloCorrectos: "⚪ SANS DIFFÉRENCE (Corrects)",
    auditarSesion: "📋 Auditer la Session",
    msgAuditoria: "Charger les produits pour audit ? (Le stock actuel du système sera utilisé)",
    limpiarLista: 'Vider la liste',
    confirmaLimpiar: 'Êtes-vous sûr de vouloir vider toute la liste ? Le progrès non sauvegardé sera perdu.',
    siLimpiar: 'Oui, vider',
    listaLimpiada: 'Liste vidée avec succès.'
  }
};

const InventarioView = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [idioma, setIdioma] = useState('es');
  const t = tInv[idioma]; 

  const [vistaActual, setVistaActual] = useState('conteo'); 
  const [sesionesNube, setSesionesNube] = useState([]);
  const [sesionSeleccionadaNube, setSesionSeleccionadaNube] = useState(null);

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);

  const [mostrarScanner, setMostrarScanner] = useState(false);

  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: 'info' });
  const mostrarToast = (mensaje, tipo = 'info') => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
  };

  // ✨ MODIFICACIÓN: Agregado "esPeligro" para hacer el botón rojo cuando vaciamos.
  const [confirmar, setConfirmar] = useState({ visible: false, mensaje: '', onConfirm: null, textoAceptar: t.aceptar, esPeligro: false });
  const pedirConfirmacion = (mensaje, onConfirm, textoPersonalizado = t.aceptar, esPeligro = false) => {
    setConfirmar({ visible: true, mensaje, onConfirm, textoAceptar: textoPersonalizado, esPeligro });
  };
   
  useEffect(() => { document.title = "Inventario | La Económica del Norte"; }, []);

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

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'bitacora_inventario'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.fecha?.toMillis() || 0) - (a.fecha?.toMillis() || 0));
      setSesionesNube(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (sesionSeleccionadaNube) {
      const sesionActualizada = sesionesNube.find(s => s.id === sesionSeleccionadaNube.id);
      if (sesionActualizada) setSesionSeleccionadaNube(sesionActualizada);
    }
  }, [sesionesNube]); 
  
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

  const cargarParaAuditoria = () => {
    if (!sesionSeleccionadaNube) return;
    pedirConfirmacion(t.msgAuditoria, () => {
      const itemsParaAuditar = sesionSeleccionadaNube.items.map(item => {
        const prodActual = catalogoBase.find(p => String(p.codigo).toLowerCase() === String(item.codigo).toLowerCase());
        const stockActualizado = prodActual ? parseFloat(prodActual.stock || 0) : parseFloat(item.stockSistema || 0);

        return {
          codigo: item.codigo,
          nombre: item.nombre,
          stockSistema: stockActualizado, 
          imagen: item.imagen || null,
          variantes: item.variantes.map(v => ({ ...v, contadas: 0 })), 
          totalFisico: 0
        };
      });
      
      setListaConteo(itemsParaAuditar);
      setVistaActual('conteo');
      mostrarToast("Lista de auditoría cargada con stock actual del sistema", "success");
    });
  };

  const autoCompletarStock = (codigo) => {
    setListaConteo(prev => prev.map(p => {
      if(p.codigo !== codigo) return p;
      const nuevasVariantes = p.variantes.map(v => 
        v.id === 'sueltas' ? { ...v, contadas: Math.max(0, p.stockSistema) } : { ...v, contadas: 0 }
      );
      return { ...p, variantes: nuevasVariantes, totalFisico: Math.max(0, p.stockSistema) };
    }));
  };

  // ✨ NUEVA FUNCIÓN: Vaciar toda la lista
  const handleLimpiarLista = () => {
    if (listaConteo.length === 0) return;
    pedirConfirmacion(
      t.confirmaLimpiar, 
      () => {
        setListaConteo([]);
        localStorage.removeItem('een_inventario_activo');
        setModoSeleccion(false);
        setSeleccionados([]);
        mostrarToast(t.listaLimpiada, 'success');
      }, 
      t.siLimpiar, 
      true // esPeligro = true para que el botón sea rojo
    );
  };

  const handleScanSuccess = (producto, cantidadPiezasPaquete, tipoEscaneo) => {
    setListaConteo(prev => {
        let prodEnLista = prev.find(i => i.codigo === String(producto.codigo));

        if (!prodEnLista) {
            let empaquesLimpios = [];
            if (producto.paquetes && Object.keys(producto.paquetes).length > 0) {
                empaquesLimpios = Object.values(producto.paquetes).filter(p => p && p.piezas);
            } else if (producto.empaques_tips && Object.keys(producto.empaques_tips).length > 0) {
                empaquesLimpios = Object.values(producto.empaques_tips).map(qty => ({ piezas: parseInt(qty) })).filter(p => p.piezas);
            }

            const variantes = [
                { id: 'sueltas', pz: 1, contadas: 0 },
                ...empaquesLimpios.map((e, i) => ({ id: `emp_${i}`, pz: parseInt(e.piezas), contadas: 0 }))
            ].sort((a, b) => b.pz - a.pz);

            prodEnLista = {
                codigo: String(producto.codigo),
                nombre: producto.descripcion_oficial || producto.nombre,
                stockSistema: parseFloat(producto.stock || 0),
                imagen: producto.image || producto.imagen || null,
                variantes: variantes,
                totalFisico: 0
            };
        } else {
            prodEnLista = JSON.parse(JSON.stringify(prodEnLista)); 
        }

        if (tipoEscaneo === 'PAQUETE') {
            let varIndex = prodEnLista.variantes.findIndex(v => v.pz === cantidadPiezasPaquete && v.id !== 'sueltas');
            if (varIndex >= 0) {
                prodEnLista.variantes[varIndex].contadas += 1;
            } else {
                prodEnLista.variantes.push({
                    id: `f_${Date.now()}`,
                    pz: cantidadPiezasPaquete,
                    contadas: 1,
                    isFantasma: true
                });
                prodEnLista.variantes.sort((a, b) => b.pz - a.pz);
            }
        } else {
            let varIndex = prodEnLista.variantes.findIndex(v => v.id === 'sueltas');
            if (varIndex >= 0) prodEnLista.variantes[varIndex].contadas += 1;
        }

        prodEnLista.totalFisico = prodEnLista.variantes.reduce((sum, v) => sum + (v.pz * v.contadas), 0);
        const nuevaLista = prev.filter(i => i.codigo !== String(producto.codigo));
        
        return [prodEnLista, ...nuevaLista];
    });
  };

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

      for (const item of itemsAProcesar) {
        const codigoPadre = String(item.codigo).toUpperCase();
        const paquetesFantasmas = item.variantes.filter(v => v.isFantasma && v.pz > 1);
        for (const fantasma of paquetesFantasmas) {
          const pz = parseInt(fantasma.pz);
          const nuevoSku = `${codigoPadre}-${pz}PZ`;
          try {
            await setDoc(doc(db, 'productos_master', codigoPadre), {
              paquetes: { [`paquete_${pz}`]: { sku: nuevoSku, nombre_paquete: `Paquete de ${pz} piezas`, piezas: pz, es_default: true } }
            }, { merge: true });
          } catch (err) { console.error(err); }
        }
      }

      const nuevoRegistro = { id: Date.now(), fecha: new Date().toISOString(), items: itemsAProcesar };
      const historialPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      const nuevoHistorial = [nuevoRegistro, ...historialPrevio].slice(0, 50);
      localStorage.setItem('een_historial_conteos', JSON.stringify(nuevoHistorial));

      const hoyStr = new Date().toDateString();
      const conteosHoy = nuevoHistorial.filter(r => new Date(r.fecha).toDateString() === hoyStr);
      const agruparConsolidado = {};
      conteosHoy.forEach(reg => {
        reg.items.forEach(item => {
          if (!agruparConsolidado[item.codigo]) agruparConsolidado[item.codigo] = JSON.parse(JSON.stringify(item));
          else {
            const existente = agruparConsolidado[item.codigo];
            item.variantes.forEach(vNueva => {
              const vEx = existente.variantes.find(vx => vx.id === vNueva.id);
              if (vEx) vEx.contadas += vNueva.contadas; else existente.variantes.push({ ...vNueva });
            });
            existente.totalFisico = existente.variantes.reduce((sum, v) => sum + (v.pz * v.contadas), 0);
          }
        });
      });

      const arrayConsolidadoFinal = Object.values(agruparConsolidado);
      
      try {
        addDoc(collection(db, 'bitacora_inventario'), { 
          fecha: serverTimestamp(),
          items: arrayConsolidadoFinal,
          total_skus: arrayConsolidadoFinal.length,
          origen: t.origenDispositivo,
          etiqueta: t.etiquetaConsolidado
        });
      } catch (e) { 
        console.error("Error nube:", e); 
      }

      setListaConteo(itemsRestantes); 
      setModoSeleccion(false); 
      setSeleccionados([]);
      if(itemsRestantes.length === 0) localStorage.removeItem('een_inventario_activo'); 
      
      if (isOffline || !navigator.onLine) {
        mostrarToast(t.sincOffline, 'info');
      } else {
        mostrarToast(t.sincExito, 'success');
      }
    }, t.aceptarSinc);
  };

  const handleUpdateStockSistema = async (codigoItem, nuevoValor) => {
    if (!sesionSeleccionadaNube) return;
    const nuevoStock = parseFloat(nuevoValor);
    if (isNaN(nuevoStock)) return;

    const nuevosItems = sesionSeleccionadaNube.items.map(item =>
      item.codigo === codigoItem ? { ...item, stockSistema: nuevoStock } : item
    );

    try {
      await updateDoc(doc(db, 'bitacora_inventario', sesionSeleccionadaNube.id), { items: nuevosItems });
      mostrarToast("Ajuste de sistema guardado", "success");
    } catch (e) { mostrarToast("Error al ajustar", "error"); }
  };

  const handleFinalizarConteo = () => {
    if (listaConteo.length === 0) { mostrarToast(t.noArchivarVacio, 'error'); return; }
    if (modoSeleccion && seleccionados.length === 0) { mostrarToast(t.errorSelVacia, 'error'); return; }

    pedirConfirmacion(t.confirmaArchivar, () => {
      const itemsAArchivar = modoSeleccion && seleccionados.length > 0 ? listaConteo.filter(item => seleccionados.includes(item.codigo)) : [...listaConteo];
      const itemsRestantes = modoSeleccion && seleccionados.length > 0 ? listaConteo.filter(item => !seleccionados.includes(item.codigo)) : [];
      const nuevoRegistro = { id: Date.now(), fecha: new Date().toISOString(), items: itemsAArchivar };
      const historialPrevio = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]');
      localStorage.setItem('een_historial_conteos', JSON.stringify([nuevoRegistro, ...historialPrevio].slice(0, 50)));
      setListaConteo(itemsRestantes); setModoSeleccion(false); setSeleccionados([]);
      if(itemsRestantes.length === 0) localStorage.removeItem('een_inventario_activo'); 
      mostrarToast(t.archivoExito, 'success');
    });
  };

  const copiarCodigo = (texto) => { navigator.clipboard.writeText(texto); mostrarToast(t.copiado, 'success'); };
  const copiarAjuste = (texto) => { navigator.clipboard.writeText(texto); mostrarToast(t.ajusteCopiado, 'success'); };
  const toggleSeleccion = (codigo) => setSeleccionados(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  const toggleTodos = () => setSeleccionados(seleccionados.length === listaConteo.length ? [] : listaConteo.map(i => i.codigo));
  const esRegistroDeHoy = () => {
    if (!sesionSeleccionadaNube?.fecha) return false;
    const fechaSesion = new Date(sesionSeleccionadaNube.fecha.toDate()).toDateString();
    return fechaSesion === new Date().toDateString();
  };

  const descargarCSV = () => {
    if (listaConteo.length === 0) { mostrarToast(t.listaVacia, 'error'); return; }
    let csv = "\uFEFFCodigo,Producto,Stock Sistema,Total Fisico,Ajuste,Detalle Conteos\n";
    listaConteo.forEach(i => csv += `${i.codigo},${i.nombre.replace(/,/g, "")},${i.stockSistema},${i.totalFisico},${i.totalFisico - i.stockSistema},"${i.variantes.filter(v => v.contadas > 0).map(v => `${v.pz}pz: ${v.contadas}`).join(" | ")}"\n`);
    const l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    l.setAttribute("download", `Conteo_${Date.now()}.csv`); document.body.appendChild(l); l.click();
  };

  const generarCSVDia = () => {
    const hoyStr = new Date().toDateString();
    const conteosHoy = JSON.parse(localStorage.getItem('een_historial_conteos') || '[]').filter(r => new Date(r.fecha).toDateString() === hoyStr);
    let todos = [...listaConteo]; conteosHoy.forEach(r => todos = [...todos, ...r.items]);
    if (todos.length === 0) { mostrarToast(t.noConteosDia, 'error'); return; }
    const agrupar = {};
    todos.forEach(i => {
      if (!agrupar[i.codigo]) agrupar[i.codigo] = JSON.parse(JSON.stringify(i));
      else { i.variantes.forEach(vN => { const vE = agrupar[i.codigo].variantes.find(vx => vx.id === vN.id); if (vE) vE.contadas += vN.contadas; else agrupar[i.codigo].variantes.push({...vN}); });
        agrupar[i.codigo].totalFisico = agrupar[i.codigo].variantes.reduce((sum, v) => sum + (v.pz * v.contadas), 0); }
    });
    let csv = "\uFEFFCodigo,Producto,Stock Sistema,Total Fisico,Ajuste,Detalle Conteos\n";
    Object.values(agrupar).forEach(i => csv += `${i.codigo},${i.nombre.replace(/,/g, "")},${i.stockSistema},${i.totalFisico},${i.totalFisico - i.stockSistema},"${i.variantes.filter(v => v.contadas > 0).map(v => `${v.pz}pz: ${v.contadas}`).join(" | ")}"\n`);
    const l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    l.setAttribute("download", `Consolidado_Dia.csv`); document.body.appendChild(l); l.click();
  };

  const getGruposNube = () => {
    if (!sesionSeleccionadaNube || !sesionSeleccionadaNube.items) return [];
    const entradas = [];
    const salidas = [];
    const correctos = [];

    sesionSeleccionadaNube.items.forEach(item => {
      const ajuste = item.totalFisico - item.stockSistema;
      if (ajuste > 0) entradas.push(item);
      else if (ajuste < 0) salidas.push(item);
      else correctos.push(item);
    });

    return [
      { id: 'entradas', titulo: t.tituloEntradas, data: entradas, textColor: 'text-emerald-400', borderColor: 'border-emerald-500/30' },
      { id: 'salidas', titulo: t.tituloSalidas, data: salidas, textColor: 'text-red-400', borderColor: 'border-red-500/30' },
      { id: 'correctos', titulo: t.tituloCorrectos, data: correctos, textColor: 'text-slate-400', borderColor: 'border-slate-700' }
    ];
  };

  const gruposNube = getGruposNube();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-slate-100 relative selection:bg-blue-500/30">
      
      {mostrarScanner && (
        <QRScannerInventario 
          productos={catalogoBase} 
          onScanSuccess={handleScanSuccess} 
          onClose={() => setMostrarScanner(false)} 
        />
      )}

      {toast.visible && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] animate-fade-in pointer-events-none w-[90%] max-w-sm">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border-2 ${toast.tipo === 'error' ? 'bg-red-900/95 border-red-500/80' : toast.tipo === 'success' ? 'bg-emerald-900/95 border-emerald-500/80' : 'bg-slate-800/95 border-blue-500/80'} backdrop-blur-md text-white`}>
             <i className={`fas ${toast.tipo === 'error' ? 'fa-exclamation-circle text-red-400' : toast.tipo === 'success' ? 'fa-check-circle text-emerald-400' : 'fa-info-circle text-blue-400'} text-2xl`}></i>
             <p className="text-base font-bold leading-tight">{toast.mensaje}</p>
          </div>
        </div>
      )}

      {/* ✨ Modal Confirmación asegurado y con color rojo si esPeligro es true */}
      {confirmar.visible && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-600 p-6 rounded-3xl max-w-sm w-full shadow-2xl text-center animate-fade-in-up">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${confirmar.esPeligro ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400'}`}>
                <i className={`fas ${confirmar.esPeligro ? 'fa-trash-alt' : 'fa-question'} text-3xl`}></i>
              </div>
              <p className="text-white text-lg font-black mb-6 leading-snug">{confirmar.mensaje}</p>
              <div className="flex gap-3">
                 <button type="button" onClick={() => setConfirmar({visible: false})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3.5 rounded-xl font-bold transition-all">{t.cancelar}</button>
                 <button type="button" onClick={() => { confirmar.onConfirm(); setConfirmar({visible: false}); }} className={`flex-1 text-white py-3.5 rounded-xl font-bold shadow-lg transition-all ${confirmar.esPeligro ? 'bg-red-600 hover:bg-red-500 shadow-red-900/50' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'}`}>
                   {confirmar.textoAceptar}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Forzamos "relative z-50" en ambas barras superiores */}
      <div className="bg-slate-950 border-b border-slate-850 px-4 py-2.5 landscape:py-1 flex justify-between items-center shrink-0 relative z-50">
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-750 shadow-inner">
          <button type="button" onClick={() => { setVistaActual('conteo'); setModoSeleccion(false); }} className={`px-3 py-1 landscape:py-0.5 rounded-lg font-black text-xs transition-all ${vistaActual === 'conteo' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>{t.pestañaConteo}</button>
          <button type="button" onClick={() => { setVistaActual('nube'); setModoSeleccion(false); }} className={`px-3 py-1 landscape:py-0.5 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${vistaActual === 'nube' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>{t.pestañaNube} {sesionesNube.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}</button>
        </div>
        <button type="button" onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} className="bg-slate-800 border border-slate-700 hover:bg-slate-750 px-3 py-1 landscape:py-0.5 rounded-lg font-bold text-xs text-white transition-colors">{t.idioma}</button>
      </div>

      {vistaActual === 'conteo' && (
        <header className={`border-b shrink-0 shadow-lg relative z-40 transition-colors ${modoSeleccion ? 'bg-blue-900/40 border-blue-500/50' : 'bg-slate-900 border-slate-700'} p-4 landscape:p-2 landscape:px-4 flex flex-col landscape:flex-row landscape:items-center landscape:justify-between gap-4 landscape:gap-4`}>
          <div className="flex justify-between items-center landscape:w-1/3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-11 h-11 landscape:w-9 landscape:h-9 rounded-xl landscape:rounded-lg flex items-center justify-center shadow-lg border shrink-0 ${modoSeleccion ? 'bg-blue-500 border-blue-400 text-white' : 'bg-blue-600 border-blue-500/50 shadow-blue-900/50'}`}>
                <i className={`fas ${modoSeleccion ? 'fa-check-double' : estaEscuchando ? 'fa-microphone animate-pulse text-red-200' : 'fa-clipboard-list text-white'} landscape:text-sm`}></i>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl landscape:text-lg font-black tracking-tight text-white truncate">{modoSeleccion ? `${seleccionados.length} Seleccionados` : t.titulo}</h1>
                <p className="text-[11px] landscape:text-[9px] text-slate-300 font-bold uppercase tracking-wider truncate">{modoSeleccion ? 'Modo de edición parcial' : (catStatus.error ? t.errorCarga : catStatus.loading ? t.cargando : `${catStatus.count} ${t.listas}`)}</p>
              </div>
            </div>
            
            {/* ✨ BOTONES SELECCIONAR Y LIMPIAR (VISTA VERTICAL) */}
            {listaConteo.length > 0 && (
              <div className="landscape:hidden flex items-center gap-2 shrink-0">
                <button 
                  type="button" 
                  onClick={handleLimpiarLista} 
                  className="px-3.5 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm border bg-slate-800/80 text-red-400 border-red-500/30 hover:bg-red-500/20 active:scale-95" 
                  title={t.limpiarLista}
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
                <button 
                  type="button" 
                  onClick={() => { setModoSeleccion(!modoSeleccion); setSeleccionados([]); }} 
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm border shrink-0 ${modoSeleccion ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30'}`}
                >
                  <i className={`fas ${modoSeleccion ? 'fa-times' : 'fa-check-square'} mr-1.5`}></i> {modoSeleccion ? t.cancelar : t.seleccionar}
                </button>
              </div>
            )}
          </div>
          
          {modoSeleccion ? (
            <div className="flex gap-3 landscape:w-2/3 landscape:justify-end">
               <button type="button" onClick={toggleTodos} className="flex-1 landscape:flex-none bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white p-3 landscape:py-1.5 landscape:px-4 rounded-2xl landscape:rounded-lg transition-all shadow-sm font-bold text-sm landscape:text-xs flex justify-center items-center gap-2 active:scale-95"><i className={`far ${seleccionados.length === listaConteo.length ? 'fa-square' : 'fa-check-square'}`}></i> {seleccionados.length === listaConteo.length ? t.selNada : t.selTodo}</button>
               <button type="button" onClick={handleSincronizacionTotal} className="flex-[2] landscape:flex-none bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 text-white p-3 landscape:py-1.5 landscape:px-6 rounded-2xl landscape:rounded-lg transition-all shadow-lg font-black text-sm landscape:text-xs uppercase tracking-wider flex justify-center items-center gap-2 active:scale-95"><i className="fas fa-cloud-upload-alt"></i> {t.sincronizarSel?.replace('{n}', seleccionados.length)}</button>
            </div>
          ) : (
            <div className="flex flex-col landscape:flex-row gap-3 landscape:gap-2 landscape:w-2/3 landscape:justify-end">
              {listaConteo.length > 0 && (
                <button type="button" onClick={handleSincronizacionTotal} className="w-full landscape:w-auto bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 landscape:py-1.5 landscape:px-6 rounded-2xl landscape:rounded-lg font-black text-sm landscape:text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 border border-emerald-400 flex items-center justify-center gap-2 active:scale-95 transition-all"><i className="fas fa-cloud-upload-alt text-lg landscape:text-sm"></i> {t.botonSincronizar}</button>
              )}
              
              <div className="grid grid-cols-4 landscape:flex landscape:flex-row gap-3 landscape:gap-2">
                {/* ✨ BOTONES SELECCIONAR Y LIMPIAR (VISTA HORIZONTAL) */}
                {listaConteo.length > 0 && (
                  <>
                    <button type="button" onClick={() => { setModoSeleccion(!modoSeleccion); setSeleccionados([]); }} className={`hidden landscape:flex flex-col items-center justify-center gap-1.5 bg-blue-500/20 border border-blue-500/40 text-blue-400 p-3 landscape:py-1.5 landscape:px-3 rounded-2xl landscape:rounded-lg transition-all shadow-sm`} title={t.seleccionar}><i className="fas fa-check-square text-xl landscape:text-base"></i></button>
                    <button type="button" onClick={handleLimpiarLista} className={`hidden landscape:flex flex-col items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 p-3 landscape:py-1.5 landscape:px-3 rounded-2xl landscape:rounded-lg transition-all shadow-sm active:scale-95`} title={t.limpiarLista}><i className="fas fa-trash-alt text-xl landscape:text-base"></i></button>
                  </>
                )}

                <button type="button" onClick={handleFinalizarConteo} className="flex flex-col items-center justify-center gap-1.5 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-400 p-3 landscape:py-1.5 landscape:px-3 rounded-2xl landscape:rounded-lg transition-all shadow-sm active:scale-95"><i className="fas fa-archive text-xl landscape:text-base"></i><span className="text-[10px] landscape:hidden font-black uppercase text-center leading-tight tracking-tighter text-amber-200">{t.archivar}</span></button>
                <button type="button" onClick={descargarCSV} className="flex flex-col items-center justify-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-400 p-3 landscape:py-1.5 landscape:px-3 rounded-2xl landscape:rounded-lg transition-all shadow-sm active:scale-95"><i className="fas fa-file-excel text-xl landscape:text-base"></i><span className="text-[10px] landscape:hidden font-black uppercase text-center leading-tight tracking-tighter text-emerald-200">{t.csvVista}</span></button>
                <button type="button" onClick={generarCSVDia} className="flex flex-col items-center justify-center gap-1.5 bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500/30 text-blue-400 p-3 landscape:py-1.5 landscape:px-3 rounded-2xl landscape:rounded-lg transition-all shadow-sm active:scale-95"><i className="fas fa-file-csv text-xl landscape:text-base"></i><span className="text-[10px] landscape:hidden font-black uppercase text-center leading-tight tracking-tighter text-blue-200">{t.csvDia}</span></button>
                <button type="button" onClick={() => setMostrarHistorial(true)} className="flex flex-col items-center justify-center gap-1.5 bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-400 p-3 landscape:py-1.5 landscape:px-3 rounded-2xl landscape:rounded-lg transition-all shadow-sm active:scale-95"><i className="fas fa-history text-xl landscape:text-base"></i><span className="text-[10px] landscape:hidden font-black uppercase text-center leading-tight tracking-tighter text-purple-200">{t.historial}</span></button>
              </div>
            </div>
          )}
        </header>
      )}

      {/* z-0 para asegurar que quede bajo el header siempre */}
      <main className="flex-1 overflow-y-auto p-4 landscape:p-2 max-w-5xl mx-auto w-full custom-scroll relative z-0">
        {vistaActual === 'conteo' ? (
          <div className="flex flex-col gap-5 landscape:gap-3 pb-12 landscape:pb-6">
            
            <div className="bg-slate-800 p-4 landscape:p-2 landscape:px-3 rounded-3xl landscape:rounded-xl border border-slate-600 shadow-xl flex gap-3 landscape:gap-2 items-center">
               <div className="flex-1 min-w-0">
                  <EscanerManual catalogoBase={catalogoBase} onAgregarProducto={agregarProductoALista} idioma={idioma} />
               </div>
               <button 
                  type="button"
                  onClick={() => setMostrarScanner(true)}
                  className="w-12 h-12 landscape:w-10 landscape:h-10 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white rounded-2xl landscape:rounded-lg shadow-lg flex items-center justify-center transition-all shrink-0 active:scale-95"
               >
                  <i className="fas fa-qrcode text-xl landscape:text-base"></i>
               </button>
            </div>

            <ListaConteo 
              listaConteo={listaConteo} idioma={idioma} 
              onCambiarCant={cambiarCant} onManualCant={manualCant} 
              onEliminar={(cod) => setListaConteo(prev => prev.filter(p => p.codigo !== cod))}
              onAgregarEmpaque={(cod, pz) => { setListaConteo(prev => prev.map(p => p.codigo === cod ? { ...p, variantes: [...p.variantes, { id: `f_${Date.now()}`, pz: parseInt(pz), contadas: 0, isFantasma: true }].sort((a,b) => b.pz - a.pz) } : p)); }}
              onAbrirCalculadora={(codigo, varId) => { const p = listaConteo.find(x => x.codigo === codigo); setCalcActiva({ isOpen: true, codigo, varId, nombre: p?.nombre }); }}
              onIniciarDictado={(codigo, varId, btn, letra) => iniciarDictado(codigo, varId, letra)} onZoomImagen={(img) => setImagenAmpliada(img)} modoSeleccion={modoSeleccion} seleccionados={seleccionados} onToggleSeleccion={toggleSeleccion} 
              onAutoCompletar={autoCompletarStock} 
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5 animate-fade-in pb-10">
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scroll">
              {sesionesNube.length === 0 ? ( <p className="text-slate-500 text-sm italic py-4">{t.nubeVacia}</p> ) : (
                sesionesNube.map((sesion, idx) => {
                  const isSelected = sesionSeleccionadaNube?.id === sesion.id;
                  const fechaStr = sesion.fecha ? new Date(sesion.fecha.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Live';
                  return (
                    <button type="button" key={sesion.id} onClick={() => setSesionSeleccionadaNube(sesion)} className={`p-3 rounded-2xl border text-left shrink-0 transition-all flex flex-col gap-1 min-w-[140px] ${isSelected ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${sesion.etiqueta ? 'text-emerald-400' : 'text-purple-400'}`}>{sesion.etiqueta || t.sesionNum.replace('{n}', sesionesNube.length - idx)}</span>
                      <span className="font-bold text-xs text-slate-200">{fechaStr} • {sesion.total_skus || 0} SKUs</span>
                      <span className="text-[9px] text-slate-500 truncate"><i className="fas fa-warehouse mr-1"></i>{sesion.origen || t.origenDispositivo}</span>
                    </button>
                  );
                })
              )}
            </div>

            {sesionSeleccionadaNube ? (
              <div className="flex flex-col gap-4">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-850 p-4 rounded-2xl border border-slate-700 mb-2 gap-3">
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-2"><i className="fas fa-cloud-download-alt text-purple-400"></i> {t.tablaTitulo}</h3>
                    <span className="text-[11px] text-slate-400"><i className="fas fa-pencil-alt mr-1"></i>{t.tablaSub}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={cargarParaAuditoria} 
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-blue-400"
                  >
                    <i className="fas fa-clipboard-check text-base"></i> {t.auditarSesion}
                  </button>
                </div>

                {gruposNube.map((grupo) => {
                  if (grupo.data.length === 0) return null;
                  const canEdit = esRegistroDeHoy();

                  return (
                    <div key={grupo.id} className="mb-6">
                      
                      <div className="md:hidden">
                        <h4 className={`${grupo.textColor} font-black text-xs uppercase tracking-wider mb-3 ml-2 border-b border-slate-700 pb-2`}>
                          {grupo.titulo} <span className="bg-slate-800 px-2 py-0.5 rounded-full ml-1 text-white">{grupo.data.length}</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          {grupo.data.map((item) => {
                            const ajuste = item.totalFisico - item.stockSistema;
                            return (
                              <div key={item.codigo} className={`bg-slate-800 border ${grupo.borderColor} rounded-2xl p-4 flex flex-col gap-3 shadow-md`}>
                                <button type="button" onClick={() => copiarCodigo(item.codigo)} className="w-full bg-slate-900 border border-slate-650 hover:border-blue-500 text-blue-400 p-2.5 rounded-xl font-mono font-black text-sm flex items-center justify-between active:scale-[0.98] transition-all">
                                  <span className="tracking-wider">{item.codigo}</span> <span className="text-[10px] bg-blue-600/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30 uppercase tracking-widest flex items-center gap-1"><i className="fas fa-copy"></i> {t.copiarBoton}</span>
                                </button>
                                <p className="font-bold text-xs text-white leading-tight">{item.nombre}</p>
                                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-700/60 text-center">
                                  <div className={`p-2 rounded-lg relative ${canEdit ? 'bg-slate-900/40' : 'bg-slate-900/10 opacity-50'}`}>
                                    <span className="block text-[9px] font-black text-slate-500 uppercase">{t.colSis} {canEdit && <i className="fas fa-pencil-alt text-[8px]"></i>}</span>
                                    <input key={`movil-${item.codigo}-${item.stockSistema}`} type="number" disabled={!canEdit} className={`w-full bg-transparent text-slate-300 font-bold text-xs text-center focus:outline-none focus:bg-slate-800 rounded px-1 py-0.5 mt-0.5 border-b border-dashed border-slate-600 ${!canEdit ? 'cursor-not-allowed' : ''}`} defaultValue={item.stockSistema} onBlur={(e) => handleUpdateStockSistema(item.codigo, e.target.value)} />
                                  </div>
                                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-750">
                                    <span className="block text-[9px] font-black text-blue-400 uppercase">{t.colFis}</span>
                                    <span className="font-black text-xs text-white block mt-1">{item.totalFisico}</span>
                                  </div>
                                  <button type="button" onClick={() => copiarAjuste(ajuste)} className={`p-2 rounded-lg border flex flex-col items-center justify-center active:scale-95 transition-all ${ajuste > 0 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : ajuste < 0 ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-slate-400 border-slate-700 bg-slate-800/50'}`}>
                                    <span className="block text-[9px] font-black uppercase opacity-80">{t.colDif}</span>
                                    <span className="font-black text-xs block mt-1">{ajuste > 0 ? `+${ajuste}` : ajuste}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="hidden md:block bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                        <div className={`bg-slate-900/60 p-3 border-b border-slate-700 flex justify-between items-center`}>
                          <h4 className={`${grupo.textColor} font-black text-xs uppercase tracking-wider`}>
                            {grupo.titulo}
                          </h4>
                          <span className="bg-slate-800 border border-slate-600 px-2 py-0.5 rounded-md text-[10px] text-white font-bold">{grupo.data.length} SKUs</span>
                        </div>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900/40 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-700/50">
                              <th className="p-3 pl-4 w-36">{t.colSku}</th>
                              <th className="p-3">{t.colProd}</th>
                              <th className="p-3 text-center w-24">{t.colSis}</th>
                              <th className="p-3 text-center w-20">{t.colFis}</th>
                              <th className="p-3 text-center pr-4 w-24">{t.colDif}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50 text-xs font-medium text-slate-200">
                            {grupo.data.map((item) => {
                              const ajuste = item.totalFisico - item.stockSistema;
                              return (
                                <tr key={item.codigo} className="hover:bg-slate-750/50 transition-colors group">
                                  <td className="p-3 pl-4"><button type="button" onClick={() => copiarCodigo(item.codigo)} className="w-full text-left text-blue-400 hover:text-blue-300 flex items-center justify-between bg-slate-900/40 p-1.5 rounded-lg border border-slate-700 group-hover:border-blue-500/40 transition-all font-mono font-bold"><span>{item.codigo}</span> <i className="fas fa-copy text-[10px]"></i></button></td>
                                  <td className="p-3 font-bold text-white truncate max-w-sm">{item.nombre}</td>
                                  <td className="p-3 text-center">
                                    <input key={`pc-${item.codigo}-${item.stockSistema}`} type="number" disabled={!canEdit} className={`w-16 bg-slate-900/30 text-slate-300 text-center font-bold border-b border-dashed border-slate-500 focus:outline-none focus:bg-slate-900 py-1 rounded transition-all ${!canEdit ? 'opacity-40 cursor-not-allowed border-none' : 'hover:bg-slate-800'}`} defaultValue={item.stockSistema} onBlur={(e) => handleUpdateStockSistema(item.codigo, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
                                  </td>
                                  <td className="p-3 text-center font-bold text-white bg-slate-900/20">{item.totalFisico}</td>
                                  <td className="p-3 text-center pr-4">
                                    <button type="button" onClick={() => copiarAjuste(ajuste)} className={`w-full py-2 rounded-lg border font-black active:scale-95 transition-all flex items-center justify-center gap-2 ${ajuste > 0 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' : ajuste < 0 ? 'text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500/10' : 'text-slate-400 border-slate-700 bg-slate-800/50 hover:bg-slate-700'}`}>
                                      {ajuste > 0 ? `+${ajuste}` : ajuste} <i className="fas fa-copy text-[10px] opacity-30"></i>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

              </div>
            ) : ( sesionesNube.length > 0 && ( <div className="text-center py-12 bg-slate-800/40 rounded-3xl border border-dashed border-slate-700"><i className="fas fa-mobile-alt text-3xl text-slate-600 mb-3 animate-pulse"></i><p className="text-xs font-bold text-slate-400">{t.sinSesionSel}</p></div> ) )}
          </div>
        )}
      </main>

      <ModalCalculadora isOpen={calcActiva.isOpen} tituloTarget={calcActiva.nombre} codigoItem={calcActiva.codigo} varIdItem={calcActiva.varId} onClose={() => setCalcActiva(prev => ({ ...prev, isOpen: false }))} onAplicar={(total) => cambiarCant(calcActiva.codigo, calcActiva.varId, total)} idioma={idioma} />
      {imagenAmpliada && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 touch-none" onClick={() => setImagenAmpliada(null)}><div className="relative max-w-md w-full flex flex-col items-center animate-fade-in" onClick={e => e.stopPropagation()}><button type="button" onClick={() => setImagenAmpliada(null)} className="absolute -top-14 right-0 w-12 h-12 bg-slate-800 border border-slate-600 rounded-full text-white shadow-xl flex items-center justify-center"><i className="fas fa-times text-xl"></i></button><div className="bg-white p-3 rounded-3xl shadow-2xl w-full flex justify-center"><img src={imagenAmpliada} alt="Verificación" className="w-full max-h-[70vh] object-contain rounded-2xl mix-blend-multiply" /></div><p className="text-white font-black text-xs mt-6 uppercase tracking-widest bg-slate-800 px-6 py-3 rounded-full border border-slate-600 cursor-pointer" onClick={() => setImagenAmpliada(null)}>{t.cerrarVerificacion}</p></div></div>}

      {mostrarHistorial && (
        <div className="fixed inset-0 z-[150] flex flex-col bg-slate-900/98 backdrop-blur-xl animate-fade-in">
          <div className="p-5 border-b border-slate-700 bg-slate-900 sticky top-0 z-10 flex justify-between items-center"><h2 className="text-xl font-black text-white">{conteoSeleccionado ? t.detalleConteo : t.historialArchivados}</h2><button type="button" onClick={() => { conteoSeleccionado ? setConteoSeleccionado(null) : setMostrarHistorial(false); }} className="w-11 h-11 bg-slate-800 border border-slate-600 rounded-xl flex items-center justify-center text-white"><i className={`fas ${conteoSeleccionado ? 'fa-arrow-left' : 'fa-times'} text-lg`}></i></button></div>
          <div className="flex-1 overflow-y-auto p-4 pb-20 custom-scroll">
            {conteoSeleccionado ? <ListaConteo listaConteo={conteoSeleccionado.items} idioma={idioma} soloLectura={true} /> : (
              <div className="grid gap-4 max-w-3xl mx-auto">{JSON.parse(localStorage.getItem('een_historial_conteos') || '[]').map(reg => (
                  <div key={reg.id} onClick={() => setConteoSeleccionado(reg)} className="bg-slate-800 border border-slate-600 p-5 rounded-3xl flex justify-between items-center cursor-pointer hover:bg-slate-750">
                    <div><p className="text-white font-black text-lg mb-1 capitalize">{new Date(reg.fecha).toLocaleDateString(idioma==='es'?'es-MX':'fr-FR', { weekday:'long', year:'numeric', month:'short', day:'numeric' })}</p><span className="text-slate-400 text-xs font-bold">{reg.items.length} {t.skusContados}</span></div>
                    <i className="fas fa-chevron-right text-slate-500 text-lg"></i>
                  </div>
                ))}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioView;
