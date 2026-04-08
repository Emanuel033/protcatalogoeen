import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';

function CrossSelling() {
  const { carrito, productos, agregarAlCarrito } = useApp();

  const sugerencias = useMemo(() => {
    if (!carrito.length || !productos.length) return [];

    const sugerenciasFinales = [];
    const roscasBuscadas = new Set();
    const idsEnCarrito = new Set(carrito.map(c => c.id)); // Para búsquedas rápidas

    // 1. Analizamos el carrito buscando oportunidades
    carrito.forEach(itemCarrito => {
      const nombreItem = (itemCarrito.name || '').toLowerCase();
      
      // CASO A: Si no tiene tapa, guardamos la rosca para sugerir tapas sueltas
      if (nombreItem.includes('s/tapa') || nombreItem.includes('sin tapa')) {
        const matchRosca = nombreItem.match(/(?:r-|rosca\s*)(\d{2,3})/i);
        if (matchRosca) roscasBuscadas.add(matchRosca[1]);
      }

      // 🧠 CASO B (EL MEJORADO): Escaneo Relacional por Recetas
      // Buscamos en todo el catálogo si este item del carrito pertenece a algún Kit
      productos.forEach(prodCat => {
        // Ignoramos si el kit ya está en el carrito
        if (idsEnCarrito.has(prodCat.id)) return;

        const tipoItem = prodCat.tipo_item || 'PIEZA_BASE';

        if (tipoItem === 'KIT_OFICIAL' || tipoItem === 'KIT_FLEXIBLE') {
          // Extraemos la receta (soporta ambas nomenclaturas que usas en tu AppContext)
          const receta = prodCat.receta || prodCat.receta_desglose || {};
          
          // Magia pura: ¿El ID del item de nuestro carrito es un ingrediente de esta receta?
          if (receta[itemCarrito.id]) {
            // Verificamos no haberlo sugerido ya
            if (!sugerenciasFinales.find(s => s.id === prodCat.id)) {
              sugerenciasFinales.push({ 
                ...prodCat, 
                tipoSugerencia: '💡 LLEVA EL KIT COMPLETO', 
                color: 'bg-amber-100 text-amber-700 border-amber-200' 
              });
            }
          }
        }
      });
    });

    // CASO C: Agregar las tapas sueltas como sugerencias secundarias
    if (roscasBuscadas.size > 0) {
      productos.forEach(prodCat => {
        if (idsEnCarrito.has(prodCat.id)) return;

        const nombreProd = (prodCat.name || '').toLowerCase();
        const catProd = (prodCat.category || '').toLowerCase();

        // Si es una tapa o sello
        if (catProd.includes('tapa') || nombreProd.includes('tapa') || nombreProd.includes('sello')) {
          roscasBuscadas.forEach(rosca => {
            const regexTapa = new RegExp(`r-?${rosca}|rosca\\s*${rosca}`, 'i');
            if (regexTapa.test(nombreProd)) {
              if (!sugerenciasFinales.find(s => s.id === prodCat.id)) {
                sugerenciasFinales.push({ 
                  ...prodCat, 
                  tipoSugerencia: 'TAPA COMPATIBLE', 
                  color: 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                });
              }
            }
          });
        }
      });
    }

    // Priorizamos que los Kits (amarillos) salgan primero que las tapas sueltas (azules)
    sugerenciasFinales.sort((a, b) => {
      if (a.tipoSugerencia.includes('KIT') && !b.tipoSugerencia.includes('KIT')) return -1;
      if (!a.tipoSugerencia.includes('KIT') && b.tipoSugerencia.includes('KIT')) return 1;
      return 0;
    });

    return sugerenciasFinales.slice(0, 4);
  }, [carrito, productos]);

  if (sugerencias.length === 0) return null;

  return (
    <div className="bg-indigo-50/50 p-4 border-t border-b border-indigo-100 my-4">
      <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-2">
        <i className="fa-solid fa-lightbulb text-amber-500"></i>
        Mejora tu pedido
      </h4>
      
      <div className="flex overflow-x-auto gap-3 pb-2 snap-x">
        {sugerencias.map(prod => (
          <div key={prod.id} className={`min-w-[200px] max-w-[200px] bg-white rounded-xl shadow-sm border p-2 flex flex-col snap-start shrink-0 transition-all hover:shadow-md ${prod.color.split(' ')[2] /* Toma el color del borde */}`}>
            
            <div className="flex gap-2 items-center mb-2">
              <img 
                src={prod.image} 
                alt={prod.name} 
                className="w-12 h-12 object-contain rounded bg-slate-50 border border-slate-100"
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
