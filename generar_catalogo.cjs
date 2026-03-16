// generar_catalogo.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Inicializar Firebase Admin usando el secreto de GitHub
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountKey) {
    console.error("❌ ERROR: Falta el secreto FIREBASE_SERVICE_ACCOUNT");
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountKey);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function construirJSON() {
    console.log("🔄 Iniciando extracción de la Verdad Absoluta desde Firebase...");
    try {
        // ==========================================
        // FASE 1: Facturación (PVM)
        // ==========================================
        const factSnap = await db.collection('catalogo_facturacion').get();
        const facturacionMap = {}; 
        
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
        console.log(`✅ Facturación cargada: ${Object.keys(facturacionMap).length} registros.`);

        // ==========================================
        // FASE 2: Master (Visual) y Paquetes
        // ==========================================
        const masterSnap = await db.collection('productos_master').where('activo', '==', true).get();
        let rawMaster = [];
        let basesToFetch = new Set();

        masterSnap.forEach(doc => {
            const data = doc.data();
            rawMaster.push({ id: doc.id, ...data });
            if (data.tipo_item === 'PIEZA_BASE') basesToFetch.add(doc.id);
            else if (data.hereda_empaques_de) basesToFetch.add(data.hereda_empaques_de);
        });
        console.log(`✅ Catálogo Maestro cargado: ${rawMaster.length} productos activos.`);

        const paquetesMap = {};
        const promesasPaquetes = Array.from(basesToFetch).map(async (baseId) => {
            try {
                const paqSnap = await db.collection('productos_master').doc(baseId).collection('paquetes').get();
                paquetesMap[baseId] = [];
                paqSnap.forEach(pDoc => paquetesMap[baseId].push({ id: pDoc.id, ...pDoc.data() }));
                paquetesMap[baseId].sort((a, b) => a.piezas - b.piezas);
            } catch (error) {}
        });
        await Promise.all(promesasPaquetes);

        // ==========================================
        // FASE 3: La Gran Mezcla
        // ==========================================
        const allProducts = [];

        // 3.1 Mezclar Master con Facturación
        rawMaster.forEach(data => {
            let paquetesDelProducto = [];
            if (data.tipo_item === 'PIEZA_BASE') paquetesDelProducto = paquetesMap[data.id] || [];
            else if (data.hereda_empaques_de) paquetesDelProducto = paquetesMap[data.hereda_empaques_de] || [];

            const codigoLimpio = String(data.codigo_sistema_oficial || data.codigo_oficial || data.codigo || data.sku || data.id).trim();
            const codigoLower = codigoLimpio.toLowerCase();

            const datosContables = facturacionMap[codigoLower] || {};
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
                image: imgUrl || 'https://dummyimage.com/300x300/e2e8f0/0f172a&text=Sin+Imagen',
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

        // 3.2 Agregar los "Huérfanos" (Lo que sobró en Facturación)
        Object.values(facturacionMap).forEach(factData => {
            allProducts.push({
                id: factData.id_facturacion,
                name: factData.nombre_oficial,
                category: 'Sistema (Sin Master)',
                image: 'https://dummyimage.com/300x300/e2e8f0/0f172a&text=S/I',
                piezas: 1,
                tipo_item: 'PIEZA_BASE', 
                codigo_sistema: factData.codigo_original,
                receta: null,
                paquetes: [],
                id_facturacion: factData.id_facturacion,
                codigo: factData.codigo_original,
                nombre: factData.nombre_oficial,
                precio: factData.precio,
                stock: factData.stock_facturacion,
                imagen: null, 
                empaques_tips: [] 
            });
        });

        // ==========================================
        // FASE 4: Guardar el archivo JSON
        // ==========================================
        // Lo guardamos en la carpeta 'public' para que Vite/React lo empaquete al compilar
        const outputPath = path.join(__dirname, 'public', 'catalogo_completo.json'); 
        
        // Asegurarse de que la carpeta 'public' exista
        if (!fs.existsSync(path.join(__dirname, 'public'))) {
            fs.mkdirSync(path.join(__dirname, 'public'));
        }

        fs.writeFileSync(outputPath, JSON.stringify(allProducts));
        console.log(`🚀 ¡Éxito! catalogo.json generado con ${allProducts.length} productos en la carpeta public/.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ Error crítico al generar el catálogo:", error);
        process.exit(1);
    }
}

construirJSON();
