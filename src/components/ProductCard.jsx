import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

function ProductCard({ product }) {
  const { agregarAlCarrito, askProduct } = useApp();
  
  const basePiezas = product.piezas ? parseInt(product.piezas) : 1;
  const paquetes = product.paquetes || [];
  const hasPack = paquetes.length > 0;
  
  // Guardamos en el estado local la cantidad que el usuario elija en el select
  const [selectedQty, setSelectedQty] = useState(basePiezas);

  const minText = `Min: ${basePiezas} pz${basePiezas > 1 ? 's' : ''}`;
  let packText = "";
  if (paquetes.length === 1) packText = "Paquete: " + paquetes[0].piezas + " pzas";
  else if (paquetes.length > 1) packText = "Varias opciones";

  const handleAdd = () => {
    // Agregamos la cantidad exacta que seleccionó en el dropdown
    agregarAlCarrito(product, parseInt(selectedQty));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 flex flex-col relative group transition-all duration-300 hover:-translate-y-1">
      <div className="relative h-52 p-4 cursor-pointer overflow-hidden rounded-t-2xl">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
          onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Sin+Imagen'}
        />
      </div>

      <div className="p-4 flex flex-col flex-1 border-t border-slate-50">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
          {product.category}
        </span>
        <h3 className="font-bold text-xs text-slate-900 mb-2 leading-relaxed h-auto">
          {product.name}
        </h3>
        
        <div className="flex justify-between items-end text-[10px] font-bold text-slate-500 mb-2">
          <span>{minText}</span>
          {packText && <span className="text-indigo-600 font-black">{packText}</span>}
        </div>

        {/* SELECTOR DE PAQUETES */}
        {hasPack ? (
          <select 
            value={selectedQty}
            onChange={(e) => setSelectedQty(e.target.value)}
            className="w-full text-xs border border-indigo-200 rounded-lg p-1.5 mb-2 bg-indigo-50 text-indigo-700 font-bold outline-none"
          >
            <option value={basePiezas}>Individual ({basePiezas} pz)</option>
            {paquetes.map((pkg, i) => (
              <option key={i} value={pkg.piezas}>Paquete/Bolsa ({pkg.piezas} pzas)</option>
            ))}
          </select>
        ) : (
          <div className="h-8 mb-2"></div> // Espaciador si no hay paquetes
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <button 
            onClick={handleAdd} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition active:scale-95"
          >
            Agregar
          </button>
          <button 
            onClick={() => askProduct(product.name)} 
            className="w-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-green-500 hover:bg-green-50 transition active:scale-95"
          >
            <i className="fa-brands fa-whatsapp"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;