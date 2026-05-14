import React, { useMemo, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase'; 
import PedidoCard from './PedidoCard'; 

const SidebarDispatcher = ({ 
  pedidosFiltrados, 
  filtro, 
  setFiltro, 
  viajeSeleccionado, 
  setViajeSeleccionado,
  busqueda,
  setBusqueda,
  onOpenForm,
  onOpenAdmin,
  onOpenBitacora,
  onToggleSidebar 
}) => {

  const fechaHoy = new Date().toLocaleDateString('es-MX', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).toUpperCase();

  const [materialesPendientes, setMaterialesPendientes] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'material_pendiente'), where('estado', '==', 'esperando_material'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.fecha_reporte?.toMillis() || 0) - (a.fecha_reporte?.toMillis() || 0));
      setMaterialesPendientes(data);
    });
    return () => unsubscribe();
  }, []);

  // === FUNCIONES DE LA TABLITA ===
  const handleMandarRuta = async (pendiente) => {
    if (!window.confirm("¿Crear un nuevo viaje de reparto para enviar este material?")) return;
    try {
      await addDoc(collection(db, 'rutas_logistica'), {
        cliente_nombre: pendiente.cliente_nombre,
        cliente_codigo: pendiente.cliente_codigo || '',
        direccion: pendiente.direccion || '',
        coordenadas: pendiente.coordenadas || { lat: 25.6866, lng: -100.3161 },
        folio_pedido: (pendiente.folio_original || 'SN') + '-FALTANTE',
        destino_alias: 'Envío de Pendiente',
        tipo_envio: 'reparto_local',
        estado: 'pendiente',
        notas: `MATERIAL FALTANTE: ${pendiente.descripcion}`,
        fecha_creacion: serverTimestamp(),
        procesado_por_web: true
      });
      await updateDoc(doc(db, 'material_pendiente', pendiente.id), { estado: 'resuelto', fecha_resolucion: serverTimestamp() });
      setFiltro('pendiente');
    } catch (e) {
      console.error("Error al mandar a ruta:", e);
    }
  };

  const handleEntregadoMostrador = async (pendiente) => {
    if (!window.confirm("¿Confirmar que el cliente ya pasó por este material y entregárselo?")) return;
    try {
      await updateDoc(doc(db, 'material_pendiente', pendiente.id), { estado: 'resuelto', fecha_resolucion: serverTimestamp() });
    } catch (e) {
      console.error("Error al entregar en mostrador:", e);
    }
  };

  // === FUNCIONES DE DEPURACIÓN BLINDADAS ===
  const handleDepurarFleteras = async () => {
    if (!window.confirm("⚠️ ¿Seguro que quieres ejecutar la limpieza de fleteras basura y corruptas? Esto no se puede deshacer.")) return;
    
    try {
      const querySnapshot = await getDocs(collection(db, 'catalogo_fleteras'));
      let borrados = 0;
      let corruptosBorrados = 0;
      const promesas = [];

      querySnapshot.forEach((documento) => {
        const data = documento.data();
        
        // 1. Detectar fleteras corruptas (nombre nulo, vacío o undefined)
        if (!data || !data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
          promesas.push(deleteDoc(doc(db, 'catalogo_fleteras', documento.id)));
          corruptosBorrados++;
        } 
        // 2. Detectar fleteras basura generadas automáticamente
        else if (data.direccion === "Dirección pendiente") {
          promesas.push(deleteDoc(doc(db, 'catalogo_fleteras', documento.id)));
          borrados++;
        }
      });

      await Promise.all(promesas);
      alert(`✅ Depuración de Fleteras terminada.\n- Registros basura eliminados: ${borrados}\n- Registros corruptos (null) eliminados: ${corruptosBorrados}`);
    } catch (error) {
      console.error("Error al depurar fleteras:", error);
      alert("❌ Hubo un error durante la depuración. Revisa la consola.");
    }
  };

  const handleDepurarClientes = async () => {
    if (!window.confirm("⚠️ ¿Limpiar direcciones corruptas (nulas) y fusionar clientes duplicados por SAP?")) return;
    
    try {
      console.log("Iniciando saneamiento de direcciones y fusión...");
      const querySnapshot = await getDocs(collection(db, 'clientes_logistica'));
      
      const clientesMap = new Map();
      let borrados = 0;
      let actualizados = 0;
      let direccionesCorruptasBorradas = 0; // NUEVO TRACKER PARA NULLS
      const promesas = [];

      querySnapshot.forEach((documento) => {
        const data = documento.data();
        const id = documento.id;

        // --- SANEAMIENTO DE DIRECCIONES (Filtro anti-nulls) ---
        let direccionesSanas = [];
        let teniaCorruptas = false;

        if (Array.isArray(data.direcciones)) {
            direccionesSanas = data.direcciones.filter(d => {
                // Si la dirección es nula, no tiene propiedad 'direccion' o 'alias', o no son textos, se descarta
                if (!d || !d.direccion || !d.alias || typeof d.direccion !== 'string' || typeof d.alias !== 'string') {
                    teniaCorruptas = true;
                    direccionesCorruptasBorradas++;
                    return false; 
                }
                return true;
            });
        }
        
        if (teniaCorruptas) {
            data.direcciones = direccionesSanas; // Actualizamos temporalmente en memoria
        }
        // ------------------------------------------------------

        const codigo = (data.codigo || '').trim().toUpperCase();

        if (!codigo || codigo === 'S/C') {
            // Si el cliente no tiene código pero le limpiamos direcciones corruptas, guardamos su limpieza
            if (teniaCorruptas) {
                promesas.push(updateDoc(doc(db, 'clientes_logistica', id), { direcciones: direccionesSanas }));
                actualizados++;
            }
            return; 
        }

        if (!clientesMap.has(codigo)) {
            clientesMap.set(codigo, { id, data, necesitaActualizar: teniaCorruptas, duplicadosABorrar: [] });
        } else {
            const master = clientesMap.get(codigo);
            const clonDirs = data.direcciones || [];
            let masterDirs = [...(master.data.direcciones || [])];

            clonDirs.forEach(dClon => {
                const existe = masterDirs.some(mDir => mDir.direccion.toLowerCase().trim() === dClon.direccion.toLowerCase().trim());
                if (!existe) {
                    masterDirs.push(dClon);
                    master.necesitaActualizar = true; 
                }
            });

            master.data.direcciones = masterDirs; 
            master.duplicadosABorrar.push(id);    
        }
      });

      // Ejecutar cambios en Firebase
      for (const [codigo, master] of clientesMap.entries()) {
          if (master.necesitaActualizar) {
              promesas.push(updateDoc(doc(db, 'clientes_logistica', master.id), { direcciones: master.data.direcciones }));
              actualizados++;
          }
          if (master.duplicadosABorrar.length > 0) {
              master.duplicadosABorrar.forEach(dupeId => {
                  promesas.push(deleteDoc(doc(db, 'clientes_logistica', dupeId)));
                  borrados++;
              });
          }
      }

      if (promesas.length > 0) {
          await Promise.all(promesas);
          alert(`✅ Saneamiento y Fusión completada.\n- Direcciones corruptas (null) eliminadas: ${direccionesCorruptasBorradas}\n- Clientes actualizados: ${actualizados}\n- Copias eliminadas: ${borrados}`);
      } else {
          alert(`✅ Tu catálogo está perfectamente limpio. No se encontraron Códigos SAP duplicados ni direcciones corruptas.`);
      }

    } catch (error) {
      console.error("Error al depurar clientes:", error);
      alert("❌ Error de Firebase al depurar clientes. Revisa la consola.");
    }
  };

  // === AUTO-SCROLL AL VIAJE SELECCIONADO ===
  useEffect(() => {
    if (viajeSeleccionado && filtro !== 'faltantes') {
        const timeoutId = setTimeout(() => {
            const selectedCard = document.getElementById(`pedido-card-${viajeSeleccionado.id}`);
            if (selectedCard) {
                selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
        return () => clearTimeout(timeoutId);
    }
  }, [viajeSeleccionado, filtro]);

  // === RENDERIZADO DEL CONTENIDO ===
  const contenidoSidebar = useMemo(() => {
    if (filtro === 'faltantes') {
      if (materialesPendientes.length === 0) {
        return (
          <div className="text-center py-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
               <i className="fas fa-check text-purple-400 text-3xl"></i>
            </div>
            <span className="text-sm font-black text-slate-600">¡Tablita limpia!</span>
            <span className="text-xs text-slate-400 font-medium">No hay material pendiente.</span>
          </div>
        );
      }

      return materialesPendientes.map(pend => (
        <div key={pend.id} className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-4 mb-3 shadow-[0_4px_15px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:bg-white/60 transition-all transform-gpu">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-400/10 blur-2xl rounded-full"></div>
          
          <div className="flex justify-between items-start mb-2 relative z-10">
             <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-[6px] text-[9px] font-black uppercase tracking-wide border border-purple-200/50 shadow-sm flex items-center gap-1">
                <i className="fas fa-clipboard-list"></i> Folio original
             </span>
             <span className="text-[10px] font-mono font-black text-slate-500">{pend.folio_original}</span>
          </div>

          <h4 className="font-black text-sm leading-tight text-slate-800 mb-2 relative z-10">{pend.cliente_nombre}</h4>
          
          <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-3 mb-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] relative z-10">
            <p className="text-[9px] font-black uppercase text-amber-800 mb-1 tracking-wider"><i className="fas fa-box-open mr-1"></i> Faltó lo siguiente:</p>
            <p className="text-[11px] font-medium text-slate-700 italic">"{pend.descripcion}"</p>
          </div>

          <div className="relative z-10">
             {pend.metodo_solucion === 'envio' ? (
                <button onClick={() => handleMandarRuta(pend)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 border border-blue-400">
                   <i className="fas fa-truck-fast"></i> Mandar a Ruta (Crear Viaje)
                </button>
             ) : (
                <button onClick={() => handleEntregadoMostrador(pend)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 border border-emerald-400">
                   <i className="fas fa-store"></i> Entregado en Mostrador
                </button>
             )}
          </div>
        </div>
      ));
    }

    if (pedidosFiltrados.length === 0) return [];

    if (filtro === 'pendiente') {
      const grupos = {};
      pedidosFiltrados.forEach(p => {
        const key = p.direccion || `sin_direccion_${p.id}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(p);
      });

      return Object.values(grupos).map((grupo, index) => {
        if (grupo.length > 1) {
          return (
            <div key={`grupo-${index}`} className="border-[1.5px] border-dashed border-blue-400/50 bg-blue-50/50 rounded-2xl p-2 pb-2 mb-3 pt-8 relative shadow-sm">
              <div className="absolute top-2 left-3 text-[9px] font-black text-blue-800 flex items-center gap-1.5 uppercase tracking-wide">
                <i className="fas fa-map-marker-alt"></i> {grupo.length} pedidos al mismo destino
              </div>
              <div className="space-y-2">
                {grupo.map(pedido => (
                  <div key={pedido.id} id={`pedido-card-${pedido.id}`}>
                      <PedidoCard pedido={pedido} isActive={viajeSeleccionado?.id === pedido.id} onClick={() => setViajeSeleccionado(pedido)} />
                  </div>
                ))}
              </div>
            </div>
          );
        } else {
          const pedido = grupo[0];
          return (
            <div key={pedido.id} id={`pedido-card-${pedido.id}`} className="mb-3">
              <PedidoCard pedido={pedido} isActive={viajeSeleccionado?.id === pedido.id} onClick={() => setViajeSeleccionado(pedido)} />
            </div>
          );
        }
      });
    }

    return pedidosFiltrados.map(pedido => (
      <div key={pedido.id} id={`pedido-card-${pedido.id}`} className="mb-3">
        <PedidoCard pedido={pedido} isActive={viajeSeleccionado?.id === pedido.id} onClick={() => setViajeSeleccionado(pedido)} />
      </div>
    ));
  }, [pedidosFiltrados, filtro, viajeSeleccionado, setViajeSeleccionado, materialesPendientes]);

  return (
    <div className="w-full h-full bg-white/80 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex flex-col border-r border-white/50 overflow-hidden lg:rounded-r-3xl">
      
      <div className="p-4 border-b border-white/50 shrink-0 relative z-20 bg-white/40">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-black text-blue-900 flex items-center gap-2 drop-shadow-sm">
              <i className="fas fa-truck-fast text-blue-700"></i> Logística EEN
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              {fechaHoy}
            </p>
          </div>
          <button onClick={onToggleSidebar} className="w-8 h-8 rounded-full bg-white/60 border border-white text-slate-600 hover:text-blue-800 hover:bg-white shadow-sm transition flex items-center justify-center">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
        </div>

        <div className="flex gap-2 items-center mb-4">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input type="text" placeholder="Buscar cliente, folio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-white/80 border border-white/60 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition font-medium text-slate-800 placeholder-slate-400 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]" />
          </div>
          
          {/* BOTÓN 1: LIMPIAR FLETERAS (ROJO) */}
          <button onClick={handleDepurarFleteras} title="Limpiar Fleteras Basura" className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center hover:bg-red-100 transition shadow-sm shrink-0">
            <i className="fas fa-broom"></i>
          </button>

          {/* BOTÓN 2: FUSIONAR CLIENTES Y LIMPIAR NULLS (ÁMBAR) */}
          <button onClick={handleDepurarClientes} title="Limpiar Direcciones y Fusionar Clientes" className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center hover:bg-amber-100 transition shadow-sm shrink-0">
            <i className="fas fa-users-slash"></i>
          </button>

          <button onClick={onOpenAdmin} className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition shadow-md shrink-0"><i className="fas fa-cog"></i></button>
          <button onClick={onOpenBitacora} className="w-9 h-9 rounded-xl bg-indigo-50/90 text-indigo-700 border border-indigo-200 flex items-center justify-center hover:bg-indigo-100 transition shadow-sm shrink-0"><i className="fas fa-book"></i></button>
          <button onClick={onOpenForm} className="w-9 h-9 rounded-xl bg-blue-700/90 text-white flex items-center justify-center hover:bg-blue-800 transition shadow-md shadow-blue-800/20 shrink-0"><i className="fas fa-plus"></i></button>
        </div>

        {/* FILTROS Y TABLITA */}
        <div className="flex gap-1.5 overflow-x-auto custom-scroll pb-1">
           <button onClick={() => setFiltro('faltantes')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${filtro === 'faltantes' ? 'bg-purple-700 text-white border-purple-600 shadow-md shadow-purple-900/20' : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'}`}>
              <i className="fas fa-clipboard-list text-[10px]"></i> Faltantes
              {materialesPendientes.length > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">{materialesPendientes.length}</span>
              )}
           </button>
           
           <div className="w-px bg-white/50 mx-1 shrink-0"></div>

           <button onClick={() => setFiltro('activos')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'activos' ? 'bg-blue-800 text-white shadow-md shadow-blue-900/20' : 'bg-white/60 text-slate-700 border border-white/80 hover:bg-white'}`}><i className="fas fa-layer-group text-[10px]"></i> En Curso</button>
           <button onClick={() => setFiltro('pendiente')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'pendiente' ? 'bg-blue-800 text-white shadow-md shadow-blue-900/20' : 'bg-white/60 text-slate-700 border border-white/80 hover:bg-white'}`}><i className="fas fa-clock text-[10px]"></i> Por Asignar</button>
           <button onClick={() => setFiltro('rampa')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'rampa' ? 'bg-blue-800 text-white shadow-md shadow-blue-900/20' : 'bg-white/60 text-slate-700 border border-white/80 hover:bg-white'}`}><i className="fas fa-dolly text-[10px]"></i> En Rampa</button>
           <button onClick={() => setFiltro('ruta')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'ruta' ? 'bg-blue-800 text-white shadow-md shadow-blue-900/20' : 'bg-white/60 text-slate-700 border border-white/80 hover:bg-white'}`}><i className="fas fa-truck-fast text-[10px]"></i> En Ruta</button>
           <button onClick={() => setFiltro('entregado')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'entregado' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' : 'bg-white/60 text-slate-700 border border-white/80 hover:bg-white'}`}><i className="fas fa-check-double text-[10px]"></i> Entregados</button>
           <button onClick={() => setFiltro('fallido')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filtro === 'fallido' ? 'bg-red-600 text-white shadow-md shadow-red-900/20' : 'bg-white/60 text-slate-700 border border-white/80 hover:bg-white'}`}><i className="fas fa-exclamation-triangle text-[10px]"></i> Fallas</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scroll space-y-3 relative z-10">
        {contenidoSidebar}
        
        {pedidosFiltrados.length === 0 && filtro !== 'faltantes' && (
            <div className="text-center py-6 text-slate-500 font-bold flex flex-col items-center">
                <i className="fas fa-search text-slate-400 text-3xl mb-2"></i>
                <span className="text-xs">No hay resultados.</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default SidebarDispatcher;
