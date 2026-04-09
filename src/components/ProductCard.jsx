import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

function ProductCard({ product }) {
  const { agregarAlCarrito, askProduct } = useApp();
  
  const nombreNormalizado = (product.name || '').toLowerCase();

  // 1. Detectamos si es de la categoría BOLSAS
  const isBolsa = (product.category || '').toLowerCase().includes('bolsa');
  
  // ✨ LÓGICA: Detectamos si es un producto Especial (Sobre pedido)
  const isSobrePedido = (nombreNormalizado.includes('tambo') && (nombreNormalizado.includes('lamina') || nombreNormalizado.includes('lámina'))) || 
                        nombreNormalizado.includes('totem') || 
                        nombreNormalizado.includes('tótem');

  // 2. Definimos las piezas base. Si es bolsa y el mínimo es menor a 100, lo forzamos a 100.
  let basePiezas = product.piezas ? parseInt(product.piezas) : 1;
  if (isBolsa && basePiezas < 100) {
    basePiezas = 100;
  }

  const paquetes = product.paquetes || [];
  const hasPack = paquetes.length > 0;
  
  // selectedQty ahora iniciará en 100 automáticamente para las bolsas
  const [selectedQty, setSelectedQty] = useState(basePiezas);
  const [zoomOpen, setZoomOpen] = useState(false);

  // 3. Textos
  const minText = `Min: ${basePiezas} pz${basePiezas > 1 ? 's' : ''}`;
  let packText = "";
  if (paquetes.length === 1) packText = "Paq: " + paquetes[0].piezas + " pzs";
  else if (paquetes.length > 1) packText = "Varias opciones";
  else if (isBolsa && basePiezas === 100) packText = "Venta por Ciento";

  const handleAdd = () => {
    agregarAlCarrito(product, parseInt(selectedQty));
  };

  const obtenerEtiquetaInventario = (stockReal) => {
    // Si es sobre pedido, no mostramos el stock normal, mostramos una etiqueta especial
    if (isSobrePedido) {
      return (
        <span className="text-amber-700 font-bold text-[9px] uppercase tracking-wider bg-amber-50 px-2 py-1 rounded-md border border-amber-200/60 flex items-center gap-1 w-max">
          <i className="fa-solid fa-clock"></i> Sobre Pedido
        </span>
      );
    }

    const stock = Number(stockReal); 
    if (stockReal === undefined || stockReal === null || isNaN(stock)) return null;

    if (stock <= 0) {
      return (
        <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1 w-max">
          <i className="fa-solid fa-ban opacity-70"></i> Agotado
        </span>
      );
    }

    if (stock <= 1000) {
      return (
        <span className="text-red-600 font-bold text-[9px] uppercase tracking-wider bg-red-50 px-2 py-1 rounded-md border border-red-100 flex items-center gap-1 w-max">
          <i className="fa-solid fa-fire"></i> Limitado
        </span>
      );
    }
    
    if (stock <= 5000) {
      return (
        <span className="text-amber-600 font-bold text-[9px] uppercase tracking-wider bg-amber-50 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-1 w-max">
          <i className="fa-solid fa-circle-half-stroke"></i> Disp. Media
        </span>
      );
    }
    
    return (
      <span className="text-emerald-600 font-bold text-[9px] uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-1 w-max">
        <i className="fa-solid fa-check"></i> En Stock
      </span>
    );
  };

  return (
    <>
      {/* ── LIGHTBOX ESTILIZADO CON BOTÓN DE AGREGAR ─────────────────── */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Zoom */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-white z-10">
              <h3 className="font-bold text-slate-800 text-lg truncate pr-4">{product.name}</h3>
              <button
                onClick={() => setZoomOpen(false)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Imagen Ampliada */}
            <div className="p-8 flex justify-center bg-slate-50/50 cursor-zoom-out" onClick={() => setZoomOpen(false)}>
              <img
                src={product.image}
                alt={product.name}
                className="w-full max-h-[45vh] object-contain drop-shadow-sm"
                onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Sin+Imagen'}
              />
            </div>

            {/* Panel inferior (Controles) */}
            <div className="p-6 border-t border-slate-100 bg-white">
               <div className="flex justify-between items-center mb-3">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.category}</span>
                 <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{packText || minText}</span>
               </div>
               
               <div className="mb-4">
                 {obtenerEtiquetaInventario(product.stock)}
               </div>

               {/* ✨ MENSAJE DE ANTICIPO PARA PRODUCTOS SOBRE PEDIDO */}
               {isSobrePedido && (
                 <div className="mb-5 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-3">
                   <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5"></i>
                   <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                     Este artículo se fabrica/surte sobre pedido. <br/>
                     <span className="font-black">Requiere 50% de anticipo.</span>
                   </p>
                 </div>
               )}
               
               <div className="flex flex-col sm:flex-row gap-3">
                  {hasPack && (
                    <select 
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(e.target.value)}
                      className="w-full sm:w-1/3 text-sm border border-slate-200 rounded-xl p-3 bg-white text-slate-700 font-bold outline-none cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    >
                      <option value={basePiezas}>{isBolsa ? `Ciento (${basePiezas}pz)` : `Ind. (${basePiezas}pz)`}</option>
                      {paquetes.map((pkg, i) => (
                        <option key={i} value={pkg.piezas}>Paq. ({pkg.piezas}pz)</option>
                      ))}
                    </select>
                  )}
                  <button 
                    onClick={() => { handleAdd(); setZoomOpen(false); }} 
                    className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    // Permitimos comprar aunque esté en cero SI es sobre pedido
                    disabled={Number(product.stock) <= 0 && !isSobrePedido}
                  >
                    <i className="fas fa-shopping-cart"></i> Agregar al Carrito
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CARD NORMAL (PREMIUM UI) ───────────────────────────────────────────── */}
      <div className="bg-white rounded-[1.25rem] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_20px_-10px_rgba(0,0,0,0.1)] border border-slate-100/80 flex flex-col relative group transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        
        <div
          className="relative h-48 p-5 cursor-zoom-in overflow-hidden bg-slate-50/50 group-hover:bg-slate-50 transition-colors flex items-center justify-center"
          onClick={() => setZoomOpen(true)}
        >
          <img
            src={product.image}
            alt={product.name}
            className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-105 mix-blend-multiply"
            onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Sin+Imagen'}
          />
        </div>

        <div className="p-4 flex flex-col flex-1 bg-white">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">
            {product.category}
          </span>
          <h3 className="font-bold text-[13px] text-slate-800 mb-2 leading-snug line-clamp-2 min-h-[38px]">
            {product.name}
          </h3>
          
          <div className="mb-1 min-h-[24px]"> 
             {obtenerEtiquetaInventario(product.stock)}
          </div>

          {/* ✨ MENSAJE BREVE EN LA TARJETA */}
          {isSobrePedido ? (
             <div className="text-[9px] font-bold text-amber-700 bg-amber-50/80 p-1.5 mb-3 rounded-md border border-amber-100 text-center leading-tight">
               50% anticipo requerido
             </div>
          ) : (
            <div className="h-2 mb-3"></div>
          )}
          
          <div className="flex justify-between items-end text-[10px] font-medium text-slate-400 mb-2 mt-auto">
            <span>{minText}</span>
            {packText && <span className="text-indigo-600 font-bold bg-indigo-50/50 px-2 py-0.5 rounded-sm">{packText}</span>}
          </div>

          {hasPack ? (
             <div className="relative mb-3">
              <select 
                value={selectedQty}
                onChange={(e) => setSelectedQty(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50/50 text-slate-700 font-semibold outline-none appearance-none cursor-pointer focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all pr-8"
              >
                <option value={basePiezas}>{isBolsa ? `Ciento (${basePiezas} pz)` : `Individual (${basePiezas} pz)`}</option>
                {paquetes.map((pkg, i) => (
                  <option key={i} value={pkg.piezas}>Paquete ({pkg.piezas} pzas)</option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
            </div>
          ) : (
            <div className="h-9 mb-3"></div>
          )}

          <div className="flex gap-2">
            <button 
              onClick={handleAdd} 
              className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white py-2 rounded-lg font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
              // Permitimos comprar aunque esté en cero SI es sobre pedido
              disabled={Number(product.stock) <= 0 && !isSobrePedido}
            >
              Agregar
            </button>
            <button 
              onClick={() => askProduct && askProduct(product.name)} 
              className="w-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-green-600 hover:border-green-200 hover:bg-green-50 transition-all active:scale-95"
              title="Preguntar por WhatsApp"
            >
              <i className="fa-brands fa-whatsapp text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProductCard;
