import React, { useState, useEffect } from 'react';

// --- DICCIONARIO BILINGÜE ---
const diccionarios = {
  es: {
    stockSistema: "STOCK SISTEMA", totalFisico: "TOTAL FÍSICO", ajuste: "AJUSTE",
    entrada: "ENTRADA", salida: "SALIDA", ok: "CORRECTO", sueltas: "Sueltas (1pz)",
    paquete: "Paquete", caja: "Caja", btnNuevoEmpaque: "Añadir empaque no registrado",
    promptPiezas: "¿Cuántas piezas tiene este paquete?", pz_abrev: "pz",
    txtNuevoPaquete: "Nuevo Paquete ({pz}pz) ✨", listaVacia: "La lista está vacía.",
    listaVaciaSub: "Busca un producto arriba para agregarlo.",
    cancelar: "Cancelar", anadir: "Añadir",
    eliminar: "Quitar de la lista",
    confirmarEliminar: "¿Seguro que deseas quitarlo?", 
    siQuitar: "Sí, quitar",
    sumarExtra: "+ Añadir Extra",
    promptSuma: "¿Cuántas piezas MÁS encontraste?",
    btnSumar: "Sumar"
  },
  fr: {
    stockSistema: "STOCK SYSTÈME", totalFisico: "TOTAL PHYSIQUE", ajuste: "AJUSTEMENT",
    entrada: "ENTRÉE", salida: "SORTIE", ok: "CORRECT", sueltas: "Unité (1pc)",
    paquete: "Paquet", caja: "Boîte", btnNuevoEmpaque: "Ajouter un paquet",
    promptPiezas: "Nombre de pièces ?", pz_abrev: "pc",
    txtNuevoPaquete: "Paquet ({pz}pc) ✨", listaVacia: "La liste est vide.",
    listaVaciaSub: "Recherchez un produit ci-dessus.",
    cancelar: "Annuler", anadir: "Ajouter",
    eliminar: "Retirer de la liste",
    confirmarEliminar: "Êtes-vous sûr de vouloir le retirer ?", 
    siQuitar: "Oui, retirer",
    sumarExtra: "+ Ajouter Plus",
    promptSuma: "Combien de pièces EN PLUS avez-vous trouvé ?",
    btnSumar: "Ajouter"
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
  onAutoCompletar = () => {},
  soloLectura = false,
  modoSeleccion = false,
  seleccionados = [],
  onToggleSeleccion = () => {}
}) => {
  const t = diccionarios[idioma] || diccionarios.es;

  // ESTADOS LOCALES
  const [expandido, setExpandido] = useState(null);
  const [prevLength, setPrevLength] = useState(0);
  
  // ESTADOS DE MODALES
  const [modalEmpaque, setModalEmpaque] = useState({ isOpen: false, codigo: null, cantidad: '' });
  const [modalEliminar, setModalEliminar] = useState({ isOpen: false, codigo: null, nombre: '' });
  const [modalSumaRapida, setModalSumaRapida] = useState({ isOpen: false, codigo: null, varId: null, cantidad: '' });

  useEffect(() => {
    if (listaConteo && listaConteo.length > prevLength && listaConteo.length > 0) {
      setExpandido(listaConteo[0].codigo);
    }
    setPrevLength(listaConteo?.length || 0);
  }, [listaConteo, prevLength]);

  useEffect(() => {
    if (modoSeleccion) {
      setExpandido(null);
    }
  }, [modoSeleccion]);

  const toggleExpandir = (codigo) => {
    setExpandido(prev => prev === codigo ? null : codigo);
  };

  const handleConfirmarEmpaque = () => {
    if (modalEmpaque.cantidad && parseInt(modalEmpaque.cantidad) > 0) {
      onAgregarEmpaque(modalEmpaque.codigo, modalEmpaque.cantidad);
    }
    setModalEmpaque({ isOpen: false, codigo: null, cantidad: '' });
  };

  const handleConfirmarSumaRapida = () => {
    const sum = parseInt(modalSumaRapida.cantidad);
    if (!isNaN(sum) && sum > 0) {
      onCambiarCant(modalSumaRapida.codigo, modalSumaRapida.varId, sum);
    }
    setModalSumaRapida({ isOpen: false, codigo: null, varId: null, cantidad: '' });
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
    <div className="space-y-4 landscape:space-y-2 pb-10">
      {listaConteo.map((item) => {
        const ajuste = item.totalFisico - item.stockSistema;
        const isSelected = seleccionados.includes(item.codigo);
        const isExpanded = expandido === item.codigo && !modoSeleccion; 
        
        const bgAjuste = ajuste === 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' :
                         ajuste > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
                         'bg-red-500/20 text-red-300 border-red-500/50';

        const textAjuste = ajuste === 0 ? 'text-emerald-400' : ajuste > 0 ? 'text-amber-400' : 'text-red-400';

        const resumenDetalle = item.variantes
          .filter(v => v.contadas > 0)
          .map(v => `${v.contadas}x${v.pz}`)
          .join(', ');

        const cardStyle = modoSeleccion
          ? (isSelected ? 'border-blue-500 bg-blue-900/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-slate-700 bg-slate-900/80 opacity-70')
          : (isExpanded ? 'border-slate-500 bg-slate-800 shadow-2xl scale-[1.02] landscape:scale-[1.01] my-6 landscape:my-2' : 'border-slate-700 bg-slate-800/80 hover:bg-slate-800');
        
        return (
          <div key={item.codigo} className={`relative rounded-3xl landscape:rounded-2xl overflow-hidden transition-all duration-300 border ${cardStyle}`}>
            
            <div 
              className={`p-4 landscape:p-2 landscape:px-3 flex items-center gap-3.5 landscape:gap-2.5 cursor-pointer ${modoSeleccion ? 'active:bg-slate-700' : ''}`}
              onClick={() => modoSeleccion ? onToggleSeleccion(item.codigo) : toggleExpandir(item.codigo)}
            >
              {modoSeleccion && (
                <div className="shrink-0 flex items-center justify-center">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800 border-slate-600'}`}>
                    <i className="fas fa-check text-sm"></i>
                  </div>
                </div>
              )}

              <div 
                className="w-14 h-14 landscape:w-10 landscape:h-10 bg-white rounded-xl landscape:rounded-lg flex items-center justify-center p-1.5 shadow-inner shrink-0 relative z-20"
                onClick={(e) => {
                  if (!modoSeleccion && onZoomImagen) {
                    e.stopPropagation(); 
                    onZoomImagen(item.imagen);
                  }
                }}
              >
                <img 
                  src={item.imagen || 'https://via.placeholder.com/100?text=S/I'} 
                  alt={item.nombre} 
                  className="w-full h-full object-contain mix-blend-multiply"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=S/I'}
                />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-white font-black text-[13px] landscape:text-[11px] leading-tight truncate uppercase">
                  {item.nombre}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                   <p className="text-blue-400 font-black text-[10px] landscape:text-[9px] tracking-widest uppercase">
                     <i className="fas fa-barcode mr-1 opacity-70"></i>{item.codigo}
                   </p>
                   {resumenDetalle && (
                     <p className="text-[10px] landscape:text-[9px] font-bold text-slate-400 italic truncate border-l border-slate-700 pl-2">
                       {resumenDetalle}
                     </p>
                   )}
                </div>
              </div>

              {item.totalFisico === 0 && item.stockSistema > 0 && !modoSeleccion && !soloLectura && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onAutoCompletar(item.codigo); }}
                  className="shrink-0 flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 px-3 py-2 landscape:py-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                >
                  <i className="fas fa-check-double text-xs"></i> OK ({item.stockSistema})
                </button>
              )}

              <div className="shrink-0 flex flex-col items-end pr-1 min-w-[50px]">
                <p className={`text-xl landscape:text-lg font-black leading-none ${modoSeleccion && isSelected ? 'text-blue-200' : 'text-white'}`}>
                  {item.totalFisico}
                </p>
                <p className={`text-[10px] landscape:text-[8px] font-black mt-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 ${textAjuste}`}>
                  {ajuste > 0 ? `+${ajuste}` : ajuste}
                </p>
              </div>

              {!modoSeleccion && (
                <div className={`shrink-0 w-8 h-8 landscape:w-6 landscape:h-6 flex items-center justify-center text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`}>
                  <i className="fas fa-chevron-down landscape:text-sm"></i>
                </div>
              )}
            </div>

            {/* ✨ CONTENEDOR DESPLEGABLE - 2 Columnas en Landscape */}
            <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-5 pt-1 landscape:p-3 landscape:pt-1 border-t border-slate-700/50 mt-2 bg-slate-900/20 landscape:grid landscape:grid-cols-2 landscape:gap-4 landscape:items-start">
                
                {/* COLUMNA IZQUIERDA (Landscape): Captura de Cantidades */}
                <div className="flex flex-col">
                  {/* Variantes */}
                  <div className="space-y-3 landscape:space-y-2 mb-6 landscape:mb-3 mt-4 landscape:mt-2">
                    {item.variantes.map((v) => {
                      const nombreVariante = v.isFantasma 
                        ? t.txtNuevoPaquete.replace('{pz}', v.pz) 
                        : (v.id === 'sueltas' ? t.sueltas : `${t.paquete} (${v.pz}${t.pz_abrev})`);
                      
                      const isSueltas = v.id === 'sueltas';
                      
                      return (
                        <div key={v.id} className="flex flex-col gap-2.5 landscape:gap-1.5 bg-slate-900 p-3.5 landscape:p-2.5 rounded-2xl landscape:rounded-xl border border-slate-700 shadow-inner">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-slate-200 text-xs landscape:text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                              <i className={`fas ${isSueltas ? 'fa-cube text-slate-400' : 'fa-boxes text-blue-400'} text-sm landscape:text-xs`}></i>
                              {nombreVariante}
                            </span>
                            <span className="text-[10px] landscape:text-[9px] font-black text-slate-400 uppercase bg-slate-800 px-2.5 py-1 landscape:py-0.5 rounded-md border border-slate-600 shadow-sm">
                              x{v.pz}
                            </span>
                          </div>
                          
                          {!soloLectura ? (
                            <div className="flex items-center gap-2 mt-1">
                              <button 
                                onMouseDown={(e) => { e.preventDefault(); onIniciarDictado(item.codigo, v.id, 'mic', ''); }}
                                onTouchStart={(e) => { e.preventDefault(); onIniciarDictado(item.codigo, v.id, 'mic', ''); }}
                                className="w-14 h-14 landscape:w-10 landscape:h-10 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 hover:text-red-400 hover:border-red-400 active:scale-95 transition-all flex items-center justify-center shrink-0"
                              >
                                <i className="fas fa-microphone text-lg landscape:text-sm"></i>
                              </button>

                              <div className="flex-1 flex items-center bg-slate-800 border border-slate-600 rounded-xl overflow-hidden shadow-sm h-14 landscape:h-10">
                                <button 
                                  onClick={() => onCambiarCant(item.codigo, v.id, -1)}
                                  className="w-14 landscape:w-10 h-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center active:bg-slate-500 transition-colors border-r border-slate-600 shrink-0"
                                >
                                  <i className="fas fa-minus"></i>
                                </button>
                                
                                <input 
                                  type="number" 
                                  min="0"
                                  value={v.contadas || ''} 
                                  onChange={(e) => onManualCant(item.codigo, v.id, e.target.value)}
                                  className="w-full h-full bg-transparent text-white font-black text-center text-xl landscape:text-base outline-none placeholder-slate-600"
                                  placeholder="0"
                                />

                                <button 
                                  onClick={() => onCambiarCant(item.codigo, v.id, 1)}
                                  className="w-14 landscape:w-10 h-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center active:bg-blue-400 transition-colors border-l border-blue-500 shrink-0"
                                >
                                  <i className="fas fa-plus"></i>
                                </button>
                              </div>

                              {isSueltas && (
                                <button 
                                  onClick={() => setModalSumaRapida({ isOpen: true, codigo: item.codigo, varId: v.id, cantidad: '' })}
                                  className="w-14 h-14 landscape:w-10 landscape:h-10 bg-emerald-600/20 border border-emerald-500/40 rounded-xl text-emerald-400 hover:bg-emerald-600/40 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-sm"
                                  title="Suma Rápida"
                                >
                                  <div className="flex items-center gap-1 opacity-90">
                                     <i className="fas fa-plus text-sm landscape:text-[10px]"></i>
                                     <i className="fas fa-cube text-sm landscape:text-xs"></i>
                                  </div>
                                </button>
                              )}

                              {!isSueltas && (
                                <button 
                                  onClick={() => onAbrirCalculadora(item.codigo, v.id)}
                                  className="w-14 h-14 landscape:w-10 landscape:h-10 bg-purple-600/20 border border-purple-500/40 rounded-xl text-purple-300 hover:bg-purple-600/40 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-sm"
                                  title="Calculadora de Estibas"
                                >
                                  <i className="fas fa-calculator text-lg landscape:text-sm"></i>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-14 landscape:h-10 bg-slate-800 border border-slate-600 rounded-xl text-white font-black text-2xl landscape:text-lg shadow-inner mt-1">
                              {v.contadas || 0}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!soloLectura && (
                    <button 
                      onClick={() => setModalEmpaque({ isOpen: true, codigo: item.codigo, cantidad: '' })} 
                      className="w-full text-center bg-slate-900 border border-dashed border-slate-500 hover:bg-slate-800 text-blue-400 font-black text-[11px] landscape:text-[9px] py-3.5 landscape:py-2 mb-5 landscape:mb-0 rounded-xl uppercase tracking-wider transition-colors active:scale-[0.98] flex justify-center items-center gap-2"
                    >
                      <i className="fas fa-box-open"></i> {t.btnNuevoEmpaque}
                    </button>
                  )}
                </div>

                {/* COLUMNA DERECHA (Landscape): Totales y Ajuste */}
                <div className="flex flex-col h-full justify-between landscape:mt-2">
                  <div>
                    <div className="grid grid-cols-2 gap-3 landscape:gap-2 mb-3 landscape:mb-2">
                      <div className="bg-slate-900 rounded-2xl landscape:rounded-xl p-4 landscape:p-2 border border-slate-600 text-center shadow-inner relative overflow-hidden">
                        <p className="text-[10px] landscape:text-[8px] font-black text-slate-400 uppercase tracking-widest relative z-10">{t.stockSistema}</p>
                        <p className="text-3xl landscape:text-xl font-black text-slate-300 relative z-10 mt-1">{item.stockSistema}</p>
                      </div>
                      <div className="bg-blue-600/20 rounded-2xl landscape:rounded-xl p-4 landscape:p-2 border border-blue-500/40 text-center shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                        <p className="text-[10px] landscape:text-[8px] font-black text-blue-300 uppercase tracking-widest relative z-10">{t.totalFisico}</p>
                        <p className="text-4xl landscape:text-2xl font-black text-white relative z-10 mt-1 drop-shadow-md">{item.totalFisico}</p>
                      </div>
                    </div>
                    
                    <div className={`flex justify-center items-center py-3 landscape:py-2 px-4 rounded-xl landscape:rounded-lg font-black text-sm landscape:text-xs uppercase tracking-wider border shadow-sm ${bgAjuste}`}>
                      <span className="mr-2 opacity-80">{t.ajuste}:</span>
                      {ajuste > 0 ? `+${ajuste}` : ajuste} {ajuste === 0 ? `(${t.ok})` : ''}
                    </div>
                  </div>

                  {!soloLectura && (
                    <div className="mt-4 landscape:mt-2">
                      <button 
                        onClick={() => setModalEliminar({ isOpen: true, codigo: item.codigo, nombre: item.nombre })}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-black text-xs landscape:text-[10px] py-3 landscape:py-2 rounded-xl landscape:rounded-lg uppercase tracking-wider transition-all active:scale-95 flex justify-center items-center gap-2"
                      >
                        <i className="fas fa-trash-alt"></i> {t.eliminar}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        );
      })}

      {/* LOS MODALES PERMANECEN IGUAL... (SE AUTO-ADAPTAN AL CENTRO DE LA PANTALLA) */}
      {modalEmpaque.isOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-600 p-6 landscape:p-4 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in-up text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-500/40 landscape:hidden">
                <i className="fas fa-box text-3xl text-blue-400"></i>
              </div>
              <h3 className="text-white text-lg font-black mb-2">{t.promptPiezas}</h3>
              <p className="text-slate-400 text-xs font-bold mb-6 landscape:mb-3">Ingresa la cantidad exacta para crear un botón temporal.</p>
              
              <input type="number" min="1" autoFocus value={modalEmpaque.cantidad} onChange={(e) => setModalEmpaque(prev => ({ ...prev, cantidad: e.target.value }))} className="w-full bg-slate-900 border-2 border-slate-600 text-white font-black text-center rounded-xl text-3xl landscape:text-xl p-4 landscape:p-2 outline-none focus:border-blue-500 transition-colors mb-6 landscape:mb-3 shadow-inner" placeholder="0" />

              <div className="flex gap-3">
                 <button onClick={() => setModalEmpaque({ isOpen: false, codigo: null, cantidad: '' })} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 landscape:py-2 rounded-xl font-black transition-colors">{t.cancelar}</button>
                 <button onClick={handleConfirmarEmpaque} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 landscape:py-2 rounded-xl font-black shadow-lg shadow-blue-900/50 transition-colors border border-blue-500">{t.anadir}</button>
              </div>
           </div>
        </div>
      )}

      {modalEliminar.isOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-600 p-6 landscape:p-4 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in-up text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-500/40 landscape:hidden">
                <i className="fas fa-trash-alt text-3xl text-red-400"></i>
              </div>
              <h3 className="text-white text-lg font-black mb-2">{t.confirmarEliminar}</h3>
              <p className="text-slate-400 text-xs font-bold mb-6 landscape:mb-3 truncate px-2">{modalEliminar.nombre}</p>

              <div className="flex gap-3">
                 <button onClick={() => setModalEliminar({ isOpen: false, codigo: null, nombre: '' })} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 landscape:py-2 rounded-xl font-black transition-colors">{t.cancelar}</button>
                 <button onClick={() => { onEliminar(modalEliminar.codigo); setModalEliminar({ isOpen: false, codigo: null, nombre: '' }); }} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-4 landscape:py-2 rounded-xl font-black shadow-lg shadow-red-900/50 transition-colors border border-red-500">{t.siQuitar}</button>
              </div>
           </div>
        </div>
      )}

      {modalSumaRapida.isOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-600 p-6 landscape:p-4 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in-up text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/40 landscape:hidden">
                <i className="fas fa-layer-group text-3xl text-emerald-400"></i>
              </div>
              <h3 className="text-white text-lg font-black mb-2">{t.promptSuma}</h3>
              <p className="text-slate-400 text-xs font-bold mb-6 landscape:mb-3">Esta cantidad se SUMARÁ a las que ya tenías contadas.</p>
              
              <div className="relative mb-6 landscape:mb-3">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-2xl landscape:text-xl">+</div>
                <input type="number" min="1" autoFocus value={modalSumaRapida.cantidad} onChange={(e) => setModalSumaRapida(prev => ({ ...prev, cantidad: e.target.value }))} className="w-full bg-slate-900 border-2 border-slate-600 text-emerald-400 font-black text-center rounded-xl text-3xl landscape:text-xl p-4 landscape:p-2 pl-10 outline-none focus:border-emerald-500 transition-colors shadow-inner" placeholder="0" />
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setModalSumaRapida({ isOpen: false, codigo: null, varId: null, cantidad: '' })} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 landscape:py-2 rounded-xl font-black transition-colors">{t.cancelar}</button>
                 <button onClick={handleConfirmarSumaRapida} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 landscape:py-2 rounded-xl font-black shadow-lg shadow-emerald-900/50 transition-colors border border-emerald-500">{t.btnSumar}</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default ListaConteo;
