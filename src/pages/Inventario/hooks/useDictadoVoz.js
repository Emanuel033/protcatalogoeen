import { useState, useCallback, useRef } from 'react';

// --- DICCIONARIO BILINGÜE AMPLIADO (Para Logística) ---
const textoANumero = (texto) => {
  // 1. Si el motor ya lo tradujo a número directamente (ej: "15" o "15 cajas")
  const matchDigito = texto.match(/\d+/);
  if (matchDigito) return parseInt(matchDigito[0], 10);

  // 2. Si lo interpretó como letras, buscamos en el diccionario de almacén
  const dicc = {
    // Unidades y decenas básicas
    'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'deux': 2, 'tres': 3, 'trois': 3,
    'cuatro': 4, 'quatre': 4, 'cinco': 5, 'cinq': 5, 'seis': 6, 'six': 6,
    'siete': 7, 'sept': 7, 'ocho': 8, 'huit': 8, 'nueve': 9, 'neuf': 9,
    'diez': 10, 'dix': 10, 'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
    'veinte': 20, 'vingt': 20,
    // Cantidades logísticas comunes (Bultos, pallets, tarimas enteras)
    'treinta': 30, 'trente': 30,
    'cuarenta': 40, 'quarante': 40,
    'cincuenta': 50, 'cinquante': 50,
    'sesenta': 60, 'soixante': 60,
    'setenta': 70, 'soixante-dix': 70,
    'ochenta': 80, 'quatre-vingts': 80, 'quatre-vingt': 80,
    'noventa': 90, 'quatre-vingt-dix': 90, 'nonante': 90,
    'cien': 100, 'ciento': 100, 'cent': 100,
    'docena': 12, 'douzaine': 12
  };

  // Separamos por espacios o guiones (vital para números en francés como soixante-dix)
  const palabras = texto.toLowerCase().split(/[ \-]/);
  
  // Escaneamos las palabras en busca de una coincidencia numérica
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
      // Mensaje de fallback bilingüe si el dispositivo es antiguo
      const msgError = idioma === 'fr' 
        ? "Votre navigateur ne supporte pas la dictée vocale." 
        : "Tu navegador no soporta el dictado por voz.";
      alert(`❌ ${msgError}`);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // Forzamos el modelo de idioma exacto para mejorar la precisión del micrófono
    recognition.lang = idioma === 'es' ? 'es-MX' : 'fr-FR';
    
    // CONFIGURACIÓN PARA AMBIENTE RUIDOSO
    recognition.continuous = false; 
    recognition.interimResults = true; // Permite captar ráfagas rápidas de voz

    recognition.onstart = () => {
      setEstaEscuchando(true);
      // Feedback Táctil: Pequeña vibración para confirmar que el micrófono se abrió
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    };
    
    recognition.onresult = (event) => {
      // Filtramos solo el resultado definitivo que el motor procesó
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      
      if (transcript.trim() !== '') {
         const cantidad = textoANumero(transcript);
         if (cantidad !== null) {
           onResultado(codigo, varId, cantidad, letra);
           // Feedback Táctil de Éxito: Doble vibración rápida indicando "Número Capturado"
           if (typeof navigator !== 'undefined' && navigator.vibrate) {
             navigator.vibrate([40, 60, 40]);
           }
         }
      }
    };

    recognition.onerror = (e) => {
      if(e.error !== 'no-speech' && e.error !== 'aborted') {
         console.warn("Alerta de Voz:", e.error);
         // Feedback Táctil de Error: Vibración larga de fallo
         if (typeof navigator !== 'undefined' && navigator.vibrate) {
           navigator.vibrate(250);
         }
      }
      setEstaEscuchando(false);
    };
    
    recognition.onend = () => setEstaEscuchando(false);

    try {
      recognition.start();
    } catch(err) {
      // Bloque de seguridad en caso de que el operario presione el botón repetidamente por accidente
    }
  }, [idioma, onResultado]);

  return { iniciarDictado, estaEscuchando };
};

export default useDictadoVoz;
