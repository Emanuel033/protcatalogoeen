import React, { useState, useEffect } from 'react';
import { db } from '../../firebase.js'; // Ajusta tu ruta

export default function MasterCatalog({ searchTerm }) {
    const [viewMode, setViewMode] = useState('desglose');
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Conectamos a Firebase
    useEffect(() => {
        const unsubscribe = db.collection('catalogo_maestro').onSnapshot(snap => {
            const data = [];
            snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            setProductos(data);
            setCargando(false);
        });
        return () => unsubscribe();
    }, []);

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
            {cargando ? (
                <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">
                        Cargando inventario desde Firebase...
                    </td>
                </tr>
            ) : (
                productos.map(prod => (
                    <tr key={prod.id} className="hover:bg-slate-50 border-b border-slate-100">
                        <td className="px-3 py-3 text-slate-800 font-medium">{prod.nombre_flexible || prod.descripcion_oficial}</td>
                        <td className="px-3 py-3 text-slate-600">{prod.categoria || 'Sin categoría'}</td>
                        <td className="px-3 py-3 text-slate-600 font-mono">
                            {prod.piezas ? `${prod.piezas} pz/paq` : 'N/A'}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-900">{prod.stock || 0}</td>
                        <td className="px-3 py-3 text-right">
                            <button className="text-blue-500 hover:text-blue-700 p-2">Editar</button>
                        </td>
                    </tr>
                ))
            )}
        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}