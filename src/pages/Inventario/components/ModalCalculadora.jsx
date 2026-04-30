import React, { useState, useEffect } from 'react';

const ModalCalculadora = ({ isOpen, onClose, onAplicar, tituloTarget }) => {
  const [modo, setModo] = useState('bloque'); // bloque, cama, visual, 3d
  
  // Estados comunes
  const [niveles, setNiveles] = useState('');
  const [ajuste, setAjuste] = useState(0);
  const [tarimas, setTarimas] = useState(1);
  
  // Estados específicos
  const [frente, setFrente] = useState('');
  const [fondo, setFondo] = useState('');
  const [pzCama, setPzCama] = useState('');
  
  // Visual
  const [formaVisual, setFormaVisual] = useState('circulo');
  const [piezasVisuales, setPiezasVisuales] = useState([]);

  // Resetear todo cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setNiveles(''); setAjuste(0); setTarimas(1);
      setFrente(''); setFondo(''); setPzCama('');
      setPiezasVisuales([]); setModo('bloque');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ==========================================
  // MOTOR MATEMÁTICO EN TIEMPO REAL
  // ==========================================
  let subtotal = 0;
  const n = parseInt(niveles) || 0;
  const t = parseInt(tarimas) || 1;
  const a = parseInt(ajuste) || 0;

  if (modo === 'bloque') {
    subtotal = (parseInt(frente) || 0) * (parseInt(fondo) || 0) * n;
  } else if (modo === 'cama') {
    subtotal = (parseInt(pzCama) || 0) * n * t;
  } else if (modo === 'visual') {
    subtotal = piezasVisuales.length * n * t;
  }
  const totalCalculado = Math.max(0, subtotal + a);

  // ==========================================
  // LÓGICA DEL LIENZO
  // ==========================================
  const agregarPiezaVisual = () => {
    const nuevaPieza = {
      id: Date.now(), forma: formaVisual,
      left: Math.floor(Math.random() * 80) + '%',
      top: Math.floor(Math.random() * 80) + '%'
    };
    setPiezasVisuales([...piezasVisuales, nuevaPieza]);
  };

  const eliminarPiezaVisual = (id) => {
    setPiezasVisuales(piezasVisuales.filter(p => p.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-2 md:p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden my-auto">
        
        {/* HEADER MODAL */}
        <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div>
            <h3 className="font-black text-lg text-white">Calculadora</h3>
            <p className="text-xs text-blue-400 font-bold truncate max-w-[200px]">{tituloTarget}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="p-4 md:p-5 space-y-4">
          {/* TABS */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 overflow-x-auto custom-scroll">
            <button onClick={() => setModo('bloque')} className={`flex-1 min-w-[70px] py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition ${modo === 'bloque' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Bloque</button>
            <button onClick={() => setModo('cama')} className={`flex-1 min-w-[70px] py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition ${modo === 'cama' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Cama</button>
            <button onClick={() => setModo('visual')} className={`flex-1 min-w-[70px] py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition ${modo === 'visual' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Lienzo</button>
            <button onClick={() => setModo('3d')} className={`flex-1 min-w-[70px] py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition shadow-[0_0_10px_rgba(168,85,247,0.4)] ${modo === '3d' ? 'bg-purple-600 text-white' : 'text-purple-400 border border-purple-900/50'}`}><i className="fas fa-cube mr-1"></i>3D</button>
          </div>

          {/* ZONAS DINÁMICAS */}
          {modo === 'bloque' && (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Frente</label>
                <input type="number" value={frente} onChange={e => setFrente(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl text-center font-black text-xl outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Fondo</label>
                <input type="number" value={fondo} onChange={e => setFondo(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl text-center font-black text-xl outline-none focus:border-blue-500" />
              </div>
            </div>
          )}

          {modo === 'cama' && (
            <div className="grid grid-cols-1 gap-3 text-center">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Pz por Cama (Patrón)</label>
                <input type="number" value={pzCama} onChange={e => setPzCama(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-amber-400 p-3 rounded-xl text-center font-black text-xl outline-none focus:border-blue-500" />
              </div>
            </div>
          )}

          {modo === 'visual' && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button onClick={agregarPiezaVisual} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-2.5 rounded-xl text-[11px] uppercase tracking-wider transition shadow-lg flex justify-center items-center gap-2">
                  <i className="fas fa-plus-circle"></i> Añadir Envase
                </button>
                <button onClick={() => setPiezasVisuales([])} className="w-12 bg-slate-700 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm transition">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
              
              <div className="w-full h-44 border-2 border-dashed border-slate-600 rounded-xl relative overflow-hidden bg-slate-900/50">
                 {/* Mini Lienzo de React */}
                 {piezasVisuales.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => eliminarPiezaVisual(p.id)}
                      className="absolute w-8 h-8 bg-blue-600 border-2 border-blue-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg cursor-pointer hover:bg-red-500"
                      style={{ left: p.left, top: p.top }}
                    >
                      <i className="fas fa-times opacity-0 hover:opacity-100"></i>
                    </div>
                 ))}
                 {piezasVisuales.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-bold uppercase text-center">Toca 'Añadir' para simular<br/>Toca el envase para borrar</p>}
              </div>
            </div>
          )}

          {modo === '3d' && (
            <div className="w-full h-44 border border-purple-900/50 bg-purple-900/10 rounded-xl flex flex-col items-center justify-center text-center p-4">
              <i className="fas fa-cube text-4xl text-purple-500 mb-2 animate-bounce"></i>
              <p className="text-purple-400 font-bold text-sm">Motor 3D en construcción</p>
              <p className="text-xs text-slate-500 mt-1">Aquí vivirá el render interactivo.</p>
            </div>
          )}

          {/* TARIMAS (Solo para Cama, Visual y 3D) */}
          {['cama', 'visual', '3d'].includes(modo) && (
            <div className="text-center mt-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
              <label className="block text-[10px] font-bold text-purple-400 uppercase mb-2">Tarimas Hacia Atrás (Fondo)</label>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setTarimas(Math.max(1, tarimas - 1))} className="w-10 h-10 rounded-lg bg-slate-700 text-white"><i className="fas fa-minus"></i></button>
                <input type="number" value={tarimas} onChange={e => setTarimas(Math.max(1, parseInt(e.target.value)||1))} className="w-16 bg-slate-900 border border-slate-700 text-purple-400 p-2 rounded-xl text-center font-black text-xl outline-none" />
                <button onClick={() => setTarimas(tarimas + 1)} className="w-10 h-10 rounded-lg bg-slate-700 text-white"><i className="fas fa-plus"></i></button>
              </div>
            </div>
          )}

          {/* NIVELES Y AJUSTE CONSTANTES */}
          <div className="grid grid-cols-2 gap-3 text-center border-t border-slate-700 pt-4 mt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Niveles (Capas)</label>
              <input type="number" value={niveles} onChange={e => setNiveles(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-blue-400 p-3 rounded-xl text-center font-black text-xl outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Ajuste (+/-)</label>
              <input type="number" value={ajuste} onChange={e => setAjuste(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-emerald-400 p-3 rounded-xl text-center font-black text-xl outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* TOTAL EN VIVO */}
          <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-2xl text-center mt-2 flex justify-between items-center px-6 shadow-inner">
            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Total Estimado</p>
            <p className="text-4xl font-black text-white">{totalCalculado}</p>
          </div>

        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="p-4 bg-slate-900/50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-2xl text-sm transition">Cancelar</button>
          <button onClick={() => { onAplicar(totalCalculado); onClose(); }} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 text-sm transition">Sumar al Conteo</button>
        </div>

      </div>
    </div>
  );
};

export default ModalCalculadora;