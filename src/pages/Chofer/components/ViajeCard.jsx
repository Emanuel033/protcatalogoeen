import React from 'react';

export default function ViajeCard({ viaje, index, onEntregar, onFalla, onVerQR }) {
    const esUrgente = viaje.urgente === true;
    const docs = viaje.documentacion || {};
    
    let borderColor = 'border-slate-200';
    if(viaje.estado === 'entregado') borderColor = 'border-emerald-500';
    if(viaje.estado === 'fallido') borderColor = 'border-red-500';
    if(viaje.estado === 'camino' && esUrgente) borderColor = 'border-red-500';
    if(viaje.estado === 'camino' && !esUrgente) borderColor = 'border-blue-500';

    return (
        <div className={`card-entrega bg-white rounded-3xl p-4 shadow-sm mb-4 border-l-4 ${borderColor}`}>
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1.5">
                    <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px]">{index + 1}</span>
                    <span className="text-[9px] font-mono font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">{viaje.folio_pedido || 'S/F'}</span>
                </div>
                {esUrgente && <span className="badge-urgente text-white px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm"><i className="fas fa-fire-alt"></i> URGENTE</span>}
            </div>
            
            <h3 className="font-black text-slate-800 text-lg leading-tight mt-2 mb-2">{viaje.cliente_nombre}</h3>
            
            {viaje.destino_alias && (
                <div className="bg-blue-50 text-blue-800 text-xs font-black px-2 py-1.5 rounded-lg mb-2 flex items-center gap-1.5">
                    <i className="fas fa-warehouse text-blue-500"></i> {viaje.destino_alias}
                </div>
            )}
            
            <p className="text-[11px] font-semibold text-slate-600 leading-snug"><i className="fas fa-map-marker-alt text-red-500 mr-1"></i> {viaje.direccion}</p>
            
            <div className="flex gap-2 mt-3">
                {viaje.telefono_contacto && (
                    <a href={`tel:${viaje.telefono_contacto}`} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition">
                        <i className="fas fa-phone"></i> Llamar
                    </a>
                )}
                <a href={viaje.link_maps || `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(viaje.direccion)}`} target="_blank" rel="noreferrer" className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition">
                    <i className="fas fa-map-marked-alt"></i> Navegar
                </a>
            </div>

            {viaje.qr_imagen && (
                <button onClick={onVerQR} className="w-full mt-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition">
                    <i className="fas fa-qrcode text-lg"></i> Ver QR de Acceso en Pantalla
                </button>
            )}

            {/* Botones Finales según estado */}
            {viaje.estado === 'camino' ? (
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button onClick={onFalla} className="flex-[1] bg-red-100 text-red-600 font-bold py-3.5 rounded-xl text-sm transition active:scale-95">
                        <i className="fas fa-exclamation-triangle"></i> Problema
                    </button>
                    <button onClick={onEntregar} className="flex-[2] bg-emerald-500 text-white font-black py-3.5 rounded-xl text-lg shadow-lg shadow-emerald-500/30 transition active:scale-95">
                        <i className="fas fa-check-circle"></i> Entregar
                    </button>
                </div>
            ) : viaje.estado === 'entregado' ? (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center text-emerald-600 font-black text-sm">
                    <i className="fas fa-check-double text-xl mb-1 block"></i> Entregado con éxito
                </div>
            ) : (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center text-red-500 font-black text-sm">
                    <i className="fas fa-times-circle text-xl mb-1 block"></i> Reportado con falla
                    <p className="text-[10px] text-red-400 font-medium mt-1">"{viaje.motivo_falla}"</p>
                </div>
            )}
        </div>
    );
}