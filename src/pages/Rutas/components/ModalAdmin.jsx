import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useLogistica } from '../context/LogisticaContext';

const ModalAdmin = ({ isOpen, onClose }) => {
  const { choferes, flota } = useLogistica(); // Usamos el contexto para leer la lista en tiempo real
  const [pestanaActiva, setPestanaActiva] = useState('choferes');
  
  // Estados para Docs Legales
  const [docsData, setDocsData] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [archivos, setArchivos] = useState({ imss: null, sua: null, otros: null });

  // Estados para Choferes
  const [nuevoChofer, setNuevoChofer] = useState('');
  
  // Estados para Flota
  const [nuevaFlota, setNuevaFlota] = useState({ nombre: '', pesado: false });

  useEffect(() => {
    if (isOpen && pestanaActiva === 'docs') cargarDocsGuardados();
  }, [isOpen, pestanaActiva]);

  // ================= LÓGICA DOCS LEGALES =================
  const cargarDocsGuardados = async () => {
    try {
      const docRef = doc(db, 'configuracion', 'docs_legales');
      const snap = await getDoc(docRef);
      if (snap.exists()) setDocsData(snap.data());
    } catch (error) { console.error(error); }
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleSubirDocumentos = async () => {
    setLoadingDocs(true);
    let payload = { fecha_actualizacion: serverTimestamp() };
    try {
      if (archivos.imss) payload.imss_pdf = await toBase64(archivos.imss);
      if (archivos.sua) payload.sua_pdf = await toBase64(archivos.sua);
      if (archivos.otros) payload.otros_pdf = await toBase64(archivos.otros);
      await setDoc(doc(db, 'configuracion', 'docs_legales'), payload, { merge: true });
      alert("Documentos actualizados");
      setArchivos({ imss: null, sua: null, otros: null });
      cargarDocsGuardados();
    } catch (error) {
      alert("Error al subir. Intenta con archivos más ligeros.");
    } finally {
      setLoadingDocs(false);
    }
  };

  // ================= LÓGICA CHOFERES =================
  const handleAgregarChofer = async () => {
    if (!nuevoChofer.trim()) return;
    try {
      await addDoc(collection(db, 'choferes'), { nombre: nuevoChofer, fecha_creacion: serverTimestamp() });
      setNuevoChofer('');
    } catch (error) { console.error("Error agregando chofer:", error); }
  };

  const handleEliminarChofer = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este chofer?")) {
      try { await deleteDoc(doc(db, 'choferes', id)); } 
      catch (error) { console.error("Error eliminando chofer:", error); }
    }
  };

  // ================= LÓGICA FLOTA =================
  const handleAgregarFlota = async () => {
    if (!nuevaFlota.nombre.trim()) return;
    try {
      await addDoc(collection(db, 'flota'), { nombre: nuevaFlota.nombre, pesado: nuevaFlota.pesado, fecha_creacion: serverTimestamp() });
      setNuevaFlota({ nombre: '', pesado: false });
    } catch (error) { console.error("Error agregando vehículo:", error); }
  };

  const handleEliminarFlota = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este vehículo?")) {
      try { await deleteDoc(doc(db, 'flota', id)); } 
      catch (error) { console.error("Error eliminando vehículo:", error); }
    }
  };

  const formatearFecha = (timestamp) => timestamp ? timestamp.toDate().toLocaleDateString('es-MX') : 'Desconocida';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-slate-50 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-auto sm:max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
          <h3 className="font-black flex items-center gap-2">
            <i className="fas fa-cogs text-slate-400"></i> Administración General
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-white/10 w-7 h-7 rounded-full flex items-center justify-center transition">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* TABS */}
        <div className="flex bg-white border-b border-slate-200 shrink-0 pt-2 px-4 gap-4">
          <button onClick={() => setPestanaActiva('choferes')} className={`pb-3 text-xs font-black uppercase tracking-wide flex items-center gap-2 border-b-2 transition-colors ${pestanaActiva === 'choferes' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <i className="fas fa-user-tie"></i> Choferes
          </button>
          <button onClick={() => setPestanaActiva('flota')} className={`pb-3 text-xs font-black uppercase tracking-wide flex items-center gap-2 border-b-2 transition-colors ${pestanaActiva === 'flota' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <i className="fas fa-truck"></i> Flota
          </button>
          <button onClick={() => setPestanaActiva('docs')} className={`pb-3 text-xs font-black uppercase tracking-wide flex items-center gap-2 border-b-2 transition-colors ${pestanaActiva === 'docs' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <i className="fas fa-file-contract"></i> Docs Legales
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scroll flex-1 bg-white">
          
          {/* PESTAÑA CHOFERES */}
          {pestanaActiva === 'choferes' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-6">
                <input type="text" value={nuevoChofer} onChange={(e) => setNuevoChofer(e.target.value)} placeholder="Nombre completo del Chofer" className="flex-1 border border-slate-300 rounded-xl p-3 text-sm font-semibold outline-none focus:border-blue-500" />
                <button onClick={handleAgregarChofer} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition whitespace-nowrap">
                  + Agregar
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-black uppercase">
                    <tr><th className="px-4 py-3">Operador</th><th className="px-4 py-3 text-right">Acción</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {choferes.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-700 flex items-center gap-2"><i className="fas fa-user-circle text-blue-500"></i> {c.nombre}</td>
                        <td className="px-4 py-3 text-right"><button onClick={() => handleEliminarChofer(c.id)} className="text-red-400 hover:text-red-600 bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center ml-auto"><i className="fas fa-trash-alt"></i></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PESTAÑA FLOTA */}
          {pestanaActiva === 'flota' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Identificador / Placas *</label>
                  <input type="text" value={nuevaFlota.nombre} onChange={(e) => setNuevaFlota({...nuevaFlota, nombre: e.target.value})} placeholder="Ej. Camión 1 (NLR 05)" className="w-full border border-slate-300 rounded-xl p-3 text-sm font-semibold outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tipo de Unidad *</label>
                  <select value={nuevaFlota.pesado ? 'pesado' : 'ligero'} onChange={(e) => setNuevaFlota({...nuevaFlota, pesado: e.target.value === 'pesado'})} className="w-full border border-slate-300 rounded-xl p-3 text-sm font-semibold outline-none focus:border-blue-500 bg-white">
                    <option value="ligero">🚛 Ligero (Redilas/Van)</option>
                    <option value="pesado">🚚 Pesado (Camión/Torton)</option>
                  </select>
                </div>
                <div className="col-span-3 flex justify-end">
                   <button onClick={handleAgregarFlota} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition">
                    + Agregar Unidad
                  </button>
                </div>
              </div>
              
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-black uppercase">
                    <tr><th className="px-4 py-3">Vehículo</th><th className="px-4 py-3 text-right">Acción</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {flota.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-700 flex items-center gap-2">
                          <i className={`fas ${f.pesado ? 'fa-truck-moving text-purple-600' : 'fa-truck text-slate-400'}`}></i> 
                          {f.nombre}
                          <span className={`text-[8px] px-2 py-0.5 rounded-md font-black uppercase ${f.pesado ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>{f.pesado ? 'Pesado' : 'Ligero'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEliminarFlota(f.id)} className="text-red-400 hover:text-red-600 bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center ml-auto"><i className="fas fa-trash-alt"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PESTAÑA DOCS LEGALES (Idéntico al mensaje anterior) */}
          {pestanaActiva === 'docs' && (
            <div className="space-y-4">
               {['imss', 'sua', 'otros'].map((docType) => (
                 <div key={docType} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">Comprobante {docType.toUpperCase()} (PDF / Imagen)</label>
                    <input type="file" onChange={(e) => setArchivos({...archivos, [docType]: e.target.files[0]})} className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-700 cursor-pointer" />
                    <div className="text-[10px] text-slate-500 mt-2 font-medium">
                      {docsData?.[`${docType}_pdf`] ? <span className="text-emerald-500 font-bold"><i className="fas fa-check"></i> Subido ({formatearFecha(docsData.fecha_actualizacion)})</span> : (docType === 'otros' ? 'Opcional' : 'Falta archivo')}
                    </div>
                 </div>
               ))}
               <button onClick={handleSubirDocumentos} disabled={loadingDocs} className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 text-sm">
                  {loadingDocs ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-cloud-upload-alt mr-1"></i> Subir y Actualizar Documentos</>}
               </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ModalAdmin;