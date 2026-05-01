import React, { useState, useEffect, useRef } from 'react';

const EscanerManual = ({ onAgregarProducto, catalogoBase }) => {
  const [inputValue, setInputValue] = useState('');
  const timeoutRef = useRef(null);

  const manejarCambio = (e) => {
    const valor = e.target.value;
    setInputValue(valor);

    // Limpiamos el timeout anterior
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (valor.trim() !== '') {
      // Configuramos un pequeño retraso (debounce)
      // Si el usuario deja de escribir por medio segundo, buscamos en automático.
      // (Ideal para pistolas lectoras que escriben todo de golpe en 10ms)
      timeoutRef.current = setTimeout(() => {
        onAgregarProducto(valor);
        setInputValue(''); // Limpiamos la barra al encontrar algo
      }, 500); 
    }
  };

  return (
    <div className="flex gap-2">
      <button 
        className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shrink-0"
        title="Escáner QR (Próximamente)"
      >
        <i className="fas fa-camera text-xl"></i>
      </button>

      <div className="relative flex-1">
        <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
        <input 
          type="text" 
          value={inputValue}
          onChange={manejarCambio}
          placeholder="Buscar código o nombre..." 
          className="w-full h-full bg-slate-900 border border-slate-700 text-white text-base font-bold rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 outline-none transition-all" 
          list="opcionesProductos"
        />
        
        <datalist id="opcionesProductos">
          {catalogoBase.map((producto, index) => (
            <option key={index} value={producto.codigo}>
              {producto.descripcion_oficial || producto.nombre}
            </option>
          ))}
        </datalist>
      </div>
    </div>
  );
};

export default EscanerManual;