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
      
      {/* 
        CORRECCIÓN MÓVIL: 
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