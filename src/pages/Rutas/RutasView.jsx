import React, { useState, useEffect } from 'react';
import { useLogistica } from './context/LogisticaContext';
import SidebarDispatcher from './components/SidebarDispatcher';
import DetalleDrawer from './components/DetalleDrawer';
import MapaLogistico from './components/MapaLogistico';
import FormularioOrden from './components/FormularioOrden';
import ModalAdmin from './components/ModalAdmin';
import ModalBitacora from './components/ModalBitacora';

const RutasView = () => {
  const { pedidos } = useLogistica();
  
  const [filtro, setFiltro] = useState('activos');
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [sidebarAbierto, setSidebarAbierto] = useState(true); 
  const [busqueda, setBusqueda] = useState(''); 

  const [modalOrdenAbierto, setModalOrdenAbierto] = useState(false);
  const [modalAdminAbierto, setModalAdminAbierto] = useState(false);
  const [modalBitacoraAbierto, setModalBitacoraAbierto] = useState(false);
  const [ordenAEditar, setOrdenAEditar] = useState(null);

  useEffect(() => {
    document.title = "Logística y Rutas | La Económica del Norte";
  }, []);
  
  // AISLAMIENTO DEL SERVICE WORKER
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/rutas' })
        .then(reg => console.log('SW Rutas aislado con éxito:', reg.scope))
        .catch(err => console.error('Error SW Rutas:', err));
    }
  }, []);

  // LÓGICA DE NOTIFICACIONES IMSS
  useEffect(() => {
    const verificarFechaIMSS = () => {
      const hoy = new Date();
      const año = hoy.getFullYear();
      const mes = hoy.getMonth();      // 0 a 11
      const diaActual = hoy.getDate(); // 1 a 31
      
      // 1. Calcular el día exacto de la Fase 1 (Preventiva)
      const fecha17 = new Date(año, mes, 17);
      const diaSemanaDel17 = fecha17.getDay(); // 0 = Domingo, 6 = Sábado

      let diaPreventivo = 15; // Por defecto 2 días antes
      if (diaSemanaDel17 === 6) {
        diaPreventivo = 16; // Si el 17 es Sábado, el preventivo es Viernes 16
      } else if (diaSemanaDel17 === 0) {
        diaPreventivo = 15; // Si el 17 es Domingo, el preventivo es Viernes 15
      }

      // 2. Definir las claves de memoria para las 3 fases independientes
      const memFase1 = `imss_${mes}_${año}_fase1_prev`;
      const memFase2 = `imss_${mes}_${año}_fase2_ofic`;
      const memFase3 = `imss_${mes}_${año}_fase3_post`;

      const notificadoFase1 = localStorage.getItem(memFase1);
      const notificadoFase2 = localStorage.getItem(memFase2);
      const notificadoFase3 = localStorage.getItem(memFase3);

      // Función auxiliar para disparar la notificación nativa
      const lanzarNotificacionNativa = (titulo, mensaje) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(titulo, { body: mensaje, icon: "/icons/logistica-192.png" });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
              new Notification(titulo, { body: mensaje, icon: "/icons/logistica-192.png" });
            }
          });
        }
      };

      // ==========================================
      // DISPAROS DE LAS 3 FASES
      // ==========================================

      // FASE 1: PREVENTIVA (Abre el día preventivo y dura hasta el 16)
      if (diaActual >= diaPreventivo && diaActual < 17 && !notificadoFase1) {
        const msg = "Aviso Preventivo: El corte del IMSS es este mes. Ve preparando los archivos para subirlos.";
        lanzarNotificacionNativa("⏳ Preventivo IMSS", msg);
        alert(`⚠️ ATENCIÓN LOGÍSTICA (FASE 1):\n${msg}`);
        localStorage.setItem(memFase1, 'true');
      }
      
      // FASE 2: OFICIAL (Abre el mero día 17 y dura hasta el 18)
      else if (diaActual >= 17 && diaActual <= 18 && !notificadoFase2) {
        const msg = "Día Oficial: Hoy se deben subir los archivos del IMSS del mes. Por favor confirma que se realice.";
        lanzarNotificacionNativa("🚨 Día Oficial IMSS", msg);
        alert(`⚠️ ATENCIÓN LOGÍSTICA (FASE 2):\n${msg}`);
        localStorage.setItem(memFase2, 'true');
      }

      // FASE 3: POST-AVISO DE AUDITORÍA (Abre el día 19 y dura hasta el 21)
      else if (diaActual >= 19 && diaActual <= 21 && !notificadoFase3) {
        const msg = "Verificación de Retardo: Han pasado los días de carga del IMSS. ¿Verificaste que los archivos sí se hayan subido correctamente?";
        lanzarNotificacionNativa("📌 Verificación IMSS", msg);
        alert(`⚠️ ATENCIÓN LOGÍSTICA (FASE 3 - RETARDO):\n${msg}`);
        localStorage.setItem(memFase3, 'true');
      }
    };

    // 🚨 AQUÍ SE EJECUTA LA FUNCIÓN AL CARGAR LA VISTA 🚨
    verificarFechaIMSS();
  }, []);

  const listaPedidos = Array.isArray(pedidos) ? pedidos : [];

  const pedidosFiltrados = listaPedidos.filter(p => {
    const matchesBusqueda = 
        p.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.folio_pedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.folio_factura?.toLowerCase().includes(busqueda.toLowerCase());
        
    if (!matchesBusqueda) return false;

    if (filtro === 'todos') return true;
    if (filtro === 'activos') return p.estado === 'pendiente' || p.estado === 'camino';
    if (filtro === 'rampa') return p.estado === 'camino' && !p.fecha_salida;
    if (filtro === 'ruta') return p.estado === 'camino' && p.fecha_salida;
    return p.estado === filtro;
  });
  
  return (
    <div className="relative h-[100dvh] w-full bg-slate-100 overflow-hidden flex font-sans">
      
      {/* CORRECCIÓN MÓVIL: 
        En pantallas chicas (lg para abajo), es 'absolute' y flota sobre el mapa.
        En pantallas grandes (lg), es 'relative' y toma su propio espacio.
      */}
      <div className={`transition-transform duration-300 ease-out h-full z-[40] absolute lg:relative lg:translate-x-0 w-[85%] sm:w-[350px] lg:w-[380px] ${sidebarAbierto ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarDispatcher 
            pedidosFiltrados={pedidosFiltrados} 
            filtro={filtro}
            setFiltro={setFiltro}
            viajeSeleccionado={viajeSeleccionado}
            setViajeSeleccionado={setViajeSeleccionado}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            onOpenForm={() => { setOrdenAEditar(null); setModalOrdenAbierto(true); }} 
            onOpenAdmin={() => setModalAdminAbierto(true)} 
            onOpenBitacora={() => setModalBitacoraAbierto(true)}
            onToggleSidebar={() => setSidebarAbierto(false)} 
          />
      </div>

      {/* OVERLAY OSCURO SOLO PARA MÓVILES CUANDO EL SIDEBAR ESTÁ ABIERTO */}
      {sidebarAbierto && (
        <div onClick={() => setSidebarAbierto(false)} className="absolute inset-0 bg-slate-900/20 z-[30] lg:hidden"></div>
      )}

      {/* BOTÓN HAMBURGUESA (Solo sale si el sidebar está cerrado) */}
      {!sidebarAbierto && (
          <button 
            onClick={() => setSidebarAbierto(true)}
            className="absolute top-4 left-4 z-[35] w-12 h-12 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 transition-all border border-slate-200"
          >
            <i className="fas fa-bars text-lg"></i>
          </button>
      )}

      <DetalleDrawer 
        pedidoSeleccionado={viajeSeleccionado}
        onClose={() => setViajeSeleccionado(null)}
        onEdit={(pedido) => { setOrdenAEditar(pedido); setModalOrdenAbierto(true); }}
      />

      <div className="flex-1 h-full z-[10] relative">
        <MapaLogistico 
            pedidos={pedidosFiltrados} 
            pedidoSeleccionado={viajeSeleccionado} 
            setViajeSeleccionado={setViajeSeleccionado} 
            sidebarAbierto={sidebarAbierto}
        />
      </div>

      <FormularioOrden 
        isOpen={modalOrdenAbierto} 
        onClose={() => { setModalOrdenAbierto(false); setOrdenAEditar(null); }} 
        ordenAEditar={ordenAEditar}
      />
      
      <ModalAdmin isOpen={modalAdminAbierto} onClose={() => setModalAdminAbierto(false)} />
      <ModalBitacora isOpen={modalBitacoraAbierto} onClose={() => setModalBitacoraAbierto(false)} />

    </div>
  );
};

export default RutasView;
