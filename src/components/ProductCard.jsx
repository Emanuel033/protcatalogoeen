import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

function ProductCard({ product }) {
  const { agregarAlCarrito, askProduct } = useApp();
  
  const nombreNormalizado = (product.name || '').toLowerCase();

  // 1. Detectamos si es de la categoría BOLSAS
  const isBolsa = (product.category || '').toLowerCase().includes('bolsa');
  
  // ✨ NUEVA LÓGICA: Detectamos si es un producto Especial (Sobre pedido)
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
  if (paquetes.length === 1) packText = "Paquete: " + paquetes[0].piezas + " pzas";
  else if (paquetes.length > 1) packText = "Varias opciones";
  else if (isBolsa && basePiezas === 100) packText = "Venta por Ciento";

  const handleAdd = () => {
    agregarAlCarrito(product, parseInt(selectedQty));
  };

  const obtenerEtiquetaInventario = (stockReal) => {
    // Si es sobre pedido, no mostramos el stock normal, mostramos una etiqueta especial
    if (isSobrePedido) {
      return (
        <span className="text-amber-800 font-bold text-[10px] uppercase tracking-wider bg-amber-100 px-2 py-1 rounded border border-amber-300 flex items-center gap-1 w-max">
          <i className="fa-solid fa-clock text-amber-600"></i> Sobre Pedido
        </span>
      );
    }

    const stock = Number(stockReal); 
    if (stockReal === undefined || stockReal === null || isNaN(stock)) return null;

    if (stock <= 0) {
      return (
        <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider bg-slate-100 px-2 py-1 rounded border border-slate-200 flex items-center gap-1 w-max">
          <i className="fa-solid fa-ban text-slate-400"></i> Agotado
        </span>
      );
    }

    if (stock <= 1000) {
      return (
        <span className="text-red-700 font-bold text-[10px] uppercase tracking-wider bg-red-50 px-2 py-1 rounded border border-red-200 flex items-center gap-1 w-max">
          <i className="fa-solid fa-fire text-red-500"></i> Stock Limitado
        </span>
      );
    }
    
    if (stock <= 5000) {
      return (
        <span className="text-amber-700 font-bold text-[10px] uppercase tracking-wider bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1 w-max">
          <i className="fa-solid fa-circle-half-stroke text-amber-500"></i> Disp. Media
        </span>
      );
    }
    
    return (
      <span className="text-emerald-700 font-bold text-[10px] uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1 w-max">
        <i className="fa-solid fa-check-circle text-emerald-500"></i> En Stock
      </span>
    );
  };

  return (
    <>
      {/* ── LIGHTBOX ESTILIZADO CON BOTÓN DE AGREGAR ─────────────────── */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Zoom */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-white z-10">
              <h3 className="font-black text-slate-800 text-lg truncate pr-4">{product.name}</h3>
              <button
                onClick={() => setZoomOpen(false)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Imagen Ampliada */}
            <div className="p-6 flex justify-center bg-slate-50 cursor-zoom-out" onClick={() => setZoomOpen(false)}>
              <img
                src={product.image}
                alt={product.name}
                className="w-full max-h-[50vh] object-contain rounded-xl drop-shadow-sm"
                onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Sin+Imagen'}
              />
            </div>

            {/* Panel inferior (Controles) */}
            <div className="p-5 border-t border-slate-100 bg-white">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{product.category}</span>
                 <span className="text-sm font-black text-indigo-600">{packText || minText}</span>
               </div>
               
               <div className="mb-2">
                 {obtenerEtiquetaInventario(product.stock)}
               </div>

               {/* ✨ MENSAJE DE ANTICIPO PARA PRODUCTOS SOBRE PEDIDO */}
               {isSobrePedido && (
                 <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-2 rounded-r flex items-start gap-2">
                   <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 text-sm"></i>
                   <p className="text-xs font-bold text-amber-800 leading-tight">
                     Este artículo se fabrica/surte sobre pedido. <br/>
                     <span className="text-amber-900">Requiere 50% de anticipo.</span>
                   </p>
                 </div>
               )}
               {!isSobrePedido && <div className="mb-4"></div>}
               
               <div className="flex flex-col sm:flex-row gap-3">
                  {hasPack && (
                    <select 
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(e.target.value)}
                      className="w-full sm:w-1/3 text-sm border border-indigo-200 rounded-2xl p-3 bg-indigo-50 text-indigo-700 font-bold outline-none cursor-pointer"
                    >
                      <option value={basePiezas}>{isBolsa ? `Ciento (${basePiezas}pz)` : `Ind. (${basePiezas}pz)`}</option>
                      {paquetes.map((pkg, i) => (
                        <option key={i} value={pkg.piezas}>Paq. ({pkg.piezas}pz)</option>
                      ))}
                    </select>
                  )}
                  <button 
                    onClick={() => { handleAdd(); setZoomOpen(false); }} 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black text-base shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
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

      {/* ── CARD NORMAL ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 flex flex-col relative group transition-all duration-300 hover:-translate-y-1">
        
        <div
          className="relative h-52 p-4 cursor-zoom-in overflow-hidden rounded-t-2xl flex items-center justify-center bg-white"
          onClick={() => setZoomOpen(true)}
        >
          <img
            src={product.image}
            alt={product.name}
            className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110"
            onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Sin+Imagen'}
          />
        </div>

        <div className="p-4 flex flex-col flex-1 border-t border-slate-50">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
            {product.category}
          </span>
          <h3 className="font-bold text-xs text-slate-900 mb-1 leading-relaxed h-auto">
            {product.name}
          </h3>
          
          <div className="mb-1 min-h-[22px]"> 
             {obtenerEtiquetaInventario(product.stock)}
          </div>

          {/* ✨ MENSAJE BREVE EN LA TARJETA */}
          {isSobrePedido ? (
             <div className="text-[9px] font-bold text-amber-700 bg-amber-50 p-1 mb-2 rounded border border-amber-200 text-center leading-tight">
               50% de anticipo requerido
             </div>
          ) : (
            <div className="h-6 mb-2"></div>
          )}
          
          <div className="flex justify-between items-end text-[10px] font-bold text-slate-500 mb-2 mt-auto">
            <span>{minText}</span>
            {packText && <span className="text-indigo-600 font-black">{packText}</span>}
          </div>

          {hasPack ? (
            <select 
              value={selectedQty}
              onChange={(e) => setSelectedQty(e.target.value)}
              className="w-full text-xs border border-indigo-200 rounded-lg p-1.5 mb-2 bg-indigo-50 text-indigo-700 font-bold outline-none"
            >
              <option value={basePiezas}>{isBolsa ? `Ciento (${basePiezas} pz)` : `Individual (${basePiezas} pz)`}</option>
              {paquetes.map((pkg, i) => (
                <option key={i} value={pkg.piezas}>Paquete ({pkg.piezas} pzas)</option>
              ))}
            </select>
          ) : (
            <div className="h-8 mb-2"></div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-50">
            <button 
              onClick={handleAdd} 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
              // Permitimos comprar aunque esté en cero SI es sobre pedido
              disabled={Number(product.stock) <= 0 && !isSobrePedido}
            >
              Agregar
            </button>
            <button 
              onClick={() => askProduct && askProduct(product.name)} 
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
