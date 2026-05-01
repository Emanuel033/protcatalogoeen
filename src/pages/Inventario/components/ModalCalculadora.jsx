import React, { useState, useEffect } from 'react';
import Estiba3D from './Estiba3D';

// ==========================================
// SUB-COMPONENTE: PIEZA ARRASTRABLE 
// ==========================================
const PiezaArrastrable = ({ pieza, onEliminar, onMover }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const dragRef = React.useRef({ startX: 0, startY: 0 });

  const handlePointerDown = (e) => {
    const now = Date.now();
    if (now - lastTap < 300) { onEliminar(pieza.id); return; }
    setLastTap(now);
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    dragRef.current.startX = e.clientX - pieza.x;
    dragRef.current.startY = e.clientY - pieza.y;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragRef.current.startX;
    const newY = e.clientY - dragRef.current.startY;
    onMover(pieza.id, newX, newY); 
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  let shapeClasses = "border-2 border-blue-400 bg-blue-600";
  switch (pieza.forma) {
    case 'circulo': shapeClasses += " w-[34px] h-[34px] rounded-full bg-amber-500 border-amber-300"; break;
    case 'cuadrado': shapeClasses += " w-[34px] h-[34px] rounded-[4px]"; break;
    case 'caja-h': shapeClasses += " w-[51px] h-[34px] rounded-[4px]"; break;
    case 'caja-v': shapeClasses += " w-[34px] h-[51px] rounded-[4px]"; break;
    case 'rect-h': shapeClasses += " w-[68px] h-[34px] rounded-[4px]"; break;
    case 'rect-v': shapeClasses += " w-[34px] h-[68px] rounded-[4px]"; break;
    case 'delgado-h': shapeClasses += " w-[102px] h-[34px] rounded-[4px]"; break;
    case 'delgado-v': shapeClasses += " w-[34px] h-[102px] rounded-[4px]"; break;
    default: shapeClasses += " w-[34px] h-[34px]";
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute flex items-center justify-center text-white text-[10px] font-bold shadow-md touch-none select-none transition-transform ${isDragging ? 'z-50 scale-105 opacity-90 cursor-grabbing' : 'cursor-grab'} ${shapeClasses}`}
      style={{ transform: `translate(${pieza.x}px, ${pieza.y}px)`, left: 0, top: 0 }}
    >
      {pieza.forma === 'circulo' ? '' : pieza.numero}
    </div>
  );
};

// ==========================================
// MODAL PRINCIPAL
// ==========================================
const ModalCalculadora = ({ isOpen, onClose, onAplicar, tituloTarget, codigoItem, varIdItem }) => {
  const [modo, setModo] = useState('visual'); 
  const [modoOrigen, setModoOrigen] = useState('visual'); 
  const [niveles, setNiveles] = useState('');
  const [ajuste, setAjuste] = useState(0);
  const [tarimas, setTarimas] = useState(1);
  const [frente, setFrente] = useState('');
  const [fondo, setFondo] = useState('');
  const [pzCama, setPzCama] = useState('');
  const [estibaCruzada, setEstibaCruzada] = useState(false);
  const [huecos3D, setHuecos3D] = useState([]);
  
  const [formaVisual, setFormaVisual] = useState('caja-h'); 
  const [piezasVisuales, setPiezasVisuales] = useState([]);
  const [idPiezaLienzo, setIdPiezaLienzo] = useState(0);
  const [dimsEmpaque, setDimsEmpaque] = useState([1, 1, 1]); 

  // NUEVO: Estados para los patrones personalizados
  const [patronIndex, setPatronIndex] = useState(0);
  const [patronesCustom, setPatronesCustom] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setNiveles(''); setAjuste(0); setTarimas(1); setFrente(''); setFondo(''); setPzCama('');
      setPiezasVisuales([]); setIdPiezaLienzo(0); setHuecos3D([]); setEstibaCruzada(false); setPatronIndex(0);
      setModo('visual'); setModoOrigen('visual'); 
      const memKey = `een_forma_${codigoItem}_${varIdItem}`;
      const savedDims = localStorage.getItem(memKey);
      if (savedDims) setDimsEmpaque(JSON.parse(savedDims));
      else setDimsEmpaque([1, 1, 1]);
    }
  }, [isOpen, codigoItem, varIdItem]);

  // Cargar las plantillas custom cuando pones piezas en Cama
  useEffect(() => {
    if (pzCama > 0) {
      const saved = localStorage.getItem(`een_patrones_${pzCama}`);
      setPatronesCustom(saved ? JSON.parse(saved) : []);
    } else {
      setPatronesCustom([]);
    }
    setPatronIndex(0);
  }, [pzCama]);

  if (!isOpen) return null;

  let subtotal = 0;
  const n = parseInt(niveles) || 0;
  const t = parseInt(tarimas) || 1;
  const a = parseInt(ajuste) || 0;

  if (modo === 'bloque' || (modo === '3d' && modoOrigen === 'bloque')) subtotal = (parseInt(frente) || 0) * (parseInt(fondo) || 0) * n;
  else if (modo === 'cama' || (modo === '3d' && modoOrigen === 'cama')) subtotal = (parseInt(pzCama) || 0) * n * t;
  else if (modo === 'visual' || (modo === '3d' && modoOrigen === 'visual')) subtotal = piezasVisuales.length * n * t;
  const totalCalculado = Math.max(0, subtotal + a - huecos3D.length);

  // LA MAGIA DE GUARDAR TU PLANTILLA
  const guardarPlantilla = () => {
    if (piezasVisuales.length === 0) return;
    const numPz = piezasVisuales.length;
    const key = `een_patrones_${numPz}`;
    const guardados = JSON.parse(localStorage.getItem(key) || '[]');
    guardados.push(piezasVisuales); // Guardamos tu dibujo exacto
    localStorage.setItem(key, JSON.stringify(guardados));
    alert(`¡Plantilla de ${numPz} empaques guardada en la tablet!\n\nAhora ve a "Cama", pon ${numPz} piezas y usa el botón "Alternar" para usar tu dibujo.`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex items-center justify-center p-2 md:p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden my-auto">
        
        <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div><h3 className="font-black text-lg text-white">Editor de Estiba Visual</h3><p className="text-xs text-blue-400 font-bold truncate max-w-[200px]">{tituloTarget}</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center"><i className="fas fa-times"></i></button>
        </div>
        
        <div className="p-4 md:p-5 space-y-4">
          
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
            {['visual','cama','bloque'].map(m => (
              <button key={m} onClick={() => { setModo(m); setModoOrigen(m); setHuecos3D([]); }} className={`flex-1 py-2.5 rounded-lg font-black text-[10px] uppercase transition ${modo === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{m}</button>
            ))}
            <button onClick={() => setModo('3d')} className={`flex-1 py-2.5 rounded-lg font-black text-[10px] uppercase transition ${modo === '3d' ? 'bg-purple-600 text-white' : 'text-purple-400'}`}><i className="fas fa-cube mr-1"></i>3D</button>
          </div>

          {modo === 'visual' && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 overflow-x-auto custom-scroll-sm pb-1.5">
                {[ 
                  {f:'circulo', t:'Cil', i:'fa-circle text-amber-400'}, {f:'cuadrado', t:'Cubo', i:'fa-square'}, 
                  {f:'caja-h', t:'1.5 ▬', i:null}, {f:'caja-v', t:'1.5 ▮', i:null},
                  {f:'rect-h', t:'2.0 ▬', i:null}, {f:'rect-v', t:'2.0 ▮', i:null},
                  {f:'delgado-h', t:'3.0 ▬', i:null}, {f:'delgado-v', t:'3.0 ▮', i:null},
                ].map(form => (
                  <button key={form.f} onClick={() => setFormaVisual(form.f)} className={`flex-shrink-0 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition flex items-center gap-1.5 ${formaVisual === form.f ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-800/50'}`}>
                    {form.i && <i className={`fas ${form.i}`}></i>} {form.t}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setIdPiezaLienzo(prev => prev + 1); setPiezasVisuales([...piezasVisuales, { id: Date.now(), forma: formaVisual, numero: idPiezaLienzo + 1, x: 150, y: 60 }]); }} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl text-[11px] uppercase transition shadow-lg flex items-center justify-center gap-2"><i className="fas fa-plus"></i> Añadir</button>
                {/* BOTÓN MÁGICO PARA GUARDAR PATRÓN */}
                <button onClick={guardarPlantilla} className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-2.5 rounded-xl text-[11px] uppercase transition shadow-lg flex items-center justify-center gap-2"><i className="fas fa-save"></i> Guardar</button>
                <button onClick={() => { setPiezasVisuales([]); setIdPiezaLienzo(0); }} className="w-12 bg-slate-700 hover:bg-red-600 text-white rounded-xl transition"><i className="fas fa-trash"></i></button>
              </div>
              
              <div className="bg-slate-900 p-2 rounded-2xl border border-slate-700 relative h-44 overflow-hidden shadow-inner bg-slate-950/50">
                <p className="absolute top-2 left-0 right-0 text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center pointer-events-none z-0">Lienzo Libre 2D</p>
                 {piezasVisuales.map(p => <PiezaArrastrable key={p.id} pieza={p} onEliminar={id => setPiezasVisuales(piezasVisuales.filter(x => x.id !== id))} onMover={(id,x,y) => setPiezasVisuales(piezasVisuales.map(x => x.id === id ? {...x, x, y} : x))} />)}
              </div>
            </div>
          )}
          
          {modo === 'cama' && (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Piezas / Cama</label><input type="number" value={pzCama} onChange={e => setPzCama(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-amber-400 p-3 rounded-xl text-center font-black text-xl outline-none" /></div>
              <div className="flex flex-col">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Alternar Patrón 3D</label>
                <button onClick={() => setPatronIndex(prev => prev + 1)} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 rounded-xl font-black text-[10px] uppercase transition flex items-center justify-center gap-2">
                   <i className="fas fa-sync-alt"></i> Cambiar
                </button>
              </div>
            </div>
          )}

          {modo === 'bloque' && (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Frente</label><input type="number" value={frente} onChange={e => setFrente(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl text-center font-black text-xl outline-none" /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Fondo</label><input type="number" value={fondo} onChange={e => setFondo(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl text-center font-black text-xl outline-none" /></div>
            </div>
          )}

          {modo === '3d' && (
            <div className="w-full h-64 border border-purple-900/50 bg-slate-900 rounded-xl overflow-hidden relative mt-2 shadow-inner">
               <Estiba3D 
                  modoOrigen={modoOrigen} frente={frente} fondo={fondo} niveles={niveles} pzCama={pzCama} tarimas={tarimas} 
                  piezasVisuales={piezasVisuales} huecos3D={huecos3D} onToggleHueco={id => setHuecos3D(huecos3D.includes(id) ? huecos3D.filter(h => h !== id) : [...huecos3D, id])} 
                  estibaCruzada={estibaCruzada} patronIndex={patronIndex} patronesCustom={patronesCustom} 
               />
               <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-slate-400 font-bold pointer-events-none">Toca para marcar huecos • Doble dedo para rotar</p>
            </div>
          )}

          {/* ... (El resto del código inferior se mantiene igual: Niveles, Ajuste, Amarre de Seguridad, Botones de Guardar) ... */}
          {(modo === '3d' && parseInt(niveles) > 1) && (
             <div className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 p-3 rounded-xl cursor-pointer" onClick={() => setEstibaCruzada(!estibaCruzada)}>
               <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${estibaCruzada ? 'bg-purple-500' : 'bg-slate-900 border border-slate-600'}`}>{estibaCruzada && <i className="fas fa-check text-white text-xs"></i>}</div>
               <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Rotar 180° por capa (Amarre)</span>
             </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-center border-t border-slate-700 pt-4 mt-2">
            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Niveles (Capas)</label><input type="number" value={niveles} onChange={e => setNiveles(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-blue-400 p-3 rounded-xl text-center font-black text-xl outline-none" /></div>
            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Ajuste Manual</label><input type="number" value={ajuste} onChange={e => setAjuste(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-emerald-400 p-3 rounded-xl text-center font-black text-xl outline-none" /></div>
          </div>
          <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-2xl text-center mt-2 flex justify-between items-center px-6 shadow-inner">
            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Total Fisico</p>
            <p className="text-4xl font-black text-white">{totalCalculado}{huecos3D.length > 0 && <span className="text-sm text-red-400 ml-2">(-{huecos3D.length})</span>}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-700 text-slate-300 font-bold rounded-2xl text-sm transition hover:bg-slate-600">Cancelar</button>
          <button onClick={() => { onAplicar(totalCalculado); onClose(); }} className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg text-sm transition hover:bg-blue-500">Aplicar al Conteo</button>
        </div>
      </div>
    </div>
  );
};

export default ModalCalculadora;