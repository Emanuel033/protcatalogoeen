import React, { useState } from 'react';

const EscanerManual = ({ onAgregarProducto, catalogoBase }) => {
  const [inputValue, setInputValue] = useState('');

  const manejarBusqueda = (e) => {
    e.preventDefault();
    if (inputValue.trim() !== '') {
      onAgregarProducto(inputValue);
      setInputValue(''); // Limpiamos el input después de buscar
    }
  };

  return (
    <div className="flex gap-2">
      {/* Botón Escáner de Cámara (El motor de la cámara lo agregaremos en la siguiente sesión para no saturar) */}
      <button 
        className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shrink-0"
        title="Escáner QR (Próximamente)"
      >
        <i className="fas fa-camera text-xl"></i>
      </button>

      {/* Input de Búsqueda Manual */}
      <form onSubmit={manejarBusqueda} className="relative flex-1">
        <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Buscar código o nombre..." 
          className="w-full h-full bg-slate-900 border border-slate-700 text-white text-base font-bold rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 outline-none transition-all" 
          list="opcionesProductos"
        />
        
        {/* Datalist dinámico con el JSON */}
        <datalist id="opcionesProductos">
          {catalogoBase.map((producto, index) => (
            <option key={index} value={producto.codigo}>
              {producto.descripcion_oficial || producto.nombre}
            </option>
          ))}
        </datalist>
      </form>
    </div>
  );
};

export default EscanerManual;