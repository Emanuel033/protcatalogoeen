import React from 'react';

export default function HeaderChofer({ isOffline, operadorNombre, tabActual, setTabActual, openDocs, onLogout, countCamino, countEntregado }) {
    return (
        <header className="bg-slate-900 text-white pt-safe border-b border-slate-800 shrink-0 z-20 shadow-md">
            {isOffline && (
                <div className="bg-red-600 text-white text-center text-[10px] font-black py-1 uppercase tracking-wider shadow-inner z-50">
                    <i className="fas fa-wifi"></i> Modo Sin Conexión - Las entregas se guardarán localmente
                </div>
            )}
            
            <div className="px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-inner font-black text-xl">
                        <i className="fas fa-truck"></i>
                    </div>
                    <div>
                        <h1 className="font-black text-lg leading-tight">Ruta EEN</h1>
                        <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">{operadorNombre}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={openDocs} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow-sm" title="Descargar IMSS / SUA">
                        <i className="fas fa-folder-open"></i>
                    </button>
                    <button onClick={onLogout} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors">
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
            
            <div className="flex px-2 pb-2 gap-2">
                <button onClick={() => setTabActual('camino')} className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-sm transition ${tabActual === 'camino' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <i className="fas fa-box-open mr-1"></i> Por Entregar ({countCamino})
                </button>
                <button onClick={() => setTabActual('entregado')} className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${tabActual === 'entregado' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <i className="fas fa-check-double mr-1"></i> Completados ({countEntregado})
                </button>
            </div>
        </header>
    );
}