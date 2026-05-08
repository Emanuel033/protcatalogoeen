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
    stockSistema: "STOCK SYSTÈME", totalFisique: "TOTAL PHYSIQUE", ajuste: "AJUSTEMENT",
    entrada: "ENTRÉE", salida: "SORTIE", ok: "CORRECT", sueltas: "Unité (1pc)",
    paquete: "Paquet", caja: "Boîte", btnNuevoEmpaque: "Ajouter paquet",
    promptPiezas: "Nombre de pièces ?", pz_abrev: "pc",
    txtNuevoPaquete: "Paquet ({pz}pc) ✨", listaVacia: "La liste est vide.",
    listaVaciaSub: "Recherchez un produit ci-dessus."
  }
};

const ListaConteo = ({ 
  listaConteo, idioma, onSumaPz, onRestaPz, onActualizarCalculadora, 
  onQuitarProducto, onAgregarEmpaque, setCalcActiva,
  soloLectura = false // <-- Propiedad para el modo historial
}) => {
  const t = diccionarios[idioma] || diccionarios.es;

  if (listaConteo.length === 0) {
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
      {listaConteo.map((item) => (
        <div key={item.codigo} className="relative bg-slate-800/40 border border-slate-700/50 rounded-3xl p-5 overflow-hidden group">
          
          {/* BOTÓN ELIMINAR (Solo si no es lectura) */}
          {!soloLectura && (
            <button 
              onClick={() => onQuitarProducto(item.codigo)}
              className="absolute -top-3 -right-3 w-10 h-10 bg-slate-900 border-2 border-slate-700 rounded-full text-slate-500 hover:text-red-400 hover:border-red-400 transition-all flex items-center justify-center z-10"
            >
              <i className="fas fa-times"></i>
            </button>
          )}

          <div className="flex gap-4 mb-5">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-2 shadow-xl shrink-0">
              <img 
                src={item.imagen} 
                alt={item.nombre} 
                className="w-full h-full object-contain mix-blend-multiply"
                onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=S/I'}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-black text-sm leading-tight mb-1 line-clamp-2 uppercase">
                {item.nombre}
              </h3>
              <p className="text-blue-400 font-mono text-[10px] tracking-widest">{item.codigo}</p>
            </div>
          </div>

          {/* Variantes de Conteo */}
          <div className="space-y-2 mb-5">
            {item.variantes.map((v) => (
              <div key={v.id} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-700/30">
                <span className="text-slate-300 text-[11px] font-bold uppercase ml-2">
                  {v.nombre}
                </span>
                
                {!soloLectura ? (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => onRestaPz(item.codigo, v.id)}
                      className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl text-white flex items-center justify-center active:scale-90 transition"
                    >
                      <i className="fas fa-minus text-xs"></i>
                    </button>
                    
                    <div className="w-14 relative">
                      <input 
                        type="number"
                        value={v.cantidad}
                        onChange={(e) => onActualizarCalculadora(item.codigo, v.id, parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 text-white font-black text-center py-2 rounded-xl text-sm outline-none focus:border-blue-500"
                      />
                      <button 
                        onClick={() => setCalcActiva({ isOpen: true, codigo: item.codigo, varId: v.id, nombre: item.nombre })}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full text-[8px] flex items-center justify-center shadow-lg"
                      >
                        <i className="fas fa-calculator"></i>
                      </button>
                    </div>

                    <button 
                      onClick={() => onSumaPz(item.codigo, v.id)}
                      className="w-10 h-10 bg-blue-600 border border-blue-500 rounded-xl text-white flex items-center justify-center active:scale-90 transition shadow-lg shadow-blue-900/20"
                    >
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-700 text-white font-black text-sm">
                    {v.cantidad} {v.id === '1pz' ? t.pz_abrev : ''}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!soloLectura && (
            <button 
              onClick={() => {
                const pz = prompt(t.promptPiezas);
                if (pz) onAgregarEmpaque(item.codigo, pz);
              }}
              className="w-full text-center text-[10px] text-blue-400 font-bold py-3 mb-4 hover:bg-slate-700 rounded-xl border border-dashed border-slate-600 uppercase transition-colors"
            >
              <i className="fas fa-plus mr-1"></i> {t.btnNuevoEmpaque}
            </button>
          )}

          {/* Totales */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-700 text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.stockSistema}</p>
              <p className="text-2xl font-black text-slate-400">{item.stockSistema}</p>
            </div>
            <div className="bg-blue-600/10 rounded-2xl p-3 border border-blue-500/30 text-center">
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{t.totalFisico}</p>
              <p className="text-3xl font-black text-white">{item.totalFisico}</p>
            </div>
          </div>
          
          <div className={`flex justify-center items-center py-2 px-4 rounded-xl font-black text-xs uppercase tracking-tighter ${
            item.ajuste === 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            item.ajuste > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <span className="mr-2 opacity-60 font-bold">{t.ajuste}:</span>
            {item.ajuste > 0 ? `+${item.ajuste}` : item.ajuste} {item.ajuste === 0 ? `(${t.ok})` : ''}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListaConteo;
