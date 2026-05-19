import React, { useState } from 'react';

export const PackagesManager = ({ packages = [], onAddPackage, onDeletePackage, baseSku = '', isNewProduct = false }) => {
  const [newQty, setNewQty] = useState('');
  const [newSku, setNewSku] = useState('');

  // Auto SKU idéntico a tu fórmula: [sku_base]-[cantidad]PZ
  const generateAutoSku = () => {
    const skuLimpio = baseSku ? baseSku.trim() : 'KIT';
    if (!newQty || Number(newQty) < 2) {
      alert("Introduce una cantidad válida (mínimo 2 piezas).");
      return;
    }
    setNewSku(`${skuLimpio}-${newQty}PZ`);
  };

  const handleAdd = () => {
    if (!newQty || !newSku) return;
    
    if (packages.some(p => p.piezas === Number(newQty))) {
      alert("Ya existe una presentación con esa cantidad de piezas.");
      return;
    }

    // Aquí nos aseguramos de que el SKU sea string antes de mandarlo a mayúsculas
    onAddPackage(Number(newQty), String(newSku).toUpperCase());
    setNewQty('');
    setNewSku('');
  };

  return (
    <div className="space-y-6">
      {/* BARRA NEGRA DE ENTRADA */}
      <div className="bg-slate-900 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-end shadow-lg shadow-slate-900/10">
        <div className="w-full md:w-32">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Piezas</label>
          <input 
            type="number" 
            min="2"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            disabled={isNewProduct}
            className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl text-sm text-center font-black focus:border-blue-500 outline-none transition-colors disabled:opacity-50" 
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">SKU Físico de Caja</label>
          <div className="flex">
            <input 
              type="text" 
              value={newSku}
              onChange={(e) => setNewSku(e.target.value)}
              disabled={isNewProduct}
              className="w-full bg-slate-800 border border-r-0 border-slate-700 text-white px-4 py-3 rounded-l-xl text-sm font-mono focus:border-blue-500 outline-none transition-colors disabled:opacity-50" 
            />
            <button 
              type="button" 
              onClick={generateAutoSku}
              disabled={isNewProduct}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-r-xl font-bold text-[10px] uppercase tracking-wider transition disabled:opacity-50"
            >
              Auto
            </button>
          </div>
        </div>
        <button 
          type="button" 
          onClick={handleAdd}
          disabled={isNewProduct}
          className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-black text-sm transition h-[46px] disabled:opacity-50"
        >
          Añadir
        </button>
      </div>

      {/* TABLA DE PRESENTACIONES */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100/50 border-b border-slate-100">
            <tr>
              <th className="py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider w-24 text-center">Bulto</th>
              <th className="py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">SKU Etiqueta</th>
              <th className="py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider w-24 text-center">Gestión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isNewProduct ? (
              <tr>
                <td colSpan="3" className="py-8 text-center text-slate-400 font-bold text-xs italic">
                  Guarda el producto primero para añadir empaques/cajas.
                </td>
              </tr>
            ) : packages.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-8 text-center text-slate-400 font-bold text-xs italic">
                  Sin empaques registrados.
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.id} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-center font-black text-slate-700">{pkg.piezas} PZ</td>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-slate-600">{pkg.sku}</td>
                  <td className="py-3 px-4 text-center">
                    <button 
                      type="button" 
                      onClick={() => onDeletePackage(pkg.id)}
                      className="w-8 h-8 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};