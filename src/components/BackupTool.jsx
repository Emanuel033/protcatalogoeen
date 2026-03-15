import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

function BackupTool() {
  const [cargando, setCargando] = useState(false);

  const descargarCatalogoPerfecto = async () => {
    setCargando(true);
    try {
      // ==========================================
      // 1. NUEVO: Traemos los PRECIOS de catalogo_facturacion
      // ==========================================
      const factSnap = await getDocs(collection(db, 'catalogo_facturacion'));
      const facturacionMap = {};
      
      factSnap.forEach(doc => {
        const data = doc.data();
        const codeRaw = data.codigo_sistema_oficial || data.codigo_oficial || data.codigo || data.sku || doc.id;
        const codeLimpio = String(codeRaw).trim().toLowerCase(); // Minúsculas para cruzar sin errores
        
        const pRaw = data.precio || data.Precio || data.precio_unitario || data.precio1 || 0;
        const precioLimpio = parseFloat(String(pRaw).replace(/[^0-9.]/g, '')) || 0;

        facturacionMap[codeLimpio] = {
          id_facturacion: doc.id,
          precio: precioLimpio,
          nombre_oficial: data.descripcion_oficial || data.nombre || data.descripcion || 'S/N'
        };
      });

      // ==========================================
      // 2. Traemos los productos activos del Master
      // ==========================================
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

      // 3. Traemos las subcolecciones de paquetes
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

      // ==========================================
      // 4. FUSIÓN: Armamos el objeto final UNIVERSAL
      // ==========================================
      const allProducts = rawProducts.map(data => {
        
        let paquetesDelProducto = [];
        if (data.tipo_item === 'PIEZA_BASE') paquetesDelProducto = paquetesMap[data.id] || [];
        else if (data.hereda_empaques_de) paquetesDelProducto = paquetesMap[data.hereda_empaques_de] || [];

        const codigoLimpio = String(data.codigo_sistema_oficial || data.codigo_oficial || data.codigo || data.sku || data.id).trim();
        const codigoLower = codigoLimpio.toLowerCase();

        // AQUÍ OCURRE LA MAGIA: Buscamos el código en el mapa de facturación
        const datosContables = facturacionMap[codigoLower] || {};

        const precioFinal = datosContables.precio || 0;
        const idFacturacionFinal = datosContables.id_facturacion || data.id;
        const nombreOficialFinal = datosContables.nombre_oficial || data.nombre_flexible || 'Articulo S/N';

        const stockReal = parseFloat(data.inventario_actual || data.stock_total_piezas || data.stock || data.existencia || 0);

        const empaquesTipsSet = new Set();
        const piezasBase = parseInt(data.piezas_por_caja_original) || 1;
        if (piezasBase > 1) empaquesTipsSet.add(piezasBase);
        
        paquetesDelProducto.forEach(pkg => {
          const pz = parseInt(pkg.piezas);
          if (pz > 1) empaquesTipsSet.add(pz);
        });
        const empaquesTipsArray = Array.from(empaquesTipsSet).sort((a, b) => a - b);

        const imgUrl = data.imagen_url || data.imagen || data.url_imagen || data.foto || null;

        return {
          // --- CAMPOS WEB ---
          id: data.id,
          name: data.nombre_flexible || nombreOficialFinal,
          category: data.categoria || 'General',
          image: imgUrl || 'https://via.placeholder.com/300?text=Sin+Imagen',
          piezas: piezasBase,
          tipo_item: data.tipo_item || 'PIEZA_BASE',
          codigo_sistema: codigoLimpio,
          receta: data.receta_desglose || data.receta || null,
          paquetes: paquetesDelProducto,

          // --- CAMPOS PVM (Nutridos por catalogo_facturacion) ---
          id_facturacion: idFacturacionFinal, 
          codigo: codigoLimpio,
          nombre: nombreOficialFinal,
          precio: precioFinal, // ¡Ya no será 0!
          stock: stockReal,
          imagen: imgUrl,
          empaques_tips: empaquesTipsArray
        };
      });

      // 5. Descargamos el JSON
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
