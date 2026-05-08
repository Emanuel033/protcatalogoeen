import React, { useState } from 'react';

// --- DICCIONARIO BILINGÜE ---
const diccionarios = {
  es: {
    stockSistema: "STOCK SISTEMA", totalFisico: "TOTAL FÍSICO", ajuste: "AJUSTE",
    entrada: "ENTRADA", salida: "SALIDA", ok: "CORRECTO", sueltas: "Sueltas (1pz)",
    paquete: "Paquete", caja: "Caja", btnNuevoEmpaque: "Añadir empaque no registrado",
    promptPiezas: "¿Cuántas piezas tiene este paquete?", pz_abrev: "pz",
    txtNuevoPaquete: "Nuevo Paquete ({pz}pz) ✨", listaVacia: "La lista está vacía.",
    listaVaciaSub: "Busca un producto arriba para agregarlo.",
    cancelar: "Cancelar", anadir: "Añadir"
  },
  fr: {
    stockSistema: "STOCK SYSTÈME", totalFisico: "TOTAL PHYSIQUE", ajuste: "AJUSTEMENT",
    entrada: "ENTRÉE", salida: "SORTIE", ok: "CORRECT", sueltas: "Unité (1pc)",
    paquete: "Paquet", caja: "Boîte", btnNuevoEmpaque: "Ajouter un paquet",
    promptPiezas: "Nombre de pièces ?", pz_abrev: "pc",
    txtNuevoPaquete: "Paquet ({pz}pc) ✨", listaVacia: "La liste est vide.",
    listaVaciaSub: "Recherchez un produit ci-dessus.",
    cancelar: "Annuler", anadir: "Ajouter"
  }
};

const ListaConteo = ({ 
  listaConteo, 
  idioma, 
  onCambiarCant, 
  onManualCant, 
  onEliminar, 
  onAgregarEmpaque, 
  onAbrirCalculadora,
  onIniciarDictado,
  onZoomImagen,
  soloLectura = false,
  // --- NUEVAS PROPS DE SELECCIÓN ---
  modoSeleccion = false,
  seleccionados = [],
  onToggleSeleccion = () => {}
}) => {
  const t = diccionarios[idioma] || diccionarios.es;

  // ESTADO LOCAL PARA EL MODAL DE "NUEVO EMPAQUE"
  const [modalEmpaque, setModalEmpaque] = useState({ isOpen: false, codigo: null, cantidad: '' });

  const handleAbrirModalEmpaque = (codigo) => {
    setModalEmpaque({ isOpen: true, codigo, cantidad: '' });
  };

  const handleConfirmarEmpaque = () => {
    if (modalEmpaque.cantidad && parseInt(modalEmpaque.cantidad) > 0) {
      onAgregarEmpaque(modalEmpaque.codigo, modalEmpaque.cantidad);
    }
    setModalEmpaque({ isOpen: false, codigo: null, cantidad: '' });
  };

  if (!listaConteo || listaConteo.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center opacity-50">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 border-4 border-dashed border-slate-600">
          <i className="fas fa-clipboard-list text-5xl text-slate-500"></i>
        </div>
        <h3 className="text-white font-black text-xl mb-2">{t.listaVacia}</h3>
        <p className="text-slate-400 text-sm font-bold">{t.listaVaciaSub}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {listaConteo.map((item) => {
        const ajuste = item.totalFisico - item.stockSistema;
        const isSelected = seleccionados.includes(item.codigo);
        
        // Estilos dinámicos dependiendo del Modo Selección
        const bgAjuste = ajuste === 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' :
                         ajuste > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
                         'bg-red-500/20 text-red-300 border-red-500/50';

        const cardStyle = modoSeleccion
          ? (isSelected ? 'border-blue-500 bg-slate-800 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-slate-700 bg-slate-900/80 opacity-60 scale-[0.98]')
          : 'border-slate-600 bg-slate-800 shadow-xl';
        
        return (
          <div key={item.codigo} className={`relative rounded-3xl p-5 overflow-hidden transition-all duration-300 border ${cardStyle}`}>
            
            {/* CAPA INVISIBLE QUE INTERCEPTA CLICS EN MODO SELECCIÓN */}
            {modoSeleccion && (
              <div 
                className="absolute inset-0 z-20 cursor-pointer" 
                onClick={() => onToggleSeleccion(item.codigo)}
              ></div>
            )}

            {/* CHECKBOX GIGANTE (Solo visible en modo selección) */}
            {modoSeleccion && (
              <div className="absolute top-4 right-4 z-30 pointer-events-none">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${isSelected ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-lg shadow-blue-900/50' : 'bg-slate-800 border-slate-500 text-transparent'}`}>
                  <i className="fas fa-check text-xl"></i>
                </div>
              </div>
            )}

            {/* Botón Eliminar (Se oculta en modo lectura y en modo selección) */}
            {!soloLectura && !modoSeleccion && (
              <button 
                onClick={() => onEliminar(item.codigo)}
                className="absolute top-0 right-0 w-14 h-14 bg-slate-900 rounded-bl-3xl text-slate-500 hover:text-red-400 hover:bg-slate-950 transition-all flex items-center justify-center z-10 border-b border-l border-slate-700 shadow-sm active:scale-95"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            )}

            {/* Cabecera Producto */}
            <div className="flex gap-4 mb-6 pr-10">
              <div 
                className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-2 shadow-inner shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform border border-slate-300 relative z-10"
                onClick={() => !modoSeleccion && onZoomImagen && onZoomImagen(item.imagen)}
              >
                <img 
                  src={item.imagen || 'https://via.placeholder.com/100?text=S/I'} 
                  alt={item.nombre} 
                  className="w-full h-full object-contain mix-blend-multiply"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=S/I'}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 relative z-10">
                <h3 className="text-white font-black text-sm leading-tight line-clamp-2 uppercase">
                  {item.nombre}
                </h3>
                <div className="inline-flex">
                   <p className="text-blue-300 font-black text-[11px] tracking-widest bg-blue-900/40 px-2.5 py-1 rounded-lg border border-blue-500/40 shadow-sm uppercase">
                     <i className="fas fa-barcode mr-1.5 opacity-70"></i>{item.codigo}
                   </p>
                </div>
              </div>
            </div>

            {/* Variantes (Cajas, Paquetes, Sueltas) */}
            <div className="space-y-3 mb-6 relative z-10">
              {item.variantes.map((v) => {
                const nombreVariante = v.isFantasma 
                  ? t.txtNuevoPaquete.replace('{pz}', v.pz) 
                  : (v.id === 'sueltas' ? t.sueltas : `${t.paquete} (${v.pz}${t.pz_abrev})`);
                
                return (
                  <div key={v.id} className="flex flex-col gap-2.5 bg-slate-900 p-3.5 rounded-2xl border border-slate-700 shadow-inner">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-slate-200 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <i className={`fas ${v.id === 'sueltas' ? 'fa-cube text-slate-400' : 'fa-boxes text-blue-400'} text-sm`}></i>
                        {nombreVariante}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-800 px-2.5 py-1 rounded-md border border-slate-600 shadow-sm">
                        x{v.pz}
                      </span>
                    </div>
                    
                    {/* CONTROLES: Modo Edición (Se desactivan visualmente si está en modo selección, aunque el div overlay ya previene clics) */}
                    {!soloLectura ? (
                      <div className={`flex items-center gap-2 mt-1 ${modoSeleccion ? 'opacity-50 grayscale' : ''}`}>
                        
                        {/* Micrófono (Satélite Izquierdo) */}
                        <button 
                          onMouseDown={(e) => { if(!modoSeleccion) { e.preventDefault(); onIniciarDictado(item.codigo, v.id, 'mic', ''); } }}
                          onTouchStart={(e) => { if(!modoSeleccion) { e.preventDefault(); onIniciarDictado(item.codigo, v.id, 'mic', ''); } }}
                          className="w-14 h-14 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 hover:text-red-400 hover:border-red-400 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-sm"
                          disabled={modoSeleccion}
                        >
                          <i className="fas fa-microphone text-lg"></i>
                        </button>

                        {/* Bloque Stepper (Unido) */}
                        <div className="flex-1 flex items-center bg-slate-800 border border-slate-600 rounded-xl overflow-hidden shadow-sm h-14">
                          <button 
                            onClick={() => !modoSeleccion && onCambiarCant(item.codigo, v.id, -1)}
                            className="w-14 h-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center active:bg-slate-500 transition-colors border-r border-slate-600 shrink-0"
                            disabled={modoSeleccion}
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          
                          <input 
                            type="number" 
                            min="0"
                            value={v.contadas || ''} 
                            onChange={(e) => !modoSeleccion && onManualCant(item.codigo, v.id, e.target.value)}
                            className="w-full h-full bg-transparent text-white font-black text-center text-xl outline-none placeholder-slate-600 disabled:opacity-100"
                            placeholder="0"
                            disabled={modoSeleccion}
                          />

                          <button 
                            onClick={() => !modoSeleccion && onCambiarCant(item.codigo, v.id, 1)}
                            className="w-14 h-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center active:bg-blue-400 transition-colors border-l border-blue-500 shrink-0 shadow-inner"
                            disabled={modoSeleccion}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>

                        {/* Calculadora (Satélite Derecho) */}
                        <button 
                          onClick={() => !modoSeleccion && onAbrirCalculadora(item.codigo, v.id)}
                          className="w-14 h-14 bg-purple-600/20 border border-purple-500/40 rounded-xl text-purple-300 hover:bg-purple-600/40 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-sm"
                          disabled={modoSeleccion}
                        >
                          <i className="fas fa-calculator text-lg"></i>
                        </button>
                      </div>
                    ) : (
                      // CONTROLES: Modo Historial (Solo Lectura)
                      <div className="flex items-center justify-center h-14 bg-slate-800 border border-slate-600 rounded-xl text-white font-black text-2xl shadow-inner mt-1">
                        {v.contadas || 0}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botón Añadir Empaque (Oculto en modo lectura y selección) */}
            {!soloLectura && !modoSeleccion && (
              <button 
                onClick={() => handleAbrirModalEmpaque(item.codigo)} 
                className="w-full text-center bg-slate-900 border border-dashed border-slate-500 hover:bg-slate-800 text-blue-400 font-black text-[11px] py-3.5 mb-5 rounded-xl uppercase tracking-wider transition-colors active:scale-[0.98] flex justify-center items-center gap-2 relative z-10"
              >
                <i className="fas fa-box-open"></i> {t.btnNuevoEmpaque}
              </button>
            )}

            {/* Totales (Alto Contraste Logístico) */}
            <div className="grid grid-cols-2 gap-3 mb-3 relative z-10">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-600 text-center shadow-inner relative overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">{t.stockSistema}</p>
                <p className="text-3xl font-black text-slate-300 relative z-10 mt-1">{item.stockSistema}</p>
              </div>
              <div className="bg-blue-600/20 rounded-2xl p-4 border border-blue-500/40 text-center shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest relative z-10">{t.totalFisico}</p>
                <p className="text-4xl font-black text-white relative z-10 mt-1 drop-shadow-md">{item.totalFisico}</p>
              </div>
            </div>
            
            {/* Ajuste Bottom (Color Dinámico Intenso) */}
            <div className={`flex justify-center items-center py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider border shadow-sm relative z-10 ${bgAjuste}`}>
              <span className="mr-2 opacity-80">{t.ajuste}:</span>
              {ajuste > 0 ? `+${ajuste}` : ajuste} {ajuste === 0 ? `(${t.ok})` : ''}
            </div>

          </div>
        );
      })}

      {/* MODAL INTERNO: AÑADIR NUEVO EMPAQUE */}
      {modalEmpaque.isOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-600 p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-500/40">
                <i className="fas fa-box text-3xl text-blue-400"></i>
              </div>
              <h3 className="text-white text-lg font-black mb-2">{t.promptPiezas}</h3>
              <p className="text-slate-400 text-xs font-bold mb-6">Ingresa la cantidad exacta para crear un botón temporal.</p>
              
              <input 
                type="number" 
                min="1"
                autoFocus
                value={modalEmpaque.cantidad}
                onChange={(e) => setModalEmpaque(prev => ({ ...prev, cantidad: e.target.value }))}
                className="w-full bg-slate-900 border-2 border-slate-600 text-white font-black text-center rounded-xl text-3xl p-4 outline-none focus:border-blue-500 transition-colors mb-6 shadow-inner"
                placeholder="0"
              />

              <div className="flex gap-3">
                 <button 
                   onClick={() => setModalEmpaque({ isOpen: false, codigo: null, cantidad: '' })} 
                   className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-black transition-colors border border-slate-600 active:scale-95 text-sm uppercase tracking-wider"
                 >
                   {t.cancelar}
                 </button>
                 <button 
                   onClick={handleConfirmarEmpaque} 
                   className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-900/50 transition-colors border border-blue-500 active:scale-95 text-sm uppercase tracking-wider"
                 >
                   {t.anadir}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default ListaConteo;
