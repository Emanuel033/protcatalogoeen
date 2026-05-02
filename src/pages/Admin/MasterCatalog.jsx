import React, { useState } from 'react';

export default function MasterCatalog({ searchTerm }) {
    const [viewMode, setViewMode] = useState('desglose');

    return (
        <div className="h-full flex flex-col px-8 py-6 max-w-[1400px] mx-auto animate-fade-in">
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                {/* Cabecera de la tabla */}
                <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
                    <div className="bg-slate-200/60 p-1 rounded-xl flex gap-1">
                        <button 
                            onClick={() => setViewMode('desglose')} 
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'desglose' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Individual / Web
                        </button>
                        <button 
                            onClick={() => setViewMode('agrupado')} 
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'agrupado' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Consolidado (Facturación)
                        </button>
                    </div>
                </div>

                {/* Contenedor de la tabla */}
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[950px]">
                        <thead className="bg-slate-50 sticky top-0 z-10 text-slate-500 text-[10px] uppercase font-bold">
                            <tr>
                                <th className="px-3 py-3 border-b border-slate-200">Producto / Variante</th>
                                <th className="px-3 py-3 border-b border-slate-200">Categoría</th>
                                <th className="px-3 py-3 border-b border-slate-200">Piezas por paquete</th>
                                <th className="px-3 py-3 border-b border-slate-200">Stock Real</th>
                                <th className="px-3 py-3 border-b border-slate-200 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Aquí iterarás sobre los datos mapeados desde tu backend */}
                            <tr>
                                <td colSpan="5" className="text-center py-8 text-slate-400">
                                    Cargando inventario...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}