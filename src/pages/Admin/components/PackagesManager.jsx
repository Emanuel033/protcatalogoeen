import React, { useState } from 'react';

export const PackagesManager = ({ packages = [], onChange, baseSku = '' }) => {
  const [newQty, setNewQty] = useState('');
  const [newSku, setNewSku] = useState('');

  // Lógica de "Auto SKU" (Doble chequeo: basándonos en tu patrón base_sku-P[cantidad])
  const generateAutoSku = () => {
    if (!newQty || !baseSku) {
      alert("Necesitas la cantidad y el código oficial del producto base.");
      return;
    }
    setNewSku(`${baseSku}-P${newQty}`);
  };

  const addPackage = () => {
    if (!newQty || !newSku) return;
    
    // Evitar duplicados
    if (packages.some(p => p.piezas === Number(newQty))) {
      alert("Ya existe una presentación con esa cantidad de piezas.");
      return;
    }

    const updated = [...packages, { piezas: Number(newQty), sku: newSku.toUpperCase() }];
    // Ordenar por cantidad de piezas
    updated.sort((a, b) => a.piezas - b.piezas);
    onChange(updated);
    
    // Limpiar inputs
    setNewQty('');
    setNewSku('');
  };

  const removePackage = (index) => {
    const updated = [...packages];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* BARRA NEGRA DE ENTRADA (Tu diseño original) */}
      <div className="bg-slate-900 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-end shadow-lg shadow-slate-900/10">
        <div className="w-full md:w-32">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Piezas</label>
          <input 
            type="number" 
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl text-sm text-center font-black focus:border-blue-500 outline-none transition-colors" 
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">SKU Físico de Caja</label>
          <div className="flex">
            <input 
              type="text" 
              value={newSku}
              onChange={(e) => setNewSku(e.target.value)}
              className="w-full bg-slate-800 border border-r-0 border-slate-700 text-white px-4 py-3 rounded-l-xl text-sm font-mono focus:border-blue-500 outline-none transition-colors" 
            />
            <button 
              type="button" 
              onClick={generateAutoSku}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-r-xl font-bold text-[10px] uppercase tracking-wider transition"
            >
              Auto
            </button>
          </div>
        </div>
        <button 
          type="button" 
          onClick={addPackage}
          className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-black text-sm transition h-[46px]"
        >
          Añadir
        </button>
      </div>

      {/* TABLA DE PRESENTACIONES (Tu diseño original) */}
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
            {packages.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-8 text-center text-slate-400 font-bold text-xs italic">
                  No hay presentaciones propias configuradas.
                </td>
              </tr>
            ) : (
              packages.map((pkg, index) => (
                <tr key={index} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-center font-black text-slate-700">{pkg.piezas}</td>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-blue-600">{pkg.sku}</td>
                  <td className="py-3 px-4 text-center">
                    <button 
                      type="button" 
                      onClick={() => removePackage(index)}
                      className="w-8 h-8 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <i className="fas fa-times"></i>
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