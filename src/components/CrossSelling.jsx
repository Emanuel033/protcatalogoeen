import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';

function CrossSelling() {
  const { carrito, productos, agregarAlCarrito } = useApp();

  const sugerencias = useMemo(() => {
    if (!carrito.length || !productos.length) return [];

    const sugerenciasMap = new Map(); // Usamos Map para evitar sugerir el mismo producto 2 veces
    const roscasBuscadas = new Set();
    
    // Diccionarios rápidos para saber qué hay en el carrito
    const idsEnCarrito = new Set(carrito.map(c => c.id));
    const codigosEnCarrito = new Set(carrito.map(c => c.codigo_sistema).filter(Boolean));

    // 1. ANALIZAMOS EL CARRITO
    carrito.forEach(itemCarrito => {
      const nombreItem = (itemCarrito.name || '').toLowerCase();
      const codigoItem = itemCarrito.codigo_sistema;

      // Extraemos la rosca si el producto no trae tapa
      if (nombreItem.includes('s/tapa') || nombreItem.includes('sin tapa')) {
        const matchRosca = nombreItem.match(/(?:r-|rosca\s*)(\d{2,3})/i);
        if (matchRosca) roscasBuscadas.add(matchRosca[1]);
      }

      // 🧠 BÚSQUEDA DE RECETAS (Kit Oficial y Kit Flexible)
      productos.forEach(prodCat => {
        if (idsEnCarrito.has(prodCat.id)) return; // Si ya lo tiene, no lo sugerimos

        const tipoItem = prodCat.tipo_item || 'PIEZA_BASE';
        const receta = prodCat.receta || prodCat.receta_desglose;

        let esParteDelKit = false;

        // CASO 1: Kit Oficial (Usa arreglo de objetos con 'codigo_pieza')
        if (tipoItem === 'KIT_OFICIAL' && Array.isArray(receta)) {
          esParteDelKit = receta.some(ingrediente => ingrediente.codigo_pieza === codigoItem);
        } 
        // CASO 2: Kit Flexible (Usa objeto con el 'id' de firebase)
        else if (tipoItem === 'KIT_FLEXIBLE' && receta && !Array.isArray(receta) && typeof receta === 'object') {
          esParteDelKit = !!receta[itemCarrito.id];
        }

        // Si nuestro item pertenece a este Kit, ¡lo sugerimos!
        if (esParteDelKit) {
          if (!sugerenciasMap.has(prodCat.id)) {
            sugerenciasMap.set(prodCat.id, { 
              ...prodCat, 
              tipoSugerencia: '💡 SUGERENCIA DE KIT', 
              color: 'bg-amber-100 text-amber-700 border-amber-200',
              prioridad: 1 // Los kits salen primero
            });
          }
        }
      });
    });

    // 2. BÚSQUEDA SECUNDARIA: TAPAS Y ACCESORIOS SUELTOS
    if (roscasBuscadas.size > 0) {
      productos.forEach(prodCat => {
        if (idsEnCarrito.has(prodCat.id)) return;
        if (sugerenciasMap.has(prodCat.id)) return; // Si ya lo sugerimos como kit, saltamos

        const nombreProd = (prodCat.name || '').toLowerCase();
        
        // 🔥 EL FILTRO ANTI-BOTELLAS:
        // Aseguramos que NO sea un envase, pero que SÍ sea un accesorio
        const esEnvase = /botella|porron|cubeta|envase|tarro|frasco|galon/.test(nombreProd);
        const esAccesorio = /tapa|tapon|sello|liner|valvula|pistola/.test(nombreProd);

        if (!esEnvase && esAccesorio) {
          roscasBuscadas.forEach(rosca => {
            const regexTapa = new RegExp(`r-?${rosca}|rosca\\s*${rosca}`, 'i');
            if (regexTapa.test(nombreProd)) {
              sugerenciasMap.set(prodCat.id, { 
                ...prodCat, 
                tipoSugerencia: '🧩 ACCESORIO COMPATIBLE', 
                color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                prioridad: 2 // Salen después de los Kits
              });
            }
          });
        }
      });
    }

    // Convertimos el Map a un Arreglo, lo ordenamos por prioridad y tomamos solo 4
    const sugerenciasFinales = Array.from(sugerenciasMap.values());
    sugerenciasFinales.sort((a, b) => a.prioridad - b.prioridad);

    return sugerenciasFinales.slice(0, 4);
  }, [carrito, productos]);

  if (sugerencias.length === 0) return null;

  return (
    <div className="bg-indigo-50/50 p-4 border-t border-b border-indigo-100 my-4">
      <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-2">
        <i className="fa-solid fa-lightbulb text-amber-500"></i>
        Optimiza tu pedido
      </h4>
      
      <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scroll">
        {sugerencias.map(prod => (
          <div key={prod.id} className={`min-w-[200px] max-w-[200px] bg-white rounded-xl shadow-sm border p-2 flex flex-col snap-start shrink-0 transition-all hover:shadow-md ${prod.color.split(' ')[2]}`}>
            
            <div className="flex gap-2 items-center mb-2">
              <img 
                src={prod.image} 
                alt={prod.name} 
                className="w-12 h-12 object-contain rounded bg-slate-50 border border-slate-100 p-1"
                onError={(e) => e.target.src = 'https://via.placeholder.com/50?text=Img'}
              />
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-tight ${prod.color}`}>
                {prod.tipoSugerencia}
              </span>
            </div>
            
            <span className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2 mb-2 flex-grow">
              {prod.name}
            </span>
            
            <button 
              onClick={() => agregarAlCarrito(prod, prod.piezas ? parseInt(prod.piezas) : 1)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 rounded-lg transition active:scale-95"
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
