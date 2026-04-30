import { useState, useCallback, useRef } from 'react';

const useDictadoVoz = (idioma, onResultado) => {
  const [estaEscuchando, setEstaEscuchando] = useState(false);
  const recognitionRef = useRef(null);

  const iniciarDictado = useCallback((codigo, varId, letra) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Dictado no soportado en este navegador.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // Configuramos según tu preferencia de idiomas
    recognition.lang = idioma === 'es' ? 'es-MX' : 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setEstaEscuchando(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Extraemos solo los números del dictado
      const coincidencia = transcript.match(/\d+/);
      if (coincidencia) {
        onResultado(codigo, varId, parseInt(coincidencia[0], 10), letra);
      }
    };

    recognition.onerror = () => setEstaEscuchando(false);
    recognition.onend = () => setEstaEscuchando(false);

    recognition.start();
  }, [idioma, onResultado]);

  return { iniciarDictado, estaEscuchando };
};

export default useDictadoVoz;