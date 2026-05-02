import React from 'react';

export default function TopNav({ onSearch }) {
    return (
        <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex justify-between items-center z-40">
            <div className="relative w-96">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs"></i>
                <input 
                    type="text" 
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Buscar código, producto..." 
                    className="w-full pl-8 pr-4 py-1.5 rounded-md bg-slate-100 focus:bg-white focus:border-blue-500 text-sm outline-none shadow-inner" 
                />
            </div>

            <div className="flex items-center gap-2">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md font-bold text-sm shadow-sm flex items-center gap-2">
                    <i className="fas fa-plus text-xs"></i> Nuevo
                </button>
            </div>
        </div>
    );
}