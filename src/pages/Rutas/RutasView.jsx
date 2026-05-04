import React, { useState, useEffect } from 'react'; // <-- AQUÍ AGREGAMOS useEffect
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

  // ==========================================
  // AQUÍ ESTÁ EL USE EFFECT QUE CAMBIA LA PESTAÑA
  // ==========================================
  useEffect(() => {
    document.title = "Logística y Rutas | La Económica del Norte";
  }, []);
  // ==========================================

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
    if (filtro === 'ruta') return p.estado === 'camino' && p.fecha_salida;
    return p.estado === filtro;
  });
  
  return (
    <div className="relative h-screen w-full  overflow-hidden flex font-sans">
      
      {/* SIDEBAR CON LÓGICA DE CIERRE */}
      <div className={`absolute left-0 top-0 h-full z-20 transition-all duration-500 ease-in-out ${sidebarAbierto ? 'w-[350px] lg:w-[380px]' : 'w-0 -translate-x-full'}`}>
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

      {/* BOTÓN HAMBURGUESA (Solo sale si el sidebar está cerrado) */}
      {!sidebarAbierto && (
          <button 
            onClick={() => setSidebarAbierto(true)}
            className="absolute top-4 left-4 z-30 w-12 h-12 bg-white/80 backdrop-blur-md shadow-lg rounded-full flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all border border-white"
          >
            <i className="fas fa-bars"></i>
          </button>
      )}

      <DetalleDrawer 
        pedidoSeleccionado={viajeSeleccionado}
        onClose={() => setViajeSeleccionado(null)}
        onEdit={(pedido) => { setOrdenAEditar(pedido); setModalOrdenAbierto(true); }}
      />

      <div className="absolute inset-0 z-0">
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