import React, { useState, useEffect } from 'react';
import HeaderChofer from './components/HeaderChofer';
import ViajeCard from './components/ViajeCard';
import ModalesChofer from './components/ModalesChofer';
// import { db } from '../../firebase-config'; // Tu config real

export default function ChoferView() {
    // Estados principales
    const [tabActual, setTabActual] = useState('camino');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [viajes, setViajes] = useState([]); // Aquí guardarás los datos de Firebase
    const [operadorNombre, setOperadorNombre] = useState('Sin identificar');
    
    // Estados para Modales
    const [activeModal, setActiveModal] = useState('login'); // 'login', 'entrega', 'falla', 'docs', 'qr', null
    const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
    const [qrData, setQrData] = useState({ src: '', nombre: '' });

    // Detector de conexión (Offline Sync UI)
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Funciones de apertura de modales
    const openModalEntrega = (viaje) => { setViajeSeleccionado(viaje); setActiveModal('entrega'); };
    const openModalFalla = (viaje) => { setViajeSeleccionado(viaje); setActiveModal('falla'); };
    const openModalQR = (src, nombre) => { setQrData({ src, nombre }); setActiveModal('qr'); };

    // Filtrado de viajes según la pestaña activa
    const viajesFiltrados = viajes.filter(v => 
        tabActual === 'camino' ? v.estado === 'camino' : (v.estado === 'entregado' || v.estado === 'fallido')
    );

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden text-slate-800 bg-slate-100 font-['Plus_Jakarta_Sans']">
            
            <HeaderChofer 
                isOffline={isOffline}
                operadorNombre={operadorNombre}
                tabActual={tabActual}
                setTabActual={setTabActual}
                openDocs={() => setActiveModal('docs')}
                onLogout={() => { setActiveModal('login'); setOperadorNombre('Sin identificar'); }}
                countCamino={viajes.filter(v => v.estado === 'camino').length}
                countEntregado={viajes.filter(v => v.estado === 'entregado' || v.estado === 'fallido').length}
            />

            <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 hide-scroll">
                {viajes.length === 0 && activeModal !== 'login' ? (
                    <div className="text-center py-20 text-slate-400">
                        <i className="fas fa-spinner fa-spin text-3xl mb-2"></i><br/>Cargando ruta...
                    </div>
                ) : viajesFiltrados.length === 0 && activeModal !== 'login' ? (
                    <div className="text-center py-20 text-slate-400 font-bold">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 text-slate-400">
                            <i className={`fas ${tabActual === 'camino' ? 'fa-mug-hot' : 'fa-inbox'}`}></i>
                        </div> 
                        Nada por aquí.
                    </div>
                ) : (
                    viajesFiltrados.map((viaje, idx) => (
                        <ViajeCard 
                            key={viaje.id || idx} 
                            viaje={viaje} 
                            index={idx}
                            onEntregar={() => openModalEntrega(viaje)}
                            onFalla={() => openModalFalla(viaje)}
                            onVerQR={() => openModalQR(viaje.qr_imagen, viaje.cliente_nombre)}
                        />
                    ))
                )}
            </main>

            <ModalesChofer 
                activeModal={activeModal}
                setActiveModal={setActiveModal}
                viajeSeleccionado={viajeSeleccionado}
                qrData={qrData}
                setOperadorNombre={setOperadorNombre}
            />
        </div>
    );
}