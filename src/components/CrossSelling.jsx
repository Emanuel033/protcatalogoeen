import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';

function CrossSelling() {
  const { carrito, productos, agregarAlCarrito } = useApp();

  const sugerencias = useMemo(() => {
    if (!carrito.length || !productos.length) return [];

    const sugerenciasMap = new Map(); 
    const roscasBuscadas = new Set();
    const idsEnCarrito = new Set(carrito.map(c => c.id));
    const carritoInvertido = [...carrito].reverse();

    carritoInvertido.forEach(itemCarrito => {
      const nombreItem = (itemCarrito.name || '').toLowerCase();
      const codigoItem = itemCarrito.codigo_sistema;

      if (nombreItem.includes('s/tapa') || nombreItem.includes('sin tapa')) {
        const matchRosca = nombreItem.match(/(?:r-|rosca\s*)(\d{2,3})/i);
        if (matchRosca) roscasBuscadas.add(matchRosca[1]);
      }

      productos.forEach(prodCat => {
        if (idsEnCarrito.has(prodCat.id)) return; 

        const tipoItem = prodCat.tipo_item || 'PIEZA_BASE';
        const receta = prodCat.receta || prodCat.receta_desglose;
        let esParteDelKit = false;

        if (tipoItem === 'KIT_OFICIAL' && Array.isArray(receta)) {
          esParteDelKit = receta.some(ingrediente => ingrediente.codigo_pieza === codigoItem);
        } else if (tipoItem === 'KIT_FLEXIBLE' && receta && !Array.isArray(receta) && typeof receta === 'object') {
          esParteDelKit = !!receta[itemCarrito.id];
        }

        if (esParteDelKit) {
          if (!sugerenciasMap.has(prodCat.id)) {
            sugerenciasMap.set(prodCat.id, { 
              ...prodCat, 
              tipoSugerencia: 'SUGERENCIA DE KIT', 
              color: 'bg-amber-50 text-amber-700 border-amber-200/50',
              icon: 'fa-box-open',
              prioridad: 1 
            });
          }
        }
      });
    });

    if (roscasBuscadas.size > 0) {
      productos.forEach(prodCat => {
        if (idsEnCarrito.has(prodCat.id)) return;
        if (sugerenciasMap.has(prodCat.id)) return; 

        const nombreProd = (prodCat.name || '').toLowerCase();
        const esEnvase = /botella|porron|cubeta|envase|tarro|frasco|galon/.test(nombreProd);
        const esAccesorio = /tapa|tapon|sello|liner|valvula|pistola/.test(nombreProd);

        if (!esEnvase && esAccesorio) {
          roscasBuscadas.forEach(rosca => {
            const regexTapa = new RegExp(`r-?${rosca}|rosca\\s*${rosca}`, 'i');
            if (regexTapa.test(nombreProd)) {
              if (!sugerenciasMap.has(prodCat.id)) {
                sugerenciasMap.set(prodCat.id, { 
                  ...prodCat, 
                  tipoSugerencia: 'ACCESORIO COMPATIBLE', 
                  color: 'bg-indigo-50 text-indigo-700 border-indigo-200/50',
                  icon: 'fa-puzzle-piece',
                  prioridad: 2 
                });
              }
            }
          });
        }
      });
    }

    const sugerenciasFinales = Array.from(sugerenciasMap.values());
    sugerenciasFinales.sort((a, b) => a.prioridad - b.prioridad);
    return sugerenciasFinales.slice(0, 18);
  }, [carrito, productos]);

  if (sugerencias.length === 0) return null;

  return (
    <div className="bg-slate-50/50 py-6 border-t border-b border-slate-200/60 my-6">
      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 max-w-7xl mx-auto flex items-center gap-2">
        <i className="fa-solid fa-bolt text-amber-400"></i> Completa tu pedido
      </h4>
      
      <div className="flex overflow-x-auto gap-3 pb-4 px-4 snap-x hide-scroll max-w-7xl mx-auto">
        {sugerencias.map(prod => (
          <div key={prod.id} className="min-w-[220px] max-w-[220px] bg-white rounded-[1.25rem] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 p-3 flex flex-col snap-start shrink-0 transition-all hover:-translate-y-1 hover:shadow-lg">
            
            <div className="flex gap-3 items-center mb-3">
              <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 p-1.5 overflow-hidden">
                <img 
                  src={prod.image} alt={prod.name} 
                  className="w-full h-full object-contain mix-blend-multiply"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/50?text=Img'}
                />
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border leading-tight ${prod.color}`}>
                <i className={`fa-solid ${prod.icon} mr-1`}></i>
                {prod.tipoSugerencia}
              </span>
            </div>
            
            <span className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2 mb-3 flex-grow">
              {prod.name}
            </span>
            
            <button 
              onClick={() => agregarAlCarrito(prod, prod.piezas ? parseInt(prod.piezas) : 1)}
              className="w-full bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white text-xs font-bold py-2 rounded-xl transition-colors active:scale-95"
            >
              + Agregar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CrossSelling;
