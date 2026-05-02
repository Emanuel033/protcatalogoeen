import React, { useState } from 'react';

const EscanerManual = ({ catalogoBase, onAgregarProducto }) => {
  const [busqueda, setBusqueda] = useState('');
  const [escuchandoBuscador, setEscuchandoBuscador] = useState(false);

  // MOTOR JARVIS (Reconocimiento de voz nativo)
  const iniciarJarvisBuscador = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador o tablet no soporta comandos de voz nativos.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX'; // Español México
    recognition.interimResults = false;
    
    recognition.onstart = () => setEscuchandoBuscador(true);
    
    recognition.onresult = (event) => {
      // Capturamos lo que escuchó y le quitamos el punto final
      const comando = event.results[0][0].transcript.replace('.', '');
      setBusqueda(comando); 
      
      // OPCIONAL: Si quieres que al terminar de hablar agregue el producto automáticamente, 
      // descomenta las siguientes dos líneas:
      // onAgregarProducto(comando);
      // setBusqueda('');
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
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 w-full">
      
      {/* BARRA DE BÚSQUEDA (Sin restricciones, ocupa todo el espacio) */}
      <div className="flex-1 flex items-center bg-slate-900 rounded-xl px-4 py-1 border border-slate-700 focus-within:border-blue-500 transition-colors shadow-inner">
        <i className="fas fa-search text-slate-500 mr-3"></i>
        <input 
          type="text" 
          placeholder="Buscar SKU, código o nombre..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-transparent text-white py-3 outline-none font-medium text-sm md:text-base" 
        />
      </div>

      {/* BOTÓN JARVIS */}
      <button 
        type="button"
        onClick={iniciarJarvisBuscador}
        className={`w-14 shrink-0 rounded-xl flex items-center justify-center transition-all ${escuchandoBuscador ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse text-white' : 'bg-slate-700 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600'}`}
        title="Dictar búsqueda"
      >
        <i className={`fas ${escuchandoBuscador ? 'fa-microphone-slash' : 'fa-microphone'} text-lg`}></i>
      </button>

      {/* BOTÓN AGREGAR */}
      <button 
        type="submit"
        className="px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[11px] tracking-wider transition shadow-lg shrink-0"
      >
        Agregar
      </button>

    </form>
  );
};

export default EscanerManual;