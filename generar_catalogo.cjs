// generar_catalogo.cjs
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // Para comparar si un producto cambió

// 1. Inicializar Firebase Admin
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

// Función auxiliar para crear un "hash" (resumen) de un objeto y saber si cambió
function hashObjeto(obj) {
    return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
}

async function construirJSON() {
    console.log("🔄 Iniciando Motor de Sincronización Web (Cero desperdicio de lecturas)...");
    try {
        // ==========================================
        // FASE 1: LEER FACTURACIÓN DESDE EL JSON LOCAL (¡0 Lecturas a Firebase!)
        // ==========================================
        const facturacionPath = path.join(__dirname, 'catalogo_oficial_anterior.json');
        const facturacionMap = {}; 
        
        if (fs.existsSync(facturacionPath)) {
            const factDataRaw = JSON.parse(fs.readFileSync(facturacionPath, 'utf8'));
            factDataRaw.forEach(item => {
                const codeLimpio = String(item.codigo).trim().toLowerCase();
                facturacionMap[codeLimpio] = {
                    id_facturacion: item.codigo,
                    codigo_original: item.codigo,
                    nombre_oficial: item.nombre, // <--- AHORA SÍ LEEMOS EL NOMBRE DESDE EL ARCHIVO LOCAL
                    precio: item.precio || 0,
                    stock_facturacion: item.stock || 0,
                    tipo_item: item.tipo === 1 ? 'PIEZA_BASE' : 'KIT_OFICIAL',
                    receta: item.receta || null
                };
            });
            console.log(`✅ CONTPAQi cargado desde archivo local: ${Object.keys(facturacionMap).length} registros.`);
        } else {
            console.warn("⚠️ No se encontró catalogo_oficial_anterior.json. Se asumirá facturación vacía.");
        }

        // ==========================================
        // FASE 2: GESTIÓN DE MASTER Y pm.json (Delta Sync)
        // ==========================================
        const pmPath = path.join(__dirname, 'pm.json');
        let pmMap = {};
        let pmCache = [];

        if (fs.existsSync(pmPath)) {
            pmCache = JSON.parse(fs.readFileSync(pmPath, 'utf8'));
            pmCache.forEach(p => pmMap[p.id] = p);
            console.log(`✅ pm.json local cargado con ${pmCache.length} productos históricos.`);
        }

        // Leer Firebase (La fuente de la verdad visual)
        const masterSnap = await db.collection('productos_master').where('activo', '==', true).get();
        let firebaseMasterMap = {};
        let basesToFetch = new Set();
        let huboCambiosEnMaster = false;

        masterSnap.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            firebaseMasterMap[id] = { id, ...data };
            
            // Comparamos contra pm.json para ver si cambió algo
            const hashFirebase = hashObjeto(data);
            const hashLocal = pmMap[id] ? hashObjeto(pmMap[id].firebase_data) : null;

            if (hashFirebase !== hashLocal) {
                huboCambiosEnMaster = true; // Detectamos una modificación o adición
                if (data.tipo_item === 'PIEZA_BASE') basesToFetch.add(id);
                else if (data.hereda_empaques_de) basesToFetch.add(data.hereda_empaques_de);
            }
        });

        // Revisar si se borró algún producto (Existe en pm.json pero ya no en Firebase)
        for (const id in pmMap) {
            if (!firebaseMasterMap[id]) {
                huboCambiosEnMaster = true; // Se detectó un borrado
            }
        }

        // Si hubo cambios, traemos los paquetes de las piezas afectadas y reconstruimos el pm.json
        if (huboCambiosEnMaster || pmCache.length === 0) {
            console.log("⚠️ Cambios detectados en productos_master. Actualizando pm.json...");
            
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

            // Reconstruimos el PM Cache completo
            pmCache = [];
            for (const id in firebaseMasterMap) {
                const data = firebaseMasterMap[id];
                
                // Si el producto no cambió, reciclamos sus paquetes del pm.json viejo para ahorrar lecturas
                let paquetesDelProducto = [];
                if (basesToFetch.has(id) || basesToFetch.has(data.hereda_empaques_de)) {
                    paquetesDelProducto = paquetesMap[data.tipo_item === 'PIEZA_BASE' ? id : data.hereda_empaques_de] || [];
                } else if (pmMap[id]) {
                    paquetesDelProducto = pmMap[id].paquetes || [];
                }

                pmCache.push({
                    id: data.id,
                    firebase_data: data, // Guardamos los datos puros para el hash del futuro
                    paquetes: paquetesDelProducto
                });
            }

            // Guardamos el nuevo pm.json actualizado
            fs.writeFileSync(pmPath, JSON.stringify(pmCache, null, 2));
            console.log(`💾 pm.json actualizado y guardado con ${pmCache.length} productos.`);
        } else {
            console.log("⚡ No hubo cambios en productos_master. Usando pm.json intacto (0 lecturas a subcolecciones de paquetes).");
        }

        // ==========================================
        // FASE 3: LA GRAN MEZCLA (pm.json + CONTPAQi)
        // ==========================================
        const allProducts = [];

        // 3.1 Mezclar pm.json con Facturación
        pmCache.forEach(pmItem => {
            const data = pmItem.firebase_data;
            const paquetesDelProducto = pmItem.paquetes;

            const codigoLimpio = String(data.codigo_sistema_oficial || data.codigo_oficial || data.codigo || data.sku || data.id).trim();
            const codigoLower = codigoLimpio.toLowerCase();

            const datosContables = facturacionMap[codigoLower] || {};
            delete facturacionMap[codigoLower]; // Lo sacamos para dejar a los "huérfanos"

            const precioFinal = datosContables.precio || 0;
            const idFacturacionFinal = datosContables.id_facturacion || data.id;
            const stockReal = parseFloat(datosContables.stock_facturacion || data.inventario_actual || data.stock_total_piezas || 0);

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
                name: data.nombre_flexible || data.nombre || `[S/N] ${codigoLimpio}`,
                category: data.categoria || 'General',
                image: imgUrl || 'https://dummyimage.com/300x300/e2e8f0/0f172a&text=Sin+Imagen',
                piezas: piezasBase,
                tipo_item: datosContables.tipo_item || data.tipo_item || 'PIEZA_BASE',
                codigo_sistema: codigoLimpio,
                receta: datosContables.receta || data.receta_desglose || data.receta || null,
                paquetes: paquetesDelProducto,
                id_facturacion: idFacturacionFinal, 
                codigo: codigoLimpio,
                nombre: data.nombre_flexible || data.nombre || `[S/N] ${codigoLimpio}`,
                // 👇 AGREGAR ESTA LÍNEA 👇
                descripcion_oficial: datosContables.nombre_oficial || data.nombre_flexible || data.nombre || `[S/N] ${codigoLimpio}`,
                precio: precioFinal,
                stock: stockReal,
                imagen: imgUrl,
                empaques_tips: Array.from(empaquesTipsSet).sort((a, b) => a - b)
            });
        });

        // 3.2 Agregar los "Huérfanos" (Lo que sobró en CONTPAQi y no tiene foto ni master)
        Object.values(facturacionMap).forEach(factData => {
            
            // Extraemos el nombre que trajo factData desde CONTPAQi
            const nombreOficial = factData.nombre_oficial || factData.codigo_original;

            allProducts.push({
                id: factData.codigo_original,
                name: nombreOficial,                                  
                category: 'Sistema (Sin Master)',
                image: 'https://via.placeholder.com/300?text=S/I',    
                piezas: 1,
                tipo_item: factData.tipo_item || "PIEZA_BASE",
                codigo_sistema: factData.codigo_original,
                receta: factData.receta || null,              
                paquetes: [],
                id_facturacion: factData.codigo_original,
                codigo: factData.codigo_original,
                nombre: nombreOficial,                                
                // 👇 AGREGAR ESTA LÍNEA 👇
                descripcion_oficial: nombreOficial,
                precio: factData.precio || 0,
                stock: factData.stock_facturacion || 0,
                imagen: null,
                empaques_tips: []
            });
        });

        // ==========================================
        // FASE 4: GUARDAR EL catalogo_completo.json
        // ==========================================
        const publicDir = path.join(__dirname, 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir);
        }

        const outputPath = path.join(publicDir, 'catalogo_completo.json'); 
        fs.writeFileSync(outputPath, JSON.stringify(allProducts));
        
        console.log(`🚀 ¡Éxito Total! catalogo_completo.json generado con ${allProducts.length} productos en la carpeta public/.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ Error crítico al generar el catálogo:", error);
        process.exit(1);
    }
}

construirJSON();
