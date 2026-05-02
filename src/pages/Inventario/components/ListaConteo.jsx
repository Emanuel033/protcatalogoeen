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
  listaConteo, idioma, onCambiarCant, onManualCant, onEliminar, onAgregarEmpaque, 
  onAbrirCalculadora, onIniciarDictado, 
  onZoomImagen // 👉 NUEVA PROP PARA EL LIGHTBOX
}) => {
  const t = diccionarios[idioma];

  if (listaConteo.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 flex flex-col items-center">
        <i className="fas fa-boxes text-6xl mb-4 text-slate-700"></i>
        <p className="font-bold text-lg">{t.listaVacia}</p>
        <p className="text-sm mt-1">{t.listaVaciaSub}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {listaConteo.map((item) => {
        const diferencia = item.totalFisico - item.stockSistema;
        let borderColor = 'border-slate-700';
        let badgeHtml = null;

        if (diferencia > 0) {
          borderColor = 'border-emerald-500/50';
          badgeHtml = <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] font-black tracking-wider"><i className="fas fa-arrow-up"></i> {t.entrada} (+{diferencia})</span>;
        } else if (diferencia < 0) {
          borderColor = 'border-red-500/50';
          badgeHtml = <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-[10px] font-black tracking-wider"><i className="fas fa-arrow-down"></i> {t.salida} ({diferencia})</span>;
        } else {
          badgeHtml = <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-[10px] font-black tracking-wider"><i className="fas fa-check"></i> {t.ok}</span>;
        }

        return (
          <div key={item.codigo} className={`bg-slate-800 p-4 rounded-3xl border ${borderColor} transition-colors shadow-lg`}>
            
            {/* 👉 HEADER CON LA IMAGEN AGREGADA */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 flex-1 pr-4">
                
                {/* LA FOTO DEL PRODUCTO */}
                <div 
                  className="w-14 h-14 shrink-0 bg-white rounded-xl border-2 border-slate-700 overflow-hidden cursor-pointer shadow-md active:scale-95 transition-transform"
                  onClick={() => item.imagen && onZoomImagen(item.imagen)}
                  title="Toca para ver en grande"
                >
                  <img 
                    src={item.imagen || 'https://dummyimage.com/150x150/e2e8f0/0f172a&text=Sin+Imagen'} 
                    alt={item.nombre}
                    className="w-full h-full object-contain mix-blend-multiply"
                    onError={(e) => e.target.src = 'https://dummyimage.com/150x150/e2e8f0/0f172a&text=Error'}
                  />
                </div>

                {/* NOMBRE Y CÓDIGO */}
                <div>
                  <h3 className="font-black text-base text-white leading-tight line-clamp-2">{item.nombre}</h3>
                  <p className="font-mono text-[10px] text-blue-400 mt-1">{item.codigo}</p>
                </div>

              </div>
              <button onClick={() => onEliminar(item.codigo)} className="text-slate-500 hover:text-red-400 p-2 shrink-0 bg-slate-900 rounded-full h-10 w-10 flex items-center justify-center">
                <i className="fas fa-trash"></i>
              </button>
            </div>

            {/* Variantes del producto */}
            <div className="bg-slate-900/50 rounded-2xl p-3 mb-2">
              {item.variantes.map((v, index) => {
                const letterIndex = String.fromCharCode(65 + index);
                let label = v.id === 'sueltas' ? t.sueltas : (v.isFantasma ? t.txtNuevoPaquete.replace('{pz}', v.pz) : (v.sku ? `${v.sku} (${v.pz}${t.pz_abrev})` : `${v.pz >= 500 ? t.caja : t.paquete} (${v.pz}${t.pz_abrev})`));

                return (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div className="flex items-center gap-2 flex-1 pr-2 truncate">
                      <span className="bg-slate-700 text-blue-400 font-black text-[10px] px-2 py-0.5 rounded border border-slate-600 shadow-sm">[ {letterIndex} ]</span>
                      <span className={`text-xs font-bold ${v.isFantasma ? 'text-amber-400' : 'text-slate-400'} truncate`}>{label}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => onAbrirCalculadora(item.codigo, v.id)} className="w-9 h-9 rounded-lg bg-slate-800 text-blue-400 border border-slate-700"><i className="fas fa-calculator text-sm"></i></button>
                      
                      {/* BOTÓN DE DICTADO PARA ESTA VARIANTE */}
                      <button onClick={(e) => onIniciarDictado(item.codigo, v.id, e.currentTarget, letterIndex)} className="w-9 h-9 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700 hover:bg-emerald-900/30 transition-colors" title="Dictar cantidad">
                        <i className="fas fa-microphone text-sm"></i>
                      </button>
                      
                      <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-700">
                        <button onClick={() => onCambiarCant(item.codigo, v.id, -1)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300"><i className="fas fa-minus text-xs"></i></button>
                        <input 
                          type="number" min="0" value={v.contadas} 
                          onChange={(e) => onManualCant(item.codigo, v.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-10 text-center font-black text-white bg-transparent outline-none" 
                        />
                        <button onClick={() => onCambiarCant(item.codigo, v.id, 1)} className="w-8 h-8 rounded-lg bg-blue-600 text-white"><i className="fas fa-plus text-xs"></i></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón nuevo empaque */}
            <button onClick={() => {
              const pzInput = prompt(t.promptPiezas, "12");
              if (pzInput) onAgregarEmpaque(item.codigo, pzInput);
            }} className="w-full text-center text-[10px] text-blue-400 font-bold py-2.5 mb-4 hover:bg-slate-700 rounded-xl border border-dashed border-slate-600 uppercase transition-colors">
              <i className="fas fa-plus mr-1"></i> <span>{t.btnNuevoEmpaque}</span>
            </button>

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
            <div className="flex justify-between items-center px-2 mt-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.ajuste}:</span>
              {badgeHtml}
            </div>

          </div>
        );
      })}
    </div>
  );
};

export default ListaConteo;