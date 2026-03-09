import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Inicializamos Firebase directamente aquí para que la herramienta sea independiente
const firebaseConfig = {
  apiKey: "AIzaSyDkQ2HcaLHY7dPvg_IRmuiZNGtcfUhu05o",
  authDomain: "productoseen.firebaseapp.com",
  projectId: "productoseen",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function BackupTool() {
  const [cargando, setCargando] = useState(false);

  // Función que va a Firebase, toma los datos y crea un archivo .json
  const descargarColeccionJSON = async (nombreColeccion) => {
    setCargando(true);
    try {
      const snapshot = await getDocs(collection(db, nombreColeccion));
      const datos = [];
      
      snapshot.forEach((doc) => {
        datos.push({ id: doc.id, ...doc.data() });
      });

      // Convertimos los datos a texto JSON con formato bonito (espaciado 2)
      const jsonTexto = JSON.stringify(datos, null, 2);
      
      // Creamos un archivo virtual en el navegador
      const blob = new Blob([jsonTexto], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Forzamos la descarga
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${nombreColeccion}_respaldo.json`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      
      alert(`¡Respaldado con éxito: ${nombreColeccion}.json!`);
    } catch (error) {
      console.error(error);
      alert(`Hubo un error al respaldar ${nombreColeccion}`);
    }
    setCargando(false);
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl my-8 border border-slate-700">
      <h3 className="text-lg font-black mb-2">
        <i className="fa-solid fa-database text-blue-400 mr-2"></i> Panel de Respaldos (JSON)
      </h3>
      <p className="text-xs text-slate-400 mb-6">
        Usa estos botones para descargar tus colecciones y preparar la Estrategia 3.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={() => descargarColeccionJSON('productos_master')} 
          disabled={cargando}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-3 px-4 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-download"></i> productos_master
        </button>
        
        <button 
          onClick={() => descargarColeccionJSON('catalogo_facturacion')} 
          disabled={cargando}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 px-4 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-download"></i> catalogo_facturacion
        </button>
      </div>
    </div>
  );
}

export default BackupTool;
