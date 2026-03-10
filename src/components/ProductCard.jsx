import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

function ProductCard({ product }) {
  const { agregarAlCarrito, askProduct } = useApp();
  
  const basePiezas = product.piezas ? parseInt(product.piezas) : 1;
  const paquetes = product.paquetes || [];
  const hasPack = paquetes.length > 0;
  
  const [selectedQty, setSelectedQty] = useState(basePiezas);
  const [zoomOpen, setZoomOpen] = useState(false);   // ← único estado nuevo

  const minText = `Min: ${basePiezas} pz${basePiezas > 1 ? 's' : ''}`;
  let packText = "";
  if (paquetes.length === 1) packText = "Paquete: " + paquetes[0].piezas + " pzas";
  else if (paquetes.length > 1) packText = "Varias opciones";

  const handleAdd = () => {
    agregarAlCarrito(product, parseInt(selectedQty));
  };

  return (
    <>
      {/* ── LIGHTBOX ────────────────────────────────────────────── */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl p-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}  // evita cerrar al clicar la imagen
          >
            {/* Botón cerrar */}
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition"
            >
              <i className="fas fa-times text-sm"></i>
            </button>

            <img
              src={product.image}
              alt={product.name}
              className="w-full max-h-[70vh] object-contain rounded-2xl"
              onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Sin+Imagen'}
            />

            <p className="mt-3 text-xs font-bold text-slate-600 text-center">
              {product.name}
            </p>
          </div>
        </div>
      )}

      {/* ── CARD NORMAL (sin cambios) ────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 flex flex-col relative group transition-all duration-300 hover:-translate-y-1">
        
        {/* Área de imagen — ahora abre el zoom al hacer clic */}
        <div
          className="relative h-52 p-4 cursor-zoom-in overflow-hidden rounded-t-2xl"
          onClick={() => setZoomOpen(true)}
        >
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
            <div className="h-8 mb-2"></div>
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
    </>
  );
}

export default ProductCard;
