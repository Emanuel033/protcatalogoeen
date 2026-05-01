import React, { useState, useEffect } from 'react';
import Estiba3D from './Estiba3D';

// ==========================================
// SUB-COMPONENTE: PIEZA ARRASTRABLE (DRAG & DROP)
// ==========================================
const PiezaArrastrable = ({ pieza, onEliminar }) => {
  const [pos, setPos] = useState({ x: pieza.x, y: pieza.y });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const handlePointerDown = (e) => {
    // Lógica de Doble Toque / Doble Clic para eliminar
    const now = Date.now();
    if (now - lastTap < 300) {
      onEliminar(pieza.id);
      return;
    }
    setLastTap(now);

    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    
    // Guardamos el punto exacto donde lo agarramos
    e.target.dataset.startX = e.clientX - pos.x;
    e.target.dataset.startY = e.clientY - pos.y;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    // Movemos la pieza restando el punto de inicio
    setPos({
      x: e.clientX - parseFloat(e.target.dataset.startX),
      y: e.clientY - parseFloat(e.target.dataset.startY)
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  // Asignamos la forma CSS correcta
  let shapeClasses = "w-[34px] h-[34px] rounded-full"; // circulo
  if (pieza.forma === 'cuadrado') shapeClasses = "w-[34px] h-[34px] rounded-[6px]";
  else if (pieza.forma === 'rectangulo-h') shapeClasses = "w-[68px] h-[34px] rounded-[6px]";
  else if (pieza.forma === 'rectangulo-v') shapeClasses = "w-[34px] h-[68px] rounded-[6px]";

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-white text-[12px] font-bold shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)] touch-none select-none transition-transform ${isDragging ? 'z-50 scale-110 opacity-90 cursor-grabbing' : 'cursor-grab'} ${shapeClasses}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, left: 0, top: 0 }}
    >
      {pieza.numero}
    </div>
  );
};

// ==========================================
// MODAL PRINCIPAL
// ==========================================
const ModalCalculadora = ({ isOpen, onClose, onAplicar, tituloTarget }) => {
  const [modo, setModo] = useState('bloque'); 
  
  const [niveles, setNiveles] = useState('');
  const [ajuste, setAjuste] = useState(0);
  const [tarimas, setTarimas] = useState(1);
  const [frente, setFrente] = useState('');
  const [fondo, setFondo] = useState('');
  const [pzCama, setPzCama] = useState('');
  
  // Estados del Lienzo Visual
  const [formaVisual, setFormaVisual] = useState('circulo');
  const [piezasVisuales, setPiezasVisuales] = useState([]);
  const [idPiezaLienzo, setIdPiezaLienzo] = useState(0); // Contador para el número de pieza

  useEffect(() => {
    if (isOpen) {
      setNiveles(''); setAjuste(0); setTarimas(1);
      setFrente(''); setFondo(''); setPzCama('');
      setPiezasVisuales([]); setIdPiezaLienzo(0); setModo('bloque');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  let subtotal = 0;
  const n = parseInt(niveles) || 0;
  const t = parseInt(tarimas) || 1;
  const a = parseInt(ajuste) || 0;

  if (modo === 'bloque') subtotal = (parseInt(frente) || 0) * (parseInt(fondo) || 0) * n;
  else if (modo === 'cama') subtotal = (parseInt(pzCama) || 0) * n * t;
  else if (modo === 'visual') subtotal = piezasVisuales.length * n * t;
  
  const totalCalculado = Math.max(0, subtotal + a);

  // ==========================================
  // LÓGICA DEL LIENZO
  // ==========================================
  const agregarPiezaVisual = () => {
    setIdPiezaLienzo(prev => prev + 1);
    const offset = Math.floor(Math.random() * 20) - 10;
    const nuevaPieza = {
      id: Date.now(), 
      forma: formaVisual,
      numero: idPiezaLienzo + 1,
      // Nacen cerca del centro del lienzo
      x: 150 + offset,
      y: 60 + offset
    };
    setPiezasVisuales([...piezasVisuales, nuevaPieza]);
  };

  const eliminarPiezaVisual = (id) => {
    setPiezasVisuales(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-2 md:p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden my-auto">
        
        <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div>
            <h3 className="font-black text-lg text-white">Calculadora de Estiba</h3>
            <p className="text-xs text-blue-400 font-bold truncate max-w-[200px]">{tituloTarget}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="p-4 md:p-5 space-y-4">
          {/* TABS */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 overflow-x-auto custom-scroll">
            <button onClick={() => setModo('bloque')} className={`flex-1 min-w-[70px] py-2.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition ${modo === 'bloque' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Bloque</button>
            <button onClick={() => setModo('cama')} className={`flex-1 min-w-[70px] py-2.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition ${modo === 'cama' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Cama</button>
            <button onClick={() => setModo('visual')} className={`flex-1 min-w-[70px] py-2.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition ${modo === 'visual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Lienzo</button>
            <button onClick={() => setModo('3d')} className={`flex-1 min-w-[70px] py-2.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition shadow-[0_0_10px_rgba(168,85,247,0.4)] ${modo === '3d' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300 border border-purple-900/50'}`}><i className="fas fa-cube mr-1"></i>3D</button>
          </div>

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
              
              {/* SELECTOR DE FORMAS RECUPERADO */}
              <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 mb-1">
                  <button onClick={() => setFormaVisual('circulo')} className={`flex-1 py-2 rounded-lg font-bold text-[10px] uppercase transition ${formaVisual === 'circulo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`} title="Círculo"><i className="fas fa-circle"></i></button>
                  <button onClick={() => setFormaVisual('cuadrado')} className={`flex-1 py-2 rounded-lg font-bold text-[10px] uppercase transition ${formaVisual === 'cuadrado' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`} title="Cuadrado"><i className="fas fa-square"></i></button>
                  <button onClick={() => setFormaVisual('rectangulo-h')} className={`flex-1 py-2 rounded-lg font-bold text-[10px] uppercase transition ${formaVisual === 'rectangulo-h' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`} title="Rectángulo Horizontal"><span className="font-black text-sm leading-none">▬</span></button>
                  <button onClick={() => setFormaVisual('rectangulo-v')} className={`flex-1 py-2 rounded-lg font-bold text-[10px] uppercase transition ${formaVisual === 'rectangulo-v' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`} title="Rectángulo Vertical"><span className="font-black text-sm leading-none">▮</span></button>
              </div>

              <div className="flex gap-2">
                <button onClick={agregarPiezaVisual} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-2.5 rounded-xl text-[11px] uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2">
                  <i className="fas fa-plus-circle"></i> Añadir Envase
                </button>
                <button onClick={() => { setPiezasVisuales([]); setIdPiezaLienzo(0); }} className="w-12 bg-slate-700 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm transition">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
              
              <div className="bg-slate-900 p-2 rounded-2xl border border-slate-700 relative">
                <p className="absolute top-2 left-0 right-0 text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center pointer-events-none z-0">Arrastra los envases<br/>Doble toque para eliminar</p>
                
                {/* EL LIENZO DONDE VIVEN LAS PIEZAS */}
                <div className="w-full h-44 border-2 border-dashed border-slate-600 rounded-xl relative overflow-hidden z-10 bg-slate-900/50 touch-none">
                   {piezasVisuales.map(p => (
                      <PiezaArrastrable key={p.id} pieza={p} onEliminar={eliminarPiezaVisual} />
                   ))}
                </div>
              </div>
            </div>
          )}

          {modo === '3d' && (
            <div className="w-full h-64 border border-purple-900/50 bg-slate-900 rounded-xl overflow-hidden relative shadow-inner">
               <Estiba3D 
                  frente={frente} 
                  fondo={fondo} 
                  niveles={niveles} 
               />
               <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-slate-400 font-bold pointer-events-none drop-shadow-md">
                 Arrastra para rotar • Pellizca para zoom
               </p>
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

          <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-2xl text-center mt-2 flex justify-between items-center px-6 shadow-inner">
            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Total Estimado</p>
            <p className="text-4xl font-black text-white">{totalCalculado}</p>
          </div>

        </div>

        <div className="p-4 bg-slate-900/50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-2xl text-sm transition">Cancelar</button>
          <button onClick={() => { onAplicar(totalCalculado); onClose(); }} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 text-sm transition">Sumar al Conteo</button>
        </div>

      </div>
    </div>
  );
};

export default ModalCalculadora;