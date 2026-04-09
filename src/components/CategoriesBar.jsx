import React from 'react';
import { useApp } from '../context/AppContext';

function CategoriesBar() {
  // ✨ Extraemos 'seleccionarCategoria' (la función que limpia el buscador y filtros)
  const { categorias, categoriaActiva, seleccionarCategoria } = useApp();

  const getCategoryIcon = (cat) => {
    const c = cat.toLowerCase();
    if(c.includes('bolsa')) return <i className="fa-solid fa-bag-shopping opacity-70"></i>;
    if(c.includes('cubeta')) return <i className="fa-solid fa-bucket opacity-70"></i>; 
    if(c.includes('garrafa') || c.includes('porrón') || c.includes('porron')) return <i className="fa-solid fa-jug-detergent opacity-70"></i>;
    if(c.includes('tapa')) return <i className="fa-solid fa-circle-notch opacity-70"></i>;
    if(c.includes('tambor') || c.includes('barril')) return <i className="fa-solid fa-drum-steelpan opacity-70"></i>;
    if(c.includes('lámina') || c.includes('lamina')) return <i className="fa-solid fa-fill-drip opacity-70"></i>;
    if(c.includes('pad')) return <i className="fa-solid fa-flask opacity-70"></i>; 
    if(c.includes('pbd')) return <i className="fa-solid fa-droplet opacity-70"></i>; 
    if(c.includes('botella') || c.includes('pet')) return <i className="fa-solid fa-bottle-water opacity-70"></i>; 
    if(c.includes('todos')) return <i className="fa-solid fa-border-all opacity-70"></i>;
    return <i className="fa-solid fa-box opacity-70"></i>;
  };

  return (
    <div className="bg-white border-b border-slate-200 sticky top-[68px] z-30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]" id="categories-bar">
      <div className="max-w-7xl mx-auto px-4">
        {/* Usamos pt-2 y quitamos el pb-1 para que el borde inferior de la pestaña toque la línea gris */}
        <div id="categories-container" className="flex gap-1 overflow-x-auto hide-scroll pt-2">
          {categorias.map((cat, idx) => {
            const isActive = categoriaActiva === cat;
            return (
              <button 
                key={idx}
                // ✨ LÓGICA APLICADA: Al hacer clic, limpia la búsqueda y quita las píldoras
                onClick={() => seleccionarCategoria(cat)}
                className={`shrink-0 px-4 py-2.5 flex items-center gap-2 text-[13px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive 
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {getCategoryIcon(cat)} {cat}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CategoriesBar;
