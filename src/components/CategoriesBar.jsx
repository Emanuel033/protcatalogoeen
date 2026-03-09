import React from 'react';
import { useApp } from '../context/AppContext';

function CategoriesBar() {
  const { categorias, categoriaActiva, setCategoriaActiva } = useApp();

  // Tu función original de íconos convertida a React
  const getCategoryIcon = (cat) => {
    const c = cat.toLowerCase();
    if(c.includes('bolsa')) return <i className="fa-solid fa-bag-shopping mr-1.5 opacity-80"></i>;
    if(c.includes('cubeta')) return <i className="fa-solid fa-bucket mr-1.5 opacity-80"></i>; 
    if(c.includes('garrafa') || c.includes('porrón') || c.includes('porron')) return <i className="fa-solid fa-jug-detergent mr-1.5 opacity-80"></i>;
    if(c.includes('tapa')) return <i className="fa-solid fa-circle-notch mr-1.5 opacity-80"></i>;
    if(c.includes('tambor') || c.includes('barril')) return <i className="fa-solid fa-drum-steelpan mr-1.5 opacity-80"></i>;
    if(c.includes('lámina') || c.includes('lamina')) return <i className="fa-solid fa-fill-drip mr-1.5 opacity-80"></i>;
    if(c.includes('pad')) return <i className="fa-solid fa-flask mr-1.5 opacity-80"></i>; 
    if(c.includes('pbd')) return <i className="fa-solid fa-droplet mr-1.5 opacity-80"></i>; 
    if(c.includes('botella') || c.includes('pet')) return <i className="fa-solid fa-bottle-water mr-1.5 opacity-80"></i>; 
    if(c.includes('todos')) return <i className="fa-solid fa-border-all mr-1.5 opacity-80"></i>;
    return <i className="fa-solid fa-box mr-1.5 opacity-80"></i>;
  };

  return (
    <div className="bg-white border-b border-slate-200 sticky top-[64px] z-30 shadow-sm" id="categories-bar">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div id="categories-container" className="flex gap-2 overflow-x-auto hide-scroll pb-1">
          {categorias.map((cat, idx) => {
            const isActive = categoriaActiva === cat;
            return (
              <button 
                key={idx}
                onClick={() => setCategoriaActiva(cat)}
                className={`shrink-0 px-5 py-2 flex items-center rounded-full text-sm font-bold border transition whitespace-nowrap ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md border-indigo-600' 
                    : 'bg-white text-slate-600 border-slate-200 hover:text-indigo-600 hover:bg-slate-50'
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