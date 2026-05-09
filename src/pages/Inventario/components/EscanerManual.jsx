import React, { useState, useEffect, useRef } from 'react';

// --- 1. FUNCIÓN PARA ELIMINAR ACENTOS (Normalización NFD) ---
const quitarAcentos = (texto) => {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// --- 2. DICCIONARIO DE AUTOCORRECCIÓN FONÉTICA (Alias de Almacén) ---
// Agrega aquí todas las confusiones típicas que detectes con el uso diario
const correccionesVoz = {
  'perro': 'tarro',
  'perros': 'tarros',
  'perrito': 'tarrito',
  'perritos': 'tarritos',
  'samsung': 'sampson',
  'samson': 'sampson'
};

// Función auxiliar que limpia acentos y aplica el diccionario palabra por palabra
const limpiarYCorregir = (texto) => {
  const sinAcentos = quitarAcentos(texto.toLowerCase().trim());
  
  const palabras = sinAcentos.split(/\s+/).map(palabra => {
    return correccionesVoz[palabra] || palabra;
  });

  return palabras.join(' ');
};

// --- DICCIONARIO BILINGÜE COMPACTO PARA MÓVIL ---
const diccionariosEscaner = {
  es: {
    placeholder: "Escribe nombre, SKU o dicta...",
    btnAgregar: "Agregar",
    noResultados: "No se encontraron productos.",
    vozNoSoportada: "Tu navegador no soporta voz."
  },
  fr: {
    placeholder: "Nom, SKU ou dictée vocale...",
    btnAgregar: "Ajouter",
    noResultados: "Aucun produit trouvé.",
    vozNoSoportada: "Voix non supportée."
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
    setBusqueda(texto); // Mantiene visible el texto original o el corregido en el input

    if (!texto.trim()) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }

    // 1. Limpiamos el término buscado (quita acentos y aplica alias si aplica)
    const terminoCorregido = limpiarYCorregir(texto);
    const palabras = terminoCorregido.split(/\s+/);

    // 2. Filtramos comparando contra el catálogo también sin acentos
    const filtrados = catalogoBase.filter(p => {
      let textoProducto = quitarAcentos(`${p.codigo} ${p.nombre} ${p.descripcion_oficial || ''}`.toLowerCase());
      
      let empaques = [];
      if (p.paquetes) empaques = Array.isArray(p.paquetes) ? p.paquetes : Object.values(p.paquetes);
      empaques.forEach(e => {
        if(e && e.sku) textoProducto += ` ${quitarAcentos(e.sku.toLowerCase())}`;
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
      
      // Interceptamos lo que escuchó y aplicamos el mapeo de alias
      const comandoCorregido = limpiarYCorregir(comando);
      
      // Buscamos usando la palabra ya corregida (esto actualizará la barra visualmente)
      const resultados = buscarSugerencias(comandoCorregido);
      
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
      // Si hay una sola sugerencia, la selecciona automáticamente al dar "Enter" o "Ir" en el teclado
      if (sugerencias.length === 1) {
        seleccionarProducto(sugerencias[0].codigo);
      } else {
        onAgregarProducto(busqueda);
        setBusqueda('');
        setMostrarSugerencias(false);
      }
    }
  };

  const seleccionarProducto = (codigo) => {
    onAgregarProducto(codigo);
    setBusqueda('');
    setMostrarSugerencias(false);
  };

  return (
    <div className="relative w-full" ref={contenedorRef}>
      <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3 w-full h-14">
        
        {/* INPUT DE BÚSQUEDA ROBUSTO */}
        <div className="flex-1 flex items-center bg-slate-900 rounded-xl px-4 border-2 border-slate-600 focus-within:border-blue-500 transition-colors shadow-inner overflow-hidden">
          <i className="fas fa-search text-slate-400 mr-3 text-lg"></i>
          <input 
            type="text" 
            placeholder={t.placeholder} 
            value={busqueda}
            onChange={(e) => buscarSugerencias(e.target.value)}
            onFocus={() => { if(sugerencias.length > 0) setMostrarSugerencias(true) }}
            className="w-full h-full bg-transparent text-white outline-none font-black text-sm sm:text-base placeholder-slate-500" 
            autoComplete="off"
          />
          {busqueda && (
            <button 
              type="button" 
              onClick={() => {setBusqueda(''); setMostrarSugerencias(false)}} 
              className="text-slate-500 hover:text-white p-2 ml-1 active:scale-90 transition-transform"
            >
              <i className="fas fa-times-circle text-xl"></i>
            </button>
          )}
        </div>

        {/* BOTÓN JARVIS (MICRÓFONO) */}
        <button 
          type="button"
          onClick={iniciarJarvisBuscador}
          className={`w-14 h-14 shrink-0 rounded-xl flex items-center justify-center transition-all shadow-md border active:scale-95 ${
            escuchandoBuscador 
              ? 'bg-red-600 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse text-white' 
              : 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          <i className={`fas ${escuchandoBuscador ? 'fa-microphone-slash' : 'fa-microphone'} text-2xl`}></i>
        </button>

        {/* BOTÓN AGREGAR (Visible solo en tablets/PC) */}
        <button 
          type="submit"
          className="hidden sm:flex px-6 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white font-black uppercase text-[12px] tracking-wider transition-colors shadow-lg shadow-blue-900/50 shrink-0 items-center justify-center active:scale-95"
        >
          {t.btnAgregar}
        </button>
      </form>

      {/* DROPDOWN DE SUGERENCIAS ALTO CONTRASTE */}
      {mostrarSugerencias && sugerencias.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-3 bg-slate-800 border-2 border-slate-600 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden max-h-80 overflow-y-auto custom-scroll">
          {sugerencias.map((prod) => (
            <li 
              key={prod.codigo}
              onClick={() => seleccionarProducto(prod.codigo)}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 hover:bg-slate-700 cursor-pointer active:bg-slate-600 transition-colors group"
            >
              {/* Contenedor Imagen */}
              <div className="w-12 h-12 shrink-0 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-inner border border-slate-300">
                <img 
                  src={prod.image || prod.imagen || 'https://via.placeholder.com/50?text=S/I'} 
                  alt={prod.nombre} 
                  className="w-full h-full object-contain mix-blend-multiply"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/50?text=S/I'}
                />
              </div>
              
              {/* Contenedor Texto */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-white text-sm font-black truncate leading-tight uppercase">{prod.nombre}</p>
                <div className="inline-flex mt-1">
                  <p className="text-blue-300 text-[10px] font-black tracking-widest bg-blue-900/40 px-2 py-0.5 rounded border border-blue-500/30 uppercase">
                     {prod.codigo}
                  </p>
                </div>
              </div>
              
              {/* Botón Acción Visual */}
              <div className="shrink-0 w-10 h-10 bg-slate-900 border border-slate-600 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all shadow-sm">
                <i className="fas fa-plus text-lg"></i>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* MENSAJE DE NO RESULTADOS */}
      {mostrarSugerencias && sugerencias.length === 0 && busqueda.trim() !== '' && (
        <div className="absolute z-50 left-0 right-0 mt-3 bg-slate-800 border-2 border-slate-600 rounded-2xl shadow-2xl p-5 text-center flex flex-col items-center justify-center gap-2">
          <i className="fas fa-box-open text-3xl text-slate-500 opacity-50"></i>
          <p className="text-white text-sm font-black uppercase tracking-wider">{t.noResultados}</p>
        </div>
      )}
    </div>
  );
};

export default EscanerManual;
