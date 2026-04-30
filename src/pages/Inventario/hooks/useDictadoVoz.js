import { useState, useRef, useCallback } from 'react';

const useDictadoVoz = (idioma, onFinalizar) => {
  const [estaEscuchando, setEstaEscuchando] = useState(false);
  const [errorMicrofono, setErrorMicrofono] = useState(null);
  
  // Usamos useRef para mantener la instancia del reconocimiento de voz sin causar re-renders innecesarios
  const recognitionRef = useRef(null);

  const iniciarDictado = useCallback((codigoProd, varId, letterIndex) => {
    // 1. Verificamos compatibilidad del navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMicrofono("No soportado");
      alert("Tu navegador no soporta el dictado por voz.");
      return;
    }

    // 2. Configuramos el motor de voz
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // Asignamos el idioma correcto basado en tu variable global 'es' o 'fr'
    recognition.lang = idioma === 'es' ? 'es-MX' : 'fr-FR';
    
    // 3. Manejo de resultados
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      
      // Buscamos cualquier número en lo que dictó el usuario
      const matchNumero = transcript.match(/\d+/);
      
      if (matchNumero) {
        const cantidadEscuchada = parseInt(matchNumero[0], 10);
        // Enviamos el resultado de vuelta al componente principal
        onFinalizar(codigoProd, varId, cantidadEscuchada, letterIndex);
      } else {
        alert("No entendí el número. Intenta de nuevo.");
      }
    };

    // 4. Manejo de estados (UI)
    recognition.onstart = () => {
      setEstaEscuchando(true);
      setErrorMicrofono(null);
    };

    recognition.onend = () => {
      setEstaEscuchando(false);
    };

    recognition.onerror = (e) => {
      console.error("Error de voz:", e.error);
      setErrorMicrofono(e.error);
      setEstaEscuchando(false);
    };

    // 5. ¡A escuchar!
    try {
      recognition.start();
    } catch (e) {
      // Por si se intenta iniciar mientras ya está escuchando
      console.warn("El micrófono ya estaba activo.");
    }
    
  }, [idioma, onFinalizar]);

  const detenerDictado = useCallback () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    iniciarDictado,
    detenerDictado,
    estaEscuchando,
    errorMicrofono
  };
};

export default useDictadoVoz;