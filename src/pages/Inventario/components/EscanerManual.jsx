import React, { useState, useEffect, useRef } from 'react';

const diccionariosEscaner = {
  es: {
    placeholder: "Buscar por nombre, SKU o usar voz...",
    btnAgregar: "Agregar",
    noResultados: "No se encontraron productos.",
    vozNoSoportada: "Tu navegador no soporta comandos de voz."
  },
  fr: {
    placeholder: "Chercher par nom, SKU ou voix...",
    btnAgregar: "Ajouter",
    noResultados: "Aucun produit trouvé.",
    vozNoSoportada: "Votre navigateur ne supporte pas les commandes vocales."
  }
};

const EscanerManual = ({ catalogoBase, onAgregarProducto, idioma = 'es' }) => {
  const t = diccionariosEscaner[idioma];
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [escuchandoBuscador, setEscuchandoBuscador] = useState(false);
  
  const contenedorRef = useRef(null);

  useEffect(() => {
    const handleClickFuera = (event) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const buscarSugerencias = (texto) => {
    const termino = texto.toLowerCase().trim();
    setBusqueda(texto);

    if (!termino) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }

    const palabras = termino.split(' ');

    const filtrados = catalogoBase.filter(p => {
      let textoProducto = `${p.codigo} ${p.nombre} ${p.descripcion_oficial || ''}`.toLowerCase();
      
      let empaques = [];
      if (p.paquetes) empaques = Array.isArray(p.paquetes) ? p.paquetes : Object.values(p.paquetes);
      empaques.forEach(e => {
        if(e && e.sku) textoProducto += ` ${e.sku.toLowerCase()}`;
      });

      return palabras.every(palabra => textoProducto.includes(palabra));
    }).slice(0, 8); 

    setSugerencias(filtrados);
    setMostrarSugerencias(true);
    
    return filtrados; 
  };

  const iniciarJarvisBuscador = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t.vozNoSoportada);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = idioma === 'es' ? 'es-MX' : 'fr-FR';
    recognition.interimResults = false;
    
    recognition.onstart = () => setEscuchandoBuscador(true);
    
    recognition.onresult = (event) => {
      const comando = event.results[0][0].transcript.replace('.', '');
      const resultados = buscarSugerencias(comando);
      
      if (resultados && resultados.length === 1) {
        seleccionarProducto(resultados[0].codigo);
      }
    };

    recognition.onerror = () => setEscuchandoBuscador(false);
    recognition.onend = () => setEscuchandoBuscador(false);
    recognition.start();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (busqueda.trim()) {
      onAgregarProducto(busqueda);
      setBusqueda('');
      setMostrarSugerencias(false);
    }
  };

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
            placeholder={t.placeholder} 
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

        <button 
          type="button"
          onClick={iniciarJarvisBuscador}
          className={`w-14 shrink-0 rounded-xl flex items-center justify-center transition-all ${escuchandoBuscador ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse text-white' : 'bg-slate-700 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600'}`}
        >
          <i className={`fas ${escuchandoBuscador ? 'fa-microphone-slash' : 'fa-microphone'} text-lg`}></i>
        </button>

        <button 
          type="submit"
          className="hidden sm:block px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[11px] tracking-wider transition shadow-lg shrink-0"
        >
          {t.btnAgregar}
        </button>
      </form>

      {mostrarSugerencias && sugerencias.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scroll">
          {sugerencias.map((prod) => (
            <li 
              key={prod.codigo}
              onClick={() => seleccionarProducto(prod.codigo)}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700 cursor-pointer active:bg-blue-600/30 transition-colors"
            >
              <div className="w-10 h-10 shrink-0 bg-white rounded-lg flex items-center justify-center p-1">
                <img 
                  src={prod.image || prod.imagen || 'https://via.placeholder.com/50?text=S/I'} 
                  alt={prod.nombre} 
                  className="w-full h-full object-contain mix-blend-multiply"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/50?text=S/I'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{prod.nombre}</p>
                <p className="text-blue-400 text-[10px] font-mono mt-0.5">{prod.codigo}</p>
              </div>
              <div className="shrink-0 text-slate-500">
                <i className="fas fa-plus-circle text-lg"></i>
              </div>
            </li>
          ))}
        </ul>
      )}

      {mostrarSugerencias && sugerencias.length === 0 && busqueda.trim() !== '' && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 text-center">
          <p className="text-slate-400 text-sm font-bold">{t.noResultados}</p>
        </div>
      )}
    </div>
  );
};

export default EscanerManual;