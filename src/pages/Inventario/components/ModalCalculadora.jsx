import React, { useState, useEffect } from 'react';
import Estiba3D from './Estiba3D';

// --- DICCIONARIO BILINGÜE CENTRALIZADO ---
const diccionariosCalc = {
  es: {
    titulo: "Calculadora de Estiba", bloque: "Bloque", cama: "Cama", lienzo: "Lienzo",
    frente: "Frente", fondo: "Fondo", pzCama: "Pz Cama", alternar: "Alternar Patrón", cambiar: "Cambiar",
    anadir: "Añadir", guardar: "Guardar", arrastra: "Arrastra para mover", doble: "Doble toque para borrar",
    toca: "Toca un empaque para marcar hueco", cruzada: "Estiba Cruzada (Rotar 180°)",
    tarimas: "Pallets / Tarimas", niveles: "Niveles (Capas)", ajuste: "Ajuste Fino (+/-)",
    total: "Total Estimado", cancelar: "Cancelar", sumar: "Sumar al Conteo",
    alertGuardado: "Plantilla de {n} pz guardada con éxito."
  },
  fr: {
    titulo: "Calculateur d'Arrimage", bloque: "Bloc", cama: "Lit", lienzo: "Toile",
    frente: "Face", fondo: "Fond", pzCama: "Pc Lit", alternar: "Alterner Modèle", cambiar: "Changer",
    anadir: "Ajouter", guardar: "Sauver", arrastra: "Glisser pour déplacer", doble: "Double tap pour effacer",
    toca: "Touchez pour marquer un vide", cruzada: "Arrimage Croisé (Rot. 180°)",
    tarimas: "Palettes (Fond)", niveles: "Niveaux (Couches)", ajuste: "Ajustement (+/-)",
    total: "Total Estimé", cancelar: "Annuler", sumar: "Ajouter au comptage",
    alertGuardado: "Modèle de {n} pc enregistré avec succès."
  }
};

// --- MIS DATOS BASE (Tus patrones inyectados) ---
const PATRONES_BASE = {
  3: [ [{"id":"p3_1","forma":"rect-h","numero":1,"x":106,"y":33},{"id":"p3_2","forma":"rect-h","numero":2,"x":105,"y":68},{"id":"p3_3","forma":"rect-v","numero":3,"x":172,"y":33}] ],
  4: [
    [{"id":"p4_1","forma":"rect-h","numero":1,"x":176,"y":110},{"id":"p4_2","forma":"rect-h","numero":2,"x":143,"y":42},{"id":"p4_3","forma":"rect-v","numero":3,"x":212,"y":44},{"id":"p4_4","forma":"rect-v","numero":4,"x":144,"y":77}],
    [{"id":"p4b_1","forma":"rect-h","numero":1,"x":142,"y":35},{"id":"p4b_2","forma":"rect-v","numero":2,"x":142,"y":67},{"id":"p4b_3","forma":"rect-v","numero":3,"x":176,"y":67},{"id":"p4b_4","forma":"rect-h","numero":4,"x":143,"y":136}]
  ],
  5: [ [{"id":"p5_1","forma":"caja-h","numero":1,"x":134,"y":33},{"id":"p5_2","forma":"caja-h","numero":2,"x":184,"y":33},{"id":"p5_3","forma":"caja-v","numero":4,"x":133,"y":66},{"id":"p5_4","forma":"caja-v","numero":5,"x":167,"y":66},{"id":"p5_5","forma":"caja-v","numero":6,"x":200,"y":68}] ],
  7: [ [{"id":"p7_1","forma":"caja-h","numero":1,"x":134,"y":33},{"id":"p7_2","forma":"caja-h","numero":2,"x":184,"y":33},{"id":"p7_3","forma":"caja-h","numero":3,"x":234,"y":33},{"id":"p7_4","forma":"caja-v","numero":4,"x":133,"y":66},{"id":"p7_5","forma":"caja-v","numero":5,"x":173,"y":67},{"id":"p7_6","forma":"caja-v","numero":6,"x":213,"y":68},{"id":"p7_7","forma":"caja-v","numero":7,"x":252,"y":68}] ]
};

// --- MOTOR DE ROTACIÓN MATEMÁTICA 90 GRADOS ---
const getDimensionesForma = (forma) => {
  let w = 34, h = 34;
  if (forma.includes('caja')) { w = forma.includes('-h')?51:34; h = forma.includes('-v')?51:34; }
  else if (forma.includes('rect')) { w = forma.includes('-h')?68:34; h = forma.includes('-v')?68:34; }
  else if (forma.includes('delgado')) { w = forma.includes('-h')?102:34; h = forma.includes('-v')?102:34; }
  return { w, h };
};

const rotarPatron90 = (patron) => {
  if (!patron || patron.length === 0) return [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  patron.forEach(p => {
    const { w, h } = getDimensionesForma(p.forma);
    if (p.x < minX) minX = p.x; if (p.x + w > maxX) maxX = p.x + w;
    if (p.y < minY) minY = p.y; if (p.y + h > maxY) maxY = p.y + h;
  });
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  
  return patron.map(p => {
    const { w, h } = getDimensionesForma(p.forma);
    const px = p.x + w / 2; const py = p.y + h / 2;
    const newPx = cx - (py - cy); const newPy = cy + (px - cx);
    let newForma = p.forma;
    if (p.forma.includes('-h')) newForma = p.forma.replace('-h', '-v');
    else if (p.forma.includes('-v')) newForma = p.forma.replace('-v', '-h');
    
    const { w: newW, h: newH } = getDimensionesForma(newForma);
    return { ...p, id: p.id + '_rot', forma: newForma, x: newPx - newW / 2, y: newPy - newH / 2 };
  });
};

// --- COMPONENTE ARRASTRABLE OPTIMIZADO (Contraste) ---
const PiezaArrastrable = ({ pieza, onEliminar, onMover }) => {
  const [pos, setPos] = useState({ x: pieza.x, y: pieza.y });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  useEffect(() => { setPos({ x: pieza.x, y: pieza.y }); }, [pieza.x, pieza.y]);

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
    setPos({ x: e.clientX - parseFloat(e.target.dataset.startX), y: e.clientY - parseFloat(e.target.dataset.startY) });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
    if (onMover) onMover(pieza.id, pos.x, pos.y);
  };

  let shapeClasses = "border-2 border-slate-900 bg-blue-500 text-white";
  switch (pieza.forma) {
    case 'circulo': shapeClasses += " w-[34px] h-[34px] rounded-full bg-amber-500 border-amber-700"; break;
    case 'cuadrado': shapeClasses += " w-[34px] h-[34px] rounded-md"; break;
    case 'caja-h': shapeClasses += " w-[51px] h-[34px] rounded-md"; break;
    case 'caja-v': shapeClasses += " w-[34px] h-[51px] rounded-md"; break;
    case 'rect-h': shapeClasses += " w-[68px] h-[34px] rounded-md"; break;
    case 'rect-v': shapeClasses += " w-[34px] h-[68px] rounded-md"; break;
    case 'delgado-h': shapeClasses += " w-[102px] h-[34px] rounded-md"; break;
    case 'delgado-v': shapeClasses += " w-[34px] h-[102px] rounded-md"; break;
    default: shapeClasses += " w-[34px] h-[34px]";
  }

  return (
    <div
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
      className={`absolute flex items-center justify-center text-[12px] font-black shadow-md touch-none select-none transition-transform ${isDragging ? 'z-50 scale-110 opacity-90 cursor-grabbing shadow-2xl' : 'cursor-grab'} ${shapeClasses}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, left: 0, top: 0 }}
    >
      {pieza.forma === 'circulo' ? '' : pieza.numero}
    </div>
  );
};


const ModalCalculadora = ({ isOpen, onClose, onAplicar, tituloTarget, idioma = 'es' }) => {
  const t = diccionariosCalc[idioma];
  
  // Estado local para Toast (Notificaciones)
  const [toastMsg, setToastMsg] = useState('');

  const [modo, setModo] = useState('bloque'); 
  const [modoOrigen, setModoOrigen] = useState('bloque'); 
  const [niveles, setNiveles] = useState('');
  const [ajuste, setAjuste] = useState(0);
  const [tarimas, setTarimas] = useState(1);
  const [frente, setFrente] = useState('');
  const [fondo, setFondo] = useState('');
  
  const [pzCama, setPzCama] = useState('');
  const [patronesDisponibles, setPatronesDisponibles] = useState([]);
  const [patronIndex, setPatronIndex] = useState(0);

  const [estibaCruzada, setEstibaCruzada] = useState(false);
  const [formaVisual, setFormaVisual] = useState('cuadrado');
  const [piezasVisuales, setPiezasVisuales] = useState([]);
  const [idPiezaLienzo, setIdPiezaLienzo] = useState(0);
  const [huecos3D, setHuecos3D] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setNiveles(''); setAjuste(0); setTarimas(1); setFrente(''); setFondo(''); setPzCama('');
      setPiezasVisuales([]); setIdPiezaLienzo(0); setHuecos3D([]); setEstibaCruzada(false); setPatronIndex(0);
      setModo('bloque'); setModoOrigen('bloque'); 
      setToastMsg('');
    }
  }, [isOpen]);

  useEffect(() => {
    const pz = parseInt(pzCama);
    if (pz > 0) {
      let todos = [];
      const agregarConRotaciones = (patronBase) => {
        const rot90 = rotarPatron90(patronBase);
        const rot180 = rotarPatron90(rot90);
        const rot270 = rotarPatron90(rot180);
        todos.push(patronBase); todos.push(rot90); todos.push(rot180); todos.push(rot270); 
      };

      if (PATRONES_BASE[pz]) PATRONES_BASE[pz].forEach(pat => agregarConRotaciones(pat));
      
      const saved = localStorage.getItem(`een_patrones_${pz}`);
      if (saved) JSON.parse(saved).forEach(pat => agregarConRotaciones(pat));

      setPatronesDisponibles(todos);
      setPatronIndex(0);
      setPiezasVisuales(todos.length > 0 ? todos[0] : []);
    } else {
      setPatronesDisponibles([]);
      setPiezasVisuales([]);
    }
  }, [pzCama]);

  if (!isOpen) return null;

  let subtotal = 0;
  const n = parseInt(niveles) || 0;
  const tr = parseInt(tarimas) || 1;
  const a = parseInt(ajuste) || 0;

  if (modo === 'bloque' || (modo === '3d' && modoOrigen === 'bloque')) {
    subtotal = (parseInt(frente) || 0) * (parseInt(fondo) || 0) * n;
  } else if (modo === 'cama' || (modo === '3d' && modoOrigen === 'cama')) {
    subtotal = (parseInt(pzCama) || 0) * n * tr;
  } else if (modo === 'visual' || (modo === '3d' && modoOrigen === 'visual')) {
    subtotal = piezasVisuales.length * n * tr;
  }
  
  const totalCalculado = Math.max(0, subtotal + a - huecos3D.length);

  const cambiarPestana = (nuevoModo) => {
    if (nuevoModo !== '3d') setModoOrigen(nuevoModo);
    if (nuevoModo !== modo) setHuecos3D([]); 
    setModo(nuevoModo);
  };

  const alternarPatron = () => {
    if (patronesDisponibles.length > 0) {
      const nextIdx = (patronIndex + 1) % patronesDisponibles.length;
      setPatronIndex(nextIdx);
      setPiezasVisuales(patronesDisponibles[nextIdx]);
      setHuecos3D([]); 
    }
  };

  const agregarPiezaVisual = () => {
    setIdPiezaLienzo(prev => prev + 1);
    const offset = Math.floor(Math.random() * 20) - 10;
    setPiezasVisuales([...piezasVisuales, { id: Date.now(), forma: formaVisual, numero: idPiezaLienzo + 1, x: 150 + offset, y: 60 + offset }]);
  };

  const eliminarPiezaVisual = (id) => setPiezasVisuales(prev => prev.filter(p => p.id !== id));
  const moverPiezaVisual = (id, newX, newY) => setPiezasVisuales(prev => prev.map(p => p.id === id ? { ...p, x: newX, y: newY } : p));
  const toggleHueco = (idCaja) => setHuecos3D(prev => prev.includes(idCaja) ? prev.filter(h => h !== idCaja) : [...prev, idCaja]);

  const guardarPlantilla = () => {
    if (piezasVisuales.length === 0) return;
    const numPz = piezasVisuales.length;
    const key = `een_patrones_${numPz}`;
    const guardados = JSON.parse(localStorage.getItem(key) || '[]');
    guardados.push(piezasVisuales);
    localStorage.setItem(key, JSON.stringify(guardados));
    
    // Toast en lugar de Alert
    setToastMsg(t.alertGuardado.replace('{n}', numPz));
    setTimeout(() => setToastMsg(''), 3000);
  };

  // --- COMPONENTE INTERNO: STEPPER TÁCTIL MÓVIL ---
  const StepperInput = ({ label, valor, setter, colorClass = "text-white" }) => (
    <div className="flex flex-col">
      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">{label}</label>
      <div className="flex items-center bg-slate-900 border border-slate-600 rounded-xl overflow-hidden shadow-inner h-12">
        <button 
          onClick={() => setter(Math.max(0, (parseInt(valor)||0) - 1))} 
          className="w-12 h-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center active:bg-slate-600 transition-colors border-r border-slate-700"
        >
          <i className="fas fa-minus"></i>
        </button>
        <input 
          type="number" 
          value={valor} 
          onChange={e => setter(e.target.value)} 
          className={`flex-1 w-full bg-transparent text-center font-black text-xl outline-none ${colorClass}`} 
          placeholder="0"
        />
        <button 
          onClick={() => setter((parseInt(valor)||0) + 1)} 
          className="w-12 h-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center active:bg-slate-600 transition-colors border-l border-slate-700"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      
      <div className="bg-slate-800 border border-slate-600 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden my-auto relative animate-fade-in">
        
        {/* TOAST LOCAL (Notificación de guardado) */}
        {toastMsg && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-5 py-2.5 rounded-full shadow-xl font-bold text-xs flex items-center gap-2 animate-fade-in w-max border border-emerald-400">
            <i className="fas fa-check-circle text-sm"></i> {toastMsg}
          </div>
        )}

        {/* CABECERA MODAL */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="font-black text-xl text-white tracking-tight">{t.titulo}</h3>
            <p className="text-xs text-blue-400 font-bold truncate max-w-[200px] mt-0.5 px-2 py-0.5 bg-blue-500/10 rounded-md border border-blue-500/20 inline-block">{tituloTarget}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center shadow-sm active:scale-90 transition">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
        
        <div className="p-4 md:p-5 space-y-5">
          
          {/* TABS DE NAVEGACIÓN (Estilo App Nativa) */}
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-600 overflow-x-auto custom-scroll shadow-inner gap-1">
            <button onClick={() => cambiarPestana('bloque')} className={`flex-1 min-w-[70px] py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${modo === 'bloque' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>{t.bloque}</button>
            <button onClick={() => cambiarPestana('cama')} className={`flex-1 min-w-[70px] py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${modo === 'cama' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>{t.cama}</button>
            <button onClick={() => cambiarPestana('visual')} className={`flex-1 min-w-[70px] py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${modo === 'visual' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>{t.lienzo}</button>
            <button onClick={() => cambiarPestana('3d')} className={`flex-1 min-w-[70px] py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex justify-center items-center gap-1 ${modo === '3d' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50' : 'text-purple-400 hover:text-purple-300 hover:bg-slate-800'}`}>
              <i className="fas fa-cube"></i> 3D
            </button>
          </div>

          {/* VISTA BLOQUE */}
          {(modo === 'bloque' || (modo === '3d' && modoOrigen === 'bloque')) && (
            <div className="grid grid-cols-2 gap-4">
              <StepperInput label={t.frente} valor={frente} setter={setFrente} colorClass="text-white" />
              <StepperInput label={t.fondo} valor={fondo} setter={setFondo} colorClass="text-white" />
            </div>
          )}

          {/* VISTA CAMA */}
          {(modo === 'cama' || (modo === '3d' && modoOrigen === 'cama')) && (
            <div className="grid grid-cols-2 gap-4">
              <StepperInput label={t.pzCama} valor={pzCama} setter={setPzCama} colorClass="text-amber-400" />
              <div className="flex flex-col">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">{t.alternar}</label>
                <button onClick={alternarPatron} className="h-12 w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-blue-400 rounded-xl font-bold text-xs outline-none transition flex items-center justify-center gap-2 active:scale-95 shadow-sm">
                  <i className="fas fa-sync-alt"></i> {t.cambiar}
                </button>
              </div>
            </div>
          )}

          {/* VISTA LIENZO VISUAL */}
          {modo === 'visual' && (
            <div className="flex flex-col gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-700">
              
              {/* Botones de Formas (Scroll Horizontal Suave) */}
              <div className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-600 overflow-x-auto custom-scroll pb-1.5 shadow-inner">
                  {[ {f:'circulo', t:'Cil', i:'fa-circle'}, {f:'cuadrado', t:'Cubo', i:'fa-square'}, {f:'caja-h', t:'1.5 ▬', i:null}, {f:'caja-v', t:'1.5 ▮', i:null}, {f:'rect-h', t:'2.0 ▬', i:null}, {f:'rect-v', t:'2.0 ▮', i:null}, {f:'delgado-h', t:'3.0 ▬', i:null}, {f:'delgado-v', t:'3.0 ▮', i:null} ].map(form => (
                    <button key={form.f} onClick={() => setFormaVisual(form.f)} className={`flex-shrink-0 px-3.5 py-2.5 rounded-lg text-[10px] font-black uppercase transition-colors shadow-sm border ${formaVisual === form.f ? 'bg-blue-600 text-white border-blue-500' : 'text-slate-400 bg-slate-800 hover:bg-slate-700 border-slate-600'}`}>
                      {form.i && <i className={`fas ${form.i} mr-1.5`}></i>}{form.t}
                    </button>
                  ))}
              </div>

              {/* Botones de Acción Lienzo */}
              <div className="flex gap-2">
                <button onClick={agregarPiezaVisual} className="flex-[2] bg-amber-500 hover:bg-amber-400 text-amber-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md active:scale-95 flex justify-center items-center gap-2 border border-amber-400">
                  <i className="fas fa-plus-circle text-lg"></i> {t.anadir}
                </button>
                <button onClick={guardarPlantilla} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md active:scale-95 flex justify-center items-center gap-2 border border-emerald-500">
                  <i className="fas fa-save text-lg"></i> {t.guardar}
                </button>
                <button onClick={() => { setPiezasVisuales([]); setIdPiezaLienzo(0); }} className="w-14 bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white font-bold py-3 rounded-xl text-lg transition border border-slate-600 active:scale-95 flex items-center justify-center shadow-sm">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
              
              {/* Lienzo Arrastrable */}
              <div className="bg-slate-900 p-2 rounded-2xl border border-slate-600 relative shadow-inner">
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none z-0 text-center">
                   <i className="fas fa-hand-pointer text-3xl mb-2 text-slate-400"></i>
                   <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.arrastra}<br/>{t.doble}</p>
                </div>
                <div className="w-full h-48 border-2 border-dashed border-slate-500 rounded-xl relative overflow-hidden z-10 touch-none">
                   {piezasVisuales.map(p => <PiezaArrastrable key={p.id} pieza={p} onEliminar={eliminarPiezaVisual} onMover={moverPiezaVisual} />)}
                </div>
              </div>
            </div>
          )}

          {/* VISTA 3D */}
          {modo === '3d' && (
            <div className="w-full h-64 border-2 border-purple-500/50 bg-slate-900 rounded-2xl overflow-hidden relative shadow-inner mt-2">
               <Estiba3D modoOrigen={modoOrigen} frente={frente} fondo={fondo} niveles={niveles} pzCama={pzCama} tarimas={tarimas} piezasVisuales={piezasVisuales} huecos3D={huecos3D} onToggleHueco={toggleHueco} estibaCruzada={estibaCruzada} />
               <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur px-4 py-1.5 rounded-full border border-slate-700 pointer-events-none shadow-lg">
                 <p className="text-[10px] text-purple-300 font-bold uppercase tracking-widest whitespace-nowrap"><i className="fas fa-hand-pointer mr-1"></i> {t.toca}</p>
               </div>
            </div>
          )}

          {/* CHECKBOX ESTIBA CRUZADA */}
          {(modo === '3d' && ['visual', 'cama', 'bloque'].includes(modoOrigen)) && (
             <div className="flex items-center justify-center gap-3 bg-slate-800 border border-slate-600 p-3.5 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-transform" onClick={() => setEstibaCruzada(!estibaCruzada)}>
               <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shadow-inner border ${estibaCruzada ? 'bg-purple-500 border-purple-400' : 'bg-slate-900 border-slate-600'}`}>
                 {estibaCruzada && <i className="fas fa-check text-white text-sm"></i>}
               </div>
               <span className="text-xs font-black text-slate-200 uppercase tracking-wider">{t.cruzada}</span>
             </div>
          )}

          {/* CONTROLES INFERIORES: NIVELES, TARIMAS, AJUSTE */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-5 mt-2 relative">
            <StepperInput label={t.niveles} valor={niveles} setter={setNiveles} colorClass="text-blue-400" />
            <StepperInput label={t.ajuste} valor={ajuste} setter={setAjuste} colorClass="text-emerald-400" />
            
            {/* Solo mostramos Tarimas en Cama o Visual para no abrumar en Bloque simple */}
            {(['cama', 'visual'].includes(modo) || (modo === '3d' && ['cama', 'visual'].includes(modoOrigen))) && (
              <div className="col-span-2">
                 <StepperInput label={t.tarimas} valor={tarimas} setter={setTarimas} colorClass="text-purple-400" />
              </div>
            )}
          </div>

          {/* GRAN TOTAL CALCULADO */}
          <div className="bg-blue-600/20 border-2 border-blue-500 p-4 rounded-2xl text-center flex justify-between items-center px-6 shadow-lg relative overflow-hidden mt-2">
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-500/20 to-transparent pointer-events-none"></div>
            <p className="text-blue-300 text-xs font-black uppercase tracking-widest relative z-10">{t.total}</p>
            <p className="text-5xl font-black text-white relative z-10 drop-shadow-md">
              {totalCalculado}
              {huecos3D.length > 0 && <span className="text-base text-red-400 ml-2 align-top bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20">(-{huecos3D.length})</span>}
            </p>
          </div>

        </div>

        {/* BOTONES DE ACCIÓN PRINCIPALES */}
        <div className="p-4 md:p-5 bg-slate-900/80 flex gap-3 border-t border-slate-700">
          <button onClick={onClose} className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold rounded-xl text-sm transition active:scale-95">{t.cancelar}</button>
          <button onClick={() => { onAplicar(totalCalculado); onClose(); }} className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-900/50 text-sm transition active:scale-95 flex items-center justify-center gap-2">
            <i className="fas fa-plus-circle text-lg"></i> {t.sumar}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalCalculadora;
