import React, { useState, useEffect, useRef } from 'react';

const EscanerManual = ({ catalogoBase, onAgregarProducto }) => {
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [escuchandoBuscador, setEscuchandoBuscador] = useState(false);
  
  const contenedorRef = useRef(null);

  // Cerrar sugerencias si tocas fuera del buscador
  useEffect(() => {
    const handleClickFuera = (event) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  // LÓGICA DE BÚSQUEDA FLEXIBLE (Por palabras clave)
  const buscarSugerencias = (texto) => {
    const termino = texto.toLowerCase().trim();
    setBusqueda(texto);

    if (!termino) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }

    // Dividimos lo que escribes/dices en palabras sueltas
    const palabras = termino.split(' ');

    const filtrados = catalogoBase.filter(p => {
      // Unimos el código, nombre y SKUs de empaques en un solo texto gigante para buscar ahí
      let textoProducto = `${p.codigo} ${p.nombre} ${p.descripcion_oficial || ''}`.toLowerCase();
      
      let empaques = [];
      if (p.paquetes) empaques = Array.isArray(p.paquetes) ? p.paquetes : Object.values(p.paquetes);
      empaques.forEach(e => {
        if(e && e.sku) textoProducto += ` ${e.sku.toLowerCase()}`;
      });

      // El producto debe contener TODAS las palabras que dictaste (sin importar el orden)
      return palabras.every(palabra => textoProducto.includes(palabra));
    }).slice(0, 8); // Limitamos a 8 resultados para no saturar la pantalla del celular

    setSugerencias(filtrados);
    setMostrarSugerencias(true);
    
    return filtrados; // Retornamos para que Jarvis sepa cuántos encontró
  };

  // MOTOR JARVIS
  const iniciarJarvisBuscador = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta comandos de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.interimResults = false;
    
    recognition.onstart = () => setEscuchandoBuscador(true);
    
    recognition.onresult = (event) => {
      const comando = event.results[0][0].transcript.replace('.', '');
      
      // Buscamos con la voz
      const resultados = buscarSugerencias(comando);
      
      // AUTO-AGREGADO MAGICO: Si la voz encontró EXACTAMENTE UN producto, lo agrega de inmediato
      if (resultados && resultados.length === 1) {
        seleccionarProducto(resultados[0].codigo);
      }
    };

    recognition.onerror = () => setEscuchandoBuscador(false);
    recognition.onend = () => setEscuchandoBuscador(false);
    recognition.start();
  };

  // AL ENVIAR FORMULARIO (Botón Agregar o Tecla Enter)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (busqueda.trim()) {
      onAgregarProducto(busqueda);
      setBusqueda('');
      setMostrarSugerencias(false);
    }
  };

  // AL TOCAR UNA SUGERENCIA DE LA LISTA
  const seleccionarProducto = (codigo) => {
    onAgregarProducto(codigo);
    setBusqueda('');
    setMostrarSugerencias(false);
  };

  return (
    <div className="relative w-full" ref={contenedorRef}>
      <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3 w-full">
        
        <div className="flex-1 flex items-center bg-slate-900 rounded-xl px-4 py-1 border border-slate-700 focus-within:border-blue-500 transition-colors shadow-inner">
          <i className="fas fa-search text-slate-500 mr-3"></i>
          <input 
            type="text" 
            placeholder="Buscar por nombre, SKU o usar voz..." 
            value={busqueda}
            onChange={(e) => buscarSugerencias(e.target.value)}
            onFocus={() => { if(sugerencias.length > 0) setMostrarSugerencias(true) }}
            className="w-full bg-transparent text-white py-3 outline-none font-medium text-sm" 
            autoComplete="off"
          />
          {busqueda && (
            <button type="button" onClick={() => {setBusqueda(''); setMostrarSugerencias(false)}} className="text-slate-500 p-2 hover:text-white">
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* BOTÓN JARVIS */}
        <button 
          type="button"
          onClick={iniciarJarvisBuscador}
          className={`w-14 shrink-0 rounded-xl flex items-center justify-center transition-all ${escuchandoBuscador ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse text-white' : 'bg-slate-700 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600'}`}
        >
          <i className={`fas ${escuchandoBuscador ? 'fa-microphone-slash' : 'fa-microphone'} text-lg`}></i>
        </button>

        {/* BOTÓN AGREGAR (Oculto en celulares pequeños para ahorrar espacio, visible en tablets) */}
        <button 
          type="submit"
          className="hidden sm:block px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[11px] tracking-wider transition shadow-lg shrink-0"
        >
          Agregar
        </button>
      </form>

      {/* 🟢 LISTA DESPLEGABLE DE SUGERENCIAS FLOTANTE 🟢 */}
      {mostrarSugerencias && sugerencias.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scroll">
          {sugerencias.map((prod) => (
            <li 
              key={prod.codigo}
              onClick={() => seleccionarProducto(prod.codigo)}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700 cursor-pointer active:bg-blue-600/30 transition-colors"
            >
              {/* Miniatura de la sugerencia */}
              <div className="w-10 h-10 shrink-0 bg-white rounded-lg flex items-center justify-center p-1">
                <img 
                  src={prod.image || prod.imagen || 'https://via.placeholder.com/50?text=S/I'} 
                  alt={prod.nombre} 
                  className="w-full h-full object-contain mix-blend-multiply"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/50?text=S/I'}
                />
              </div>
              
              {/* Textos de la sugerencia */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{prod.nombre}</p>
                <p className="text-blue-400 text-[10px] font-mono mt-0.5">{prod.codigo}</p>
              </div>
              
              {/* Botoncito visual de sumar */}
              <div className="shrink-0 text-slate-500">
                <i className="fas fa-plus-circle text-lg"></i>
              </div>
            </li>
          ))}
        </ul>
      )}

      {mostrarSugerencias && sugerencias.length === 0 && busqueda.trim() !== '' && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 text-center">
          <p className="text-slate-400 text-sm font-bold">No se encontraron productos.</p>
        </div>
      )}
    </div>
  );
};

export default EscanerManual;