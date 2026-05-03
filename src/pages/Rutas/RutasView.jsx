import React, { useState } from 'react';
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
  const [sidebarAbierto, setSidebarAbierto] = useState(true); // <-- ESTADO PARA COLAPSAR
  const [busqueda, setBusqueda] = useState(''); // <-- ESTADO PARA EL BUSCADOR

  const [modalOrdenAbierto, setModalOrdenAbierto] = useState(false);
  const [modalAdminAbierto, setModalAdminAbierto] = useState(false);
  const [modalBitacoraAbierto, setModalBitacoraAbierto] = useState(false);
  const [ordenAEditar, setOrdenAEditar] = useState(null);

  const listaPedidos = Array.isArray(pedidos) ? pedidos : [];
  
  // FILTRADO COMBINADO (Estado + Buscador)
  const pedidosFiltrados = listaPedidos.filter(p => {
    // Primero filtramos por búsqueda (Nombre o Folios)
    const matchesBusqueda = 
        p.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.folio_pedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.folio_factura?.toLowerCase().includes(busqueda.toLowerCase());

    if (!matchesBusqueda) return false;

    // Luego filtramos por la pestaña activa
    if (filtro === 'todos') return true;
    if (filtro === 'activos') return p.estado === 'pendiente' || p.estado === 'camino';
    if (filtro === 'rampa') return p.estado === 'camino' && !p.fecha_salida;
    if (filtro === 'camino') return p.estado === 'camino' && p.fecha_salida;
    return p.estado === filtro;
  });

  return (
    <div className="relative h-screen w-full bg-slate-100 overflow-hidden flex font-sans">
      
      {/* SIDEBAR CON LÓGICA DE CIERRE */}
      <div className={`transition-all duration-300 ease-in-out h-full z-20 ${sidebarAbierto ? 'w-[350px] lg:w-[380px]' : 'w-0 -translate-x-full'}`}>
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
            onToggleSidebar={() => setSidebarAbierto(false)} // <-- FUNCIÓN PARA CERRAR
          />
      </div>

      {/* BOTÓN HAMBURGUESA (Solo sale si el sidebar está cerrado) */}
      {!sidebarAbierto && (
          <button 
            onClick={() => setSidebarAbierto(true)}
            className="absolute top-4 left-4 z-30 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all border border-slate-200"
          >
            <i className="fas fa-bars"></i>
          </button>
      )}

      <DetalleDrawer 
        pedidoSeleccionado={viajeSeleccionado}
        onClose={() => setViajeSeleccionado(null)}
        onEdit={(pedido) => { setOrdenAEditar(pedido); setModalOrdenAbierto(true); }}
      />

      <div className="flex-1 h-full z-0 relative">
        <MapaLogistico 
            pedidos={pedidosFiltrados} 
            pedidoSeleccionado={viajeSeleccionado} 
            setViajeSeleccionado={setViajeSeleccionado} 
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