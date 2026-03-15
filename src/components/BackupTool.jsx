import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

function BackupTool() {
  const [cargando, setCargando] = useState(false);

  const descargarCatalogoPerfecto = async () => {
    setCargando(true);
    try {
      // ==========================================
      // PASO 1: Descargar la VERDAD ABSOLUTA del PVM (catalogo_facturacion)
      // ==========================================
      const factSnap = await getDocs(collection(db, 'catalogo_facturacion'));
      const facturacionMap = {}; // Lo guardamos en un diccionario temporal
      
      factSnap.forEach(doc => {
        const data = doc.data();
        const codeRaw = data.codigo_sistema_oficial || data.codigo_oficial || data.codigo || data.sku || doc.id;
        const codeLimpio = String(codeRaw).trim().toLowerCase();
        
        const pRaw = data.precio || data.Precio || data.precio_unitario || data.precio1 || 0;
        const precioLimpio = parseFloat(String(pRaw).replace(/[^0-9.]/g, '')) || 0;

        facturacionMap[codeLimpio] = {
          id_facturacion: doc.id,
          codigo_original: String(codeRaw).trim(),
          precio: precioLimpio,
          nombre_oficial: data.descripcion_oficial || data.nombre || data.descripcion || 'Articulo S/N',
          stock_facturacion: parseFloat(data.stock || data.existencia || 0)
        };
      });

      // ==========================================
      // PASO 2: Descargar la base visual (productos_master)
      // ==========================================
      const q = query(collection(db, 'productos_master'), where('activo', '==', true));
      const masterSnap = await getDocs(q);

      let rawMaster = [];
      let basesToFetch = new Set();

      masterSnap.forEach(doc => {
        const data = doc.data();
        rawMaster.push({ id: doc.id, ...data });
        if (data.tipo_item === 'PIEZA_BASE') basesToFetch.add(doc.id);
        else if (data.hereda_empaques_de) basesToFetch.add(data.hereda_empaques_de);
      });

      // PASO 3: Traer paquetes para los botones azules de cajas
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
      // PASO 4: MEZCLA FASE 1 (Master + Facturación)
      // ==========================================
      const allProducts = [];

      rawMaster.forEach(data => {
        let paquetesDelProducto = [];
        if (data.tipo_item === 'PIEZA_BASE') paquetesDelProducto = paquetesMap[data.id] || [];
        else if (data.hereda_empaques_de) paquetesDelProducto = paquetesMap[data.hereda_empaques_de] || [];

        const codigoLimpio = String(data.codigo_sistema_oficial || data.codigo_oficial || data.codigo || data.sku || data.id).trim();
        const codigoLower = codigoLimpio.toLowerCase();

        // Buscamos si existe en facturación
        const datosContables = facturacionMap[codigoLower] || {};
        
        // ¡TRUCO CLAVE! Lo borramos del mapa de facturación porque ya lo procesamos
        delete facturacionMap[codigoLower]; 

        const precioFinal = datosContables.precio || 0;
        const idFacturacionFinal = datosContables.id_facturacion || data.id;
        const nombreOficialFinal = datosContables.nombre_oficial || data.nombre_flexible || 'Articulo S/N';
        const stockReal = parseFloat(data.inventario_actual || data.stock_total_piezas || datosContables.stock_facturacion || 0);

        const empaquesTipsSet = new Set();
        const piezasBase = parseInt(data.piezas_por_caja_original) || 1;
        if (piezasBase > 1) empaquesTipsSet.add(piezasBase);
        
        paquetesDelProducto.forEach(pkg => {
          const pz = parseInt(pkg.piezas);
          if (pz > 1) empaquesTipsSet.add(pz);
        });

        const imgUrl = data.imagen_url || data.imagen || data.url_imagen || data.foto || null;

        allProducts.push({
          id: data.id,
          name: data.nombre_flexible || nombreOficialFinal,
          category: data.categoria || 'General',
          image: imgUrl || 'https://via.placeholder.com/300?text=Sin+Imagen',
          piezas: piezasBase,
          tipo_item: data.tipo_item || 'PIEZA_BASE',
          codigo_sistema: codigoLimpio,
          receta: data.receta_desglose || data.receta || null,
          paquetes: paquetesDelProducto,

          id_facturacion: idFacturacionFinal, 
          codigo: codigoLimpio,
          nombre: nombreOficialFinal,
          precio: precioFinal,
          stock: stockReal,
          imagen: imgUrl,
          empaques_tips: Array.from(empaquesTipsSet).sort((a, b) => a - b)
        });
      });

      // ==========================================
      // PASO 5: MEZCLA FASE 2 (Los "Huérfanos" de Facturación)
      // Todo lo que sobró en el mapa (que no tiene equivalente en Master) entra aquí.
      // ==========================================
      Object.values(facturacionMap).forEach(factData => {
        allProducts.push({
          // Campos de relleno para que la web no truene si llega a leerlo
          id: factData.id_facturacion,
          name: factData.nombre_oficial,
          category: 'Sistema (Sin Master)',
          image: 'https://via.placeholder.com/300?text=S/I',
          piezas: 1,
          tipo_item: 'PIEZA_BASE', // ¡Obligatorio para que el PVM lo muestre!
          codigo_sistema: factData.codigo_original,
          receta: null,
          paquetes: [],

          // Campos reales para el PVM
          id_facturacion: factData.id_facturacion,
          codigo: factData.codigo_original,
          nombre: factData.nombre_oficial,
          precio: factData.precio,
          stock: factData.stock_facturacion,
          imagen: null, // Sin imagen, el PVM mostrará el ícono de cajita gris
          empaques_tips: [] // Sin cajas extra
        });
      });

      // 6. Descargamos el JSON
      const jsonTexto = JSON.stringify(allProducts, null, 2);
      const blob = new Blob([jsonTexto], { type: 'application/json' });
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(blob);
      enlace.download = `catalogo_completo.json`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      
      alert(`¡Catálogo Universal (Master + Huérfanos) exportado con éxito!`);
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
