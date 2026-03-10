import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

function BackupTool() {
  const [cargando, setCargando] = useState(false);

  const descargarCatalogoPerfecto = async () => {
    setCargando(true);
    try {
      // 1. Traemos los productos activos
      const q = query(collection(db, 'productos_master'), where('activo', '==', true));
      const snapshot = await getDocs(q);

      let rawProducts = [];
      let basesToFetch = new Set();

      snapshot.forEach(doc => {
        const data = doc.data();
        rawProducts.push({ id: doc.id, ...data });
        if (data.tipo_item === 'PIEZA_BASE') basesToFetch.add(doc.id);
        else if (data.hereda_empaques_de) basesToFetch.add(data.hereda_empaques_de);
      });

      // 2. Traemos las subcolecciones de paquetes
      const paquetesMap = {};
      const promesasPaquetes = Array.from(basesToFetch).map(async (baseId) => {
        try {
          const paqSnap = await getDocs(collection(db, 'productos_master', baseId, 'paquetes'));
          paquetesMap[baseId] = [];
          paqSnap.forEach(pDoc => paquetesMap[baseId].push({ id: pDoc.id, ...pDoc.data() }));
          paquetesMap[baseId].sort((a, b) => a.piezas - b.piezas);
        } catch (error) {}
      });
      await Promise.all(promesasPaquetes);

      // 3. Armamos el objeto final perfecto
      const allProducts = rawProducts.map(data => {
        const producto = {
          id: data.id,
          name: data.nombre_flexible || 'Sin nombre',
          category: data.categoria || 'General',
          image: data.imagen_url || '[https://via.placeholder.com/300?text=Sin+Imagen](https://via.placeholder.com/300?text=Sin+Imagen)',
          piezas: data.piezas_por_caja_original || 1,
          stock: data.stock_total_piezas || 0,
          tipo_item: data.tipo_item || 'PIEZA_BASE',
          codigo_sistema: data.codigo_sistema_oficial || data.codigo_sistema || null,
          receta: data.receta_desglose || data.receta || null,
          paquetes: [] 
        };
        if (producto.tipo_item === 'PIEZA_BASE') producto.paquetes = paquetesMap[producto.id] || [];
        else if (data.hereda_empaques_de) producto.paquetes = paquetesMap[data.hereda_empaques_de] || [];
        return producto;
      });

      // 4. Descargamos el JSON
      const jsonTexto = JSON.stringify(allProducts, null, 2);
      const blob = new Blob([jsonTexto], { type: 'application/json' });
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(blob);
      enlace.download = `catalogo_completo.json`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      
      alert(`¡Catálogo Completo exportado con éxito!`);
    } catch (error) {
      console.error(error);
      alert(`Error al generar el catálogo.`);
    }
    setCargando(false);
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl my-8 text-center">
      <h3 className="text-lg font-black mb-4">Herramienta de Exportación Definitiva</h3>
      <button 
        onClick={descargarCatalogoPerfecto} 
        disabled={cargando}
        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-3 px-6 rounded-xl font-black transition active:scale-95 disabled:opacity-50"
      >
        {cargando ? 'Armando Catálogo...' : 'Descargar catalogo_completo.json'}
      </button>
    </div>
  );
}

export default BackupTool;
