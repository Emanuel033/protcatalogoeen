import { useState, useCallback, useRef } from 'react';

const textoANumero = (texto) => {
  const matchDigito = texto.match(/\d+/);
  if (matchDigito) return parseInt(matchDigito[0], 10);

  const dicc = {
    'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'deux': 2, 'tres': 3, 'trois': 3,
    'cuatro': 4, 'quatre': 4, 'cinco': 5, 'cinq': 5, 'seis': 6, 'six': 6,
    'siete': 7, 'sept': 7, 'ocho': 8, 'huit': 8, 'nueve': 9, 'neuf': 9,
    'diez': 10, 'dix': 10, 'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
    'veinte': 20, 'vingt': 20
  };

  const palabras = texto.toLowerCase().split(' ');
  for (let palabra of palabras) {
    if (dicc[palabra]) return dicc[palabra];
  }
  return null;
};

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
    
    recognition.lang = idioma === 'es' ? 'es-MX' : 'fr-FR';
    
    // VOLVEMOS A LA CONFIGURACIÓN DEL HTML ORIGINAL
    // Esto hace que Chrome no se rinda tan rápido si hay ruido de almacén
    recognition.continuous = false;
    recognition.interimResults = true; // Permite escuchar "borradores" de lo que dices

    recognition.onstart = () => setEstaEscuchando(true);
    
    recognition.onresult = (event) => {
      // Tomamos el último resultado que el motor considera "final"
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      
      // Si encontró un resultado final en esta ráfaga de audio
      if (transcript.trim() !== '') {
         const cantidad = textoANumero(transcript);
         if (cantidad !== null) {
           onResultado(codigo, varId, cantidad, letra);
         }
      }
    };

    recognition.onerror = (e) => {
      if(e.error !== 'no-speech' && e.error !== 'aborted') {
         console.warn("Voz error:", e.error);
      }
      setEstaEscuchando(false);
    };
    
    recognition.onend = () => setEstaEscuchando(false);

    try {
      recognition.start();
    } catch(err) {
      // Ignora si el usuario presiona dos veces rápido
    }
  }, [idioma, onResultado]);

  return { iniciarDictado, estaEscuchando };
};

export default useDictadoVoz;