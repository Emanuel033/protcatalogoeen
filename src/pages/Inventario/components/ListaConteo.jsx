import React from 'react';

const diccionarios = {
  es: {
    stockSistema: "STOCK SISTEMA", totalFisico: "TOTAL FÍSICO", ajuste: "AJUSTE",
    entrada: "ENTRADA", salida: "SALIDA", ok: "CORRECTO", sueltas: "Sueltas (1pz)",
    paquete: "Paquete", caja: "Caja", btnNuevoEmpaque: "Añadir empaque no registrado",
    promptPiezas: "¿Cuántas piezas tiene este nuevo paquete?", pz_abrev: "pz",
    txtNuevoPaquete: "Nuevo Paquete ({pz}pz) ✨", listaVacia: "La lista está vacía.",
    listaVaciaSub: "Busca un producto arriba para agregarlo."
  },
  fr: {
    stockSistema: "STOCK SYSTÈME", totalFisico: "TOTAL PHYSIQUE", ajuste: "AJUSTEMENT",
    entrada: "ENTRÉE", salida: "SORTIE", ok: "CORRECT", sueltas: "Unité (1pc)",
    paquete: "Paquet", caja: "Boîte", btnNuevoEmpaque: "Ajouter paquet",
    promptPiezas: "Nombre de pièces ?", pz_abrev: "pc",
    txtNuevoPaquete: "Paquet ({pz}pc) ✨", listaVacia: "La liste est vide.",
    listaVaciaSub: "Recherchez un produit ci-dessus."
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
  soloLectura = false // <-- NUEVA VARIABLE PARA MODO HISTORIAL
}) => {
  const t = diccionarios[idioma] || diccionarios.es;

  if (!listaConteo || listaConteo.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-700">
          <i className="fas fa-clipboard-list text-3xl text-slate-500"></i>
        </div>
        <h3 className="text-white font-bold">{t.listaVacia}</h3>
        <p className="text-slate-500 text-xs mt-1">{t.listaVaciaSub}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {listaConteo.map((item) => {
        const ajuste = item.totalFisico - item.stockSistema;
        const bgAjuste = ajuste === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                         ajuste > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                         'bg-red-500/10 text-red-400 border-red-500/20';
        
        return (
          <div key={item.codigo} className="relative bg-slate-800/40 border border-slate-700/50 rounded-3xl p-5 overflow-hidden group shadow-lg">
            
            {/* Botón Eliminar (Se oculta en modo historial) */}
            {!soloLectura && (
              <button 
                onClick={() => onEliminar(item.codigo)}
                className="absolute -top-3 -right-3 w-10 h-10 bg-slate-900 border-2 border-slate-700 rounded-full text-slate-500 hover:text-red-400 hover:border-red-400 transition-all flex items-center justify-center z-10"
              >
                <i className="fas fa-times"></i>
              </button>
            )}

            {/* Cabecera Producto */}
            <div className="flex gap-4 mb-5">
              <div 
                className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-2 shadow-xl shrink-0 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onZoomImagen && onZoomImagen(item.imagen)}
              >
                <img 
                  src={item.imagen || 'https://via.placeholder.com/100?text=S/I'} 
                  alt={item.nombre} 
                  className="w-full h-full object-contain mix-blend-multiply"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=S/I'}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-white font-black text-sm leading-tight mb-1 line-clamp-2 uppercase">
                  {item.nombre}
                </h3>
                <p className="text-blue-400 font-mono text-[10px] tracking-widest bg-blue-500/10 self-start px-2 py-0.5 rounded-md border border-blue-500/20">{item.codigo}</p>
              </div>
            </div>

            {/* Variantes */}
            <div className="space-y-3 mb-5">
              {item.variantes.map((v) => {
                const nombreVariante = v.isFantasma 
                  ? t.txtNuevoPaquete.replace('{pz}', v.pz) 
                  : (v.id === 'sueltas' ? t.sueltas : `${t.paquete} (${v.pz}${t.pz_abrev})`);
                
                return (
                  <div key={v.id} className="flex flex-col gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-slate-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
                        <i className={`fas ${v.id === 'sueltas' ? 'fa-cube text-slate-500' : 'fa-boxes text-blue-400'}`}></i>
                        {nombreVariante}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-800 px-2 py-0.5 rounded-md">
                        x{v.pz}
                      </span>
                    </div>
                    
                    {/* CONTROLES: Se muestran normales si no es Solo Lectura */}
                    {!soloLectura ? (
                      <div className="flex items-center gap-2 mt-1">
                        <button 
                          onMouseDown={(e) => { e.preventDefault(); onIniciarDictado(item.codigo, v.id, 'mic', ''); }}
                          onTouchStart={(e) => { e.preventDefault(); onIniciarDictado(item.codigo, v.id, 'mic', ''); }}
                          className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-red-400 active:scale-90 transition flex items-center justify-center shrink-0"
                        >
                          <i className="fas fa-microphone"></i>
                        </button>

                        <button 
                          onClick={() => onCambiarCant(item.codigo, v.id, -1)}
                          className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-xl text-white hover:bg-slate-700 active:scale-90 transition flex items-center justify-center shrink-0"
                        >
                          <i className="fas fa-minus text-sm"></i>
                        </button>
                        
                        <div className="flex-1 relative">
                          <input 
                            type="number" 
                            min="0"
                            value={v.contadas || ''} 
                            onChange={(e) => onManualCant(item.codigo, v.id, e.target.value)}
                            className="w-full h-12 bg-slate-900 border-2 border-slate-700 text-white font-black text-center rounded-xl text-lg outline-none focus:border-blue-500 transition-colors"
                            placeholder="0"
                          />
                        </div>

                        <button 
                          onClick={() => onCambiarCant(item.codigo, v.id, 1)}
                          className="w-12 h-12 bg-blue-600 border border-blue-500 rounded-xl text-white hover:bg-blue-500 active:scale-90 transition shadow-lg shadow-blue-900/20 flex items-center justify-center shrink-0"
                        >
                          <i className="fas fa-plus text-sm"></i>
                        </button>

                        <button 
                          onClick={() => onAbrirCalculadora(item.codigo, v.id)}
                          className="w-12 h-12 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400 hover:bg-purple-600/40 active:scale-90 transition flex items-center justify-center shrink-0"
                        >
                          <i className="fas fa-calculator"></i>
                        </button>
                      </div>
                    ) : (
                      // CONTROLES HISTORIAL: Muestra solo la cantidad fija
                      <div className="flex items-center justify-center h-12 bg-slate-800 border border-slate-700 rounded-xl text-white font-black text-xl shadow-inner">
                        {v.contadas || 0}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botón Añadir Empaque (Oculto en modo historial) */}
            {!soloLectura && (
              <button onClick={() => {
                const pzInput = prompt(t.promptPiezas);
                if (pzInput) onAgregarEmpaque(item.codigo, pzInput);
              }} className="w-full text-center text-[10px] text-blue-400 font-bold py-2.5 mb-4 hover:bg-slate-700 rounded-xl border border-dashed border-slate-600 uppercase transition-colors">
                <i className="fas fa-plus mr-1"></i> <span>{t.btnNuevoEmpaque}</span>
              </button>
            )}

            {/* Totales */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="bg-slate-900 rounded-2xl p-3 border border-slate-700 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.stockSistema}</p>
                <p className="text-2xl font-black text-slate-300">{item.stockSistema}</p>
              </div>
              <div className="bg-blue-900/30 rounded-2xl p-3 border border-blue-900/50 text-center">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{t.totalFisico}</p>
                <p className="text-3xl font-black text-white">{item.totalFisico}</p>
              </div>
            </div>
            
            {/* Ajuste Bottom */}
            <div className={`flex justify-center items-center py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-tighter border ${bgAjuste}`}>
              <span className="mr-2 opacity-60 font-bold">{t.ajuste}:</span>
              {ajuste > 0 ? `+${ajuste}` : ajuste} {ajuste === 0 ? `(${t.ok})` : ''}
            </div>

          </div>
        );
      })}
    </div>
  );
};

export default ListaConteo;
