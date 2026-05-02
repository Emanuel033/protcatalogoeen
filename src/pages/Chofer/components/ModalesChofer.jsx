import React, { useRef, useState } from 'react';

export default function ModalesChofer({ activeModal, setActiveModal, viajeSeleccionado, qrData, setOperadorNombre }) {
    
    const closeModal = () => setActiveModal(null);
    const handleLogin = () => {
        setOperadorNombre("Emanuel Badillo"); // Simulación. Aquí leerás de tu DB
        closeModal();
    };

    // Componente interno para inputs de foto (Maneja la vista previa con URL.createObjectURL)
    const PhotoInput = ({ id, label, icon, colorClass }) => {
        const [preview, setPreview] = useState(null);
        const fileInputRef = useRef(null);

        const handleFileChange = (e) => {
            if (e.target.files && e.target.files[0]) {
                const objectUrl = URL.createObjectURL(e.target.files[0]);
                setPreview(objectUrl);
            }
        };

        const triggerCamera = (capture) => {
            if(capture) fileInputRef.current.setAttribute('capture', 'environment');
            else fileInputRef.current.removeAttribute('capture');
            fileInputRef.current.click();
        };

        return (
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-3 text-center relative overflow-hidden group">
                <label className={`block text-[11px] font-black uppercase tracking-wider mb-2 ${colorClass}`}>
                    <i className={`fas ${icon} mr-1`}></i> {label}
                </label>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                
                <div className={`foto-preview w-full h-32 bg-slate-100 rounded-xl border-2 bg-cover bg-center flex flex-col justify-end p-2 mb-3 ${preview ? 'has-image border-emerald-500' : 'border-transparent'}`} style={{ backgroundImage: preview ? `url(${preview})` : 'none' }}>
                    {preview && <span className="bg-emerald-500 text-white text-[11px] font-black py-1.5 px-3 rounded-lg shadow-lg self-center transition transform scale-105"><i className="fas fa-check-circle mr-1"></i> ¡Foto Lista!</span>}
                </div>

                <div className="flex gap-2">
                    <button type="button" onClick={() => triggerCamera(true)} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition"><i className="fas fa-camera mr-1 text-blue-400"></i> Cámara</button>
                    <button type="button" onClick={() => triggerCamera(false)} className="flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-xl shadow-sm transition"><i className="fas fa-images mr-1 text-indigo-500"></i> Galería</button>
                </div>
            </div>
        );
    };

    if (!activeModal) return null;

    return (
        <>
            {/* MODAL DE LOGIN */}
            {activeModal === 'login' && (
                <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col p-6">
                    <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
                        <div className="w-24 h-24 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-5xl mb-8 mx-auto shadow-2xl shadow-blue-600/30 transform rotate-3">
                            <i className="fas fa-steering-wheel"></i>
                        </div>
                        <h2 className="text-3xl font-black text-white text-center mb-2">Mi Ruta</h2>
                        <div className="bg-slate-800 rounded-3xl p-5 shadow-xl border border-slate-700 mt-8">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Operador / Chofer</label>
                            <select className="w-full bg-slate-900 border border-slate-700 text-white text-lg font-bold p-4 rounded-xl outline-none focus:border-blue-500 mb-6 appearance-none text-center">
                                <option value="1">Emanuel Badillo (Demo)</option>
                            </select>
                            <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 text-lg flex items-center justify-center gap-2">
                                Iniciar Ruta <i className="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ENTREGA */}
            {activeModal === 'entrega' && (
                <div className="fixed inset-0 bg-slate-900/95 z-[50] flex flex-col items-center justify-end p-2 sm:p-4 backdrop-blur-md">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50 rounded-t-3xl shrink-0">
                            <h3 className="font-black text-emerald-800 flex items-center gap-2"><i className="fas fa-check-circle text-emerald-500"></i> Completar Entrega</h3>
                            <button onClick={closeModal} className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto hide-scroll flex-1 space-y-4">
                            <p className="text-sm font-bold text-slate-600 mb-4 text-center">Para cerrar este pedido es obligatorio adjuntar evidencia.</p>
                            <PhotoInput id="doc" label="1. Documento Firmado" icon="fa-file-signature" colorClass="text-blue-800" />
                            <PhotoInput id="mat" label="2. Material Físico" icon="fa-boxes" colorClass="text-amber-800" />
                        </div>
                        
                        <div className="p-4 bg-white border-t border-slate-100 shrink-0 pb-safe">
                            <button onClick={closeModal} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/30 text-lg transition active:scale-95 flex items-center justify-center gap-2">
                                <i className="fas fa-cloud-upload-alt"></i> Subir y Finalizar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE FALLA */}
            {activeModal === 'falla' && (
                <div className="fixed inset-0 bg-slate-900/95 z-[50] flex flex-col items-center justify-end p-2 sm:p-4 backdrop-blur-md">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-red-50 rounded-t-3xl shrink-0">
                            <h3 className="font-black text-red-800 flex items-center gap-2"><i className="fas fa-exclamation-triangle text-red-500"></i> Reportar Problema</h3>
                            <button onClick={closeModal} className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-4 overflow-y-auto hide-scroll flex-1">
                            <label className="block text-xs font-bold text-slate-600 mb-2">¿Qué sucedió? Describe el problema detalladamente.</label>
                            <textarea rows="3" className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-sm outline-none focus:border-red-500 mb-4" placeholder="Ej. El cliente no está..."></textarea>
                            <PhotoInput id="falla" label="Evidencia (Opcional)" icon="fa-camera" colorClass="text-slate-500" />
                        </div>
                        <div className="p-4 bg-white border-t border-slate-100 shrink-0 pb-safe">
                            <button onClick={closeModal} className="w-full bg-red-500 text-white font-black py-4 rounded-xl shadow-lg shadow-red-500/30 text-lg transition active:scale-95 flex items-center justify-center gap-2">
                                <i className="fas fa-exclamation-circle"></i> Enviar Reporte
                            </button>
                        </div>
                    </div>
                </div>
            )}

             {/* MODAL QR (Visor Básico) */}
             {activeModal === 'qr' && (
                <div className="fixed inset-0 bg-slate-900/95 z-[95] flex flex-col items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative">
                        <button onClick={closeModal} className="absolute top-4 right-4 w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center z-10">
                            <i className="fas fa-times"></i>
                        </button>
                        <div className="p-8 flex flex-col items-center">
                            <h3 className="font-black text-slate-800 text-xl mt-4">Código de Acceso</h3>
                            <div className="bg-white p-3 rounded-2xl border border-slate-100 w-full flex justify-center mt-6">
                                <img src={qrData.src} alt="QR" className="w-full max-w-[220px] object-contain" />
                            </div>
                            <div className="mt-6 font-black text-slate-700 text-center bg-slate-50 w-full py-3 px-4 rounded-xl border border-slate-100 text-sm">
                                {qrData.nombre}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}