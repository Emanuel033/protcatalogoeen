import React, { useState, useEffect } from 'react';
import Estiba3D from './Estiba3D';

// ... (PiezaArrastrable se mantiene igual, con su Snap-to-grid de 17px) ...
const PiezaArrastrable = ({ pieza, onEliminar, onMover }) => {
  const [pos, setPos] = useState({ x: pieza.x, y: pieza.y });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const handlePointerDown = (e) => {
    const now = Date.now();
    if (now - lastTap < 300) { onEliminar(pieza.id); return; }
    setLastTap(now);
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    e.target.dataset.startX = e.clientX - pos.x;
    e.target.dataset.startY = e.clientY - pos.y;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const rawX = e.clientX - parseFloat(e.target.dataset.startX);
    const rawY = e.clientY - parseFloat(e.target.dataset.startY);
    const gridSize = 17; 
    setPos({ x: Math.round(rawX / gridSize) * gridSize, y: Math.round(rawY / gridSize) * gridSize });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
    if (onMover) onMover(pieza.id, pos.x, pos.y);
  };

  let shapeClasses = "w-[34px] h-[34px] rounded-full"; 
  if (pieza.forma === 'cuadrado') shapeClasses = "w-[34px] h-[34px] rounded-[6px]";
  else if (pieza.forma === 'caja-h') shapeClasses = "w-[51px] h-[34px] rounded-[6px]"; 
  else if (pieza.forma === 'caja-v') shapeClasses = "w-[34px] h-[51px] rounded-[6px]";
  else if (pieza.forma === 'rectangulo-h') shapeClasses = "w-[68px] h-[34px] rounded-[6px]"; 
  else if (pieza.forma === 'rectangulo-v') shapeClasses = "w-[34px] h-[68px] rounded-[6px]";

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute bg-blue-600 border border-blue-400 flex items-center justify-center text-white text-[12px] font-bold shadow-lg touch-none select-none transition-transform ${isDragging ? 'z-50 scale-110 opacity-90 cursor-grabbing' : 'cursor-grab'} ${shapeClasses}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, left: 0, top: 0 }}
    >
      {pieza.numero}
    </div>
  );
};

const ModalCalculadora = ({ isOpen, onClose, onAplicar, tituloTarget, codigoItem, varIdItem }) => {
  const [modo, setModo] = useState('bloque'); 
  const [modoOrigen, setModoOrigen] = useState('bloque'); 
  const [niveles, setNiveles] = useState('');
  const [ajuste, setAjuste] = useState(0);
  const [tarimas, setTarimas] = useState(1);
  const [frente, setFrente] = useState('');
  const [fondo, setFondo] = useState('');
  const [pzCama, setPzCama] = useState('');
  const [patronIndex, setPatronIndex] = useState(0);
  const [estibaCruzada, setEstibaCruzada] = useState(false);
  const [formaVisual, setFormaVisual] = useState('cuadrado');
  const [piezasVisuales, setPiezasVisuales] = useState([]);
  const [idPiezaLienzo, setIdPiezaLienzo] = useState(0);
  const [huecos3D, setHuecos3D] = useState([]);
  const [dimsEmpaque, setDimsEmpaque] = useState([1, 1, 1]); 

  useEffect(() => {
    if (isOpen) {
      setNiveles(''); setAjuste(0); setTarimas(1); setFrente(''); setFondo(''); setPzCama('');
      setPiezasVisuales([]); setIdPiezaLienzo(0); setHuecos3D([]); setModo('bloque'); setModoOrigen('bloque'); setEstibaCruzada(false); setPatronIndex(0);
      const memKey = `een_forma_${codigoItem}_${varIdItem}`;
      const savedDims = localStorage.getItem(memKey);
      if (savedDims) setDimsEmpaque(JSON.parse(savedDims));
      else setDimsEmpaque([1, 1, 1]);
    }
  }, [isOpen, codigoItem, varIdItem]);

  if (!isOpen) return null;

  let subtotal = 0;
  const n = parseInt(niveles) || 0;
  const t = parseInt(tarimas) || 1;
  const a = parseInt(ajuste) || 0;

  if (modo === 'bloque' || (modo === '3d' && modoOrigen === 'bloque')) subtotal = (parseInt(frente) || 0) * (parseInt(fondo) || 0) * n;
  else if (modo === 'cama' || (modo === '3d' && modoOrigen === 'cama')) subtotal = (parseInt(pzCama) || 0) * n * t;
  else if (modo === 'visual' || (modo === '3d' && modoOrigen === 'visual')) subtotal = piezasVisuales.length * n * t;
  const totalCalculado = Math.max(0, subtotal + a - huecos3D.length);

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-2 md:p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden my-auto">
        
        <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div><h3 className="font-black text-lg text-white">Estiba 3D Inteligente</h3><p className="text-xs text-blue-400 font-bold truncate max-w-[200px]">{tituloTarget}</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center"><i className="fas fa-times"></i></button>
        </div>
        
        <div className="p-4 md:p-5 space-y-4">
          
          <div className="bg-slate-900 p-2 rounded-xl border border-slate-700 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Forma del Empaque (Persistente)</span>
            <div className="flex gap-1 overflow-x-auto custom-scroll pb-1">
              {[ [1,1,1,'Cubo'], [1.5,1,1,'Estandar'], [2,1,1,'Larga'], [1.5,0.6,1,'Plana'], [1,1.8,1,'Alta'] ].map(d => (
                <button key={d[3]} onClick={() => { setDimsEmpaque([d[0], d[1], d[2]]); localStorage.setItem(`een_forma_${codigoItem}_${varIdItem}`, JSON.stringify([d[0], d[1], d[2]])); }} className={`px-3 py-1.5 rounded text-[10px] font-black uppercase transition ${dimsEmpaque[0]===d[0] && dimsEmpaque[1]===d[1] ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{d[3]}</button>
              ))}
            </div>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
            {['bloque','cama','visual'].map(m => (
              <button key={m} onClick={() => { setModo(m); setModoOrigen(m); setHuecos3D([]); }} className={`flex-1 py-2.5 rounded-lg font-black text-[10px] uppercase transition ${modo === m ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>{m}</button>
            ))}
            <button onClick={() => setModo('3d')} className={`flex-1 py-2.5 rounded-lg font-black text-[10px] uppercase transition ${modo === '3d' ? 'bg-purple-600 text-white' : 'text-purple-400'}`}>3D</button>
          </div>

          {modo === 'cama' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Pz Cama</label><input type="number" value={pzCama} onChange={e => setPzCama(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-amber-400 p-3 rounded-xl text-center font-black text-xl outline-none" /></div>
              <div className="flex flex-col">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Acomodo</label>
                <button onClick={() => setPatronIndex(prev => prev + 1)} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 rounded-xl font-black text-[10px] uppercase transition flex items-center justify-center gap-2"><i className="fas fa-th"></i> Alternar</button>
              </div>
            </div>
          )}

          {modo === 'visual' && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 overflow-x-auto">
                {['cuadrado','caja-h','caja-v','rectangulo-h','rectangulo-v'].map(f => (
                  <button key={f} onClick={() => setFormaVisual(f)} className={`px-2 py-2 rounded-lg text-[9px] font-black uppercase transition ${formaVisual === f ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>{f.replace('rectangulo','Rect')}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setIdPiezaLienzo(prev => prev + 1); setPiezasVisuales([...piezasVisuales, { id: Date.now(), forma: formaVisual, numero: idPiezaLienzo + 1, x: 136, y: 51 }]); }} className="flex-1 bg-amber-500 text-slate-900 font-black py-2.5 rounded-xl text-[11px] uppercase transition shadow-lg"><i className="fas fa-plus"></i> Añadir</button>
                <button onClick={() => { setPiezasVisuales([]); setIdPiezaLienzo(0); }} className="w-12 bg-slate-700 text-white rounded-xl"><i className="fas fa-trash"></i></button>
              </div>
              <div className="bg-slate-900 p-2 rounded-2xl border border-slate-700 relative h-40 overflow-hidden" style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '17px 17px'}}>
                 {piezasVisuales.map(p => <PiezaArrastrable key={p.id} pieza={p} onEliminar={id => setPiezasVisuales(piezasVisuales.filter(x => x.id !== id))} onMover={(id,x,y) => setPiezasVisuales(piezasVisuales.map(x => x.id === id ? {...x, x, y} : x))} />)}
              </div>
            </div>
          )}

          {modo === '3d' && (
            <div className="w-full h-64 border border-purple-900/50 bg-slate-900 rounded-xl overflow-hidden relative mt-2">
               <Estiba3D modoOrigen={modoOrigen} frente={frente} fondo={fondo} niveles={niveles} pzCama={pzCama} tarimas={tarimas} piezasVisuales={piezasVisuales} huecos3D={huecos3D} onToggleHueco={id => setHuecos3D(huecos3D.includes(id) ? huecos3D.filter(h => h !== id) : [...huecos3D, id])} estibaCruzada={estibaCruzada} dimsEmpaque={dimsEmpaque} patronIndex={patronIndex} />
               <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-slate-400 font-bold">Toca para marcar huecos • Doble dedo para rotar</p>
            </div>
          )}

          {modo === '3d' && (
             <div className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 p-3 rounded-xl cursor-pointer" onClick={() => setEstibaCruzada(!estibaCruzada)}>
               <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${estibaCruzada ? 'bg-purple-500' : 'bg-slate-900 border border-slate-600'}`}>{estibaCruzada && <i className="fas fa-check text-white text-xs"></i>}</div>
               <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Amarre de Seguridad (Estiba Cruzada)</span>
             </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-center border-t border-slate-700 pt-4 mt-2">
            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Capas</label><input type="number" value={niveles} onChange={e => setNiveles(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-blue-400 p-3 rounded-xl text-center font-black text-xl outline-none" /></div>
            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Ajuste</label><input type="number" value={ajuste} onChange={e => setAjuste(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-emerald-400 p-3 rounded-xl text-center font-black text-xl outline-none" /></div>
          </div>

          <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-2xl text-center mt-2 flex justify-between items-center px-6">
            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Total Estimado</p>
            <p className="text-4xl font-black text-white">{totalCalculado}{huecos3D.length > 0 && <span className="text-sm text-red-400 ml-2">(-{huecos3D.length})</span>}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-700 text-slate-300 font-bold rounded-2xl text-sm">Cancelar</button>
          <button onClick={() => { onAplicar(totalCalculado); onClose(); }} className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg text-sm">Sumar Conteo</button>
        </div>
      </div>
    </div>
  );
};

export default ModalCalculadora;