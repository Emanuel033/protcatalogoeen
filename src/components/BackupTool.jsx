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

      // 3. Armamos el objeto final UNIVERSAL (Sirve para Web y para PVM)
      const allProducts = rawProducts.map(data => {
        
        // Asignación de paquetes según herencia
        let paquetesDelProducto = [];
        if (data.tipo_item === 'PIEZA_BASE') paquetesDelProducto = paquetesMap[data.id] || [];
        else if (data.hereda_empaques_de) paquetesDelProducto = paquetesMap[data.hereda_empaques_de] || [];

        // ==========================================
        // EXTRACCIÓN ROBUSTA PARA EL PUNTO DE VENTA (PVM)
        // ==========================================

        // 1. Precio (Limpiando caracteres raros, ej: "$ 150.00" -> 150.00)
        const pRaw = data.precio || data.Precio || data.precio_unitario || data.precio1 || 0;
        const precioLimpio = parseFloat(String(pRaw).replace(/[^0-9.]/g, '')) || 0;

        // 2. Código (Priorizando código oficial contable)
        const codigoLimpio = String(data.codigo_sistema_oficial || data.codigo_oficial || data.codigo || data.sku || data.id).trim();

        // 3. Nombre (Priorizando descripción oficial contable)
        const nombreLimpio = String(data.descripcion_oficial || data.nombre_oficial || data.nombre || data.nombre_flexible || 'Articulo S/N').trim();

        // 4. Stock (Cubriendo diferentes nombres de variables)
        const stockReal = parseFloat(data.inventario_actual || data.stock_total_piezas || data.stock || data.existencia || 0);

        // 5. Empaques tips (Array de números [12, 50] para los botones azules del PVM)
        const empaquesTipsSet = new Set();
        const piezasBase = parseInt(data.piezas_por_caja_original) || 1;
        if (piezasBase > 1) empaquesTipsSet.add(piezasBase); // Agrega la caja base
        
        paquetesDelProducto.forEach(pkg => {
          const pz = parseInt(pkg.piezas);
          if (pz > 1) empaquesTipsSet.add(pz); // Agrega los paquetes extras
        });
        const empaquesTipsArray = Array.from(empaquesTipsSet).sort((a, b) => a - b);

        // 6. Imagen Segura
        const imgUrl = data.imagen_url || data.imagen || data.url_imagen || data.foto || null; // El PVM usa null para mostrar el icono gris por defecto

        // ==========================================
        // CONSTRUCCIÓN DEL OBJETO FINAL
        // ==========================================
        return {
          // --- CAMPOS WEB (Manteniendo compatibilidad) ---
          id: data.id,
          name: data.nombre_flexible || nombreLimpio,
          category: data.categoria || 'General',
          image: imgUrl || 'https://via.placeholder.com/300?text=Sin+Imagen',
          piezas: piezasBase,
          tipo_item: data.tipo_item || 'PIEZA_BASE',
          codigo_sistema: data.codigo_sistema_oficial || data.codigo_sistema || codigoLimpio,
          receta: data.receta_desglose || data.receta || null,
          paquetes: paquetesDelProducto,

          // --- CAMPOS PVM (Para la Caja Mostrador) ---
          id_facturacion: data.id, 
          codigo: codigoLimpio,
          nombre: nombreLimpio,
          precio: precioLimpio,
          stock: stockReal,
          imagen: imgUrl,
          empaques_tips: empaquesTipsArray
        };
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
