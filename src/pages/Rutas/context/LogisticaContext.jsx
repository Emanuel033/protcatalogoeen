import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch, arrayUnion, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase'; 

const LogisticaContext = createContext();

// ============================================================================
// MOTOR DE SIMILITUD DE TEXTOS (VERSIÓN QUIRÚRGICA)
// ============================================================================

// 1. Limpieza de razones sociales para dejar solo el nombre comercial puro
const limpiarRazonSocial = (texto = '') => {
    return texto.toUpperCase()
        .replace(/\b(SA|DE|CV|RL|SAPI|SNC|LLC|CO|INC|LTD)\b/g, '')
        .replace(/\b(TRANSPORTES|TRANSPORTE|FLETERA|FLETES|LOGISTICA|EXPRESS|CARGA|ENVIOS)\b/g, '')
        .replace(/[^A-Z0-9 ]/g, '') // Quitar puntos, comas y guiones
        .replace(/\s+/g, ' ')       // Quitar dobles espacios
        .trim();
};

// 2. Candado estricto para pares conflictivos comunes
const esConflictoConocido = (strA, strB) => {
    const a = strA.replace(/\s+/g, '');
    const b = strB.replace(/\s+/g, '');
    
    // Si uno es TEAMMEX y el otro TRATAMEX, bloquear match difuso
    if ((a.includes('TEAM') && b.includes('TRATA')) || (b.includes('TEAM') && a.includes('TRATA'))) return true;
    
    // Si uno es ESTRELLABLANCA y el otro es solo ESTRELLA, bloquear match difuso
    if ((a === 'ESTRELLA' && b.includes('BLANCA')) || (b === 'ESTRELLA' && a.includes('BLANCA'))) return true;

    return false;
};

// 3. Algoritmo combinado: Levenshtein + Coeficiente de Jaccard (Bigramas)
const similitudTextosFina = (crudoA = '', crudoB = '') => {
    const a = limpiarRazonSocial(crudoA);
    const b = limpiarRazonSocial(crudoB);

    if (!a || !b) return 0;
    if (a === b) return 100;

    // CANDADO DE PARES CRÍTICOS
    if (esConflictoConocido(a, b)) return 0; 

    // COINCIDENCIA DE PALABRA COMPLETA EXACTA (Regex Boundary)
    const regexA = new RegExp(`\\b${a}\\b`);
    const regexB = new RegExp(`\\b${b}\\b`);
    if (regexA.test(b) || regexB.test(a)) {
        // Solo damos 100% si las longitudes son muy similares para evitar que "PAQUETEX" valide "PAQUETEXPRESS"
        if (Math.abs(a.length - b.length) <= 3) return 95;
    }

    // CÁLCULO LEVENSHTEIN TRADICIONAL
    let matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) { matrix[i][j] = matrix[i - 1][j - 1]; } 
            else { matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)); }
        }
    }
    const editDistance = matrix[b.length][a.length];
    const maxLen = Math.max(a.length, b.length);
    const levenshteinScore = ((maxLen - editDistance) / maxLen) * 100;

    // CÁLCULO JACCARD (Porcentaje de pares de letras compartidas)
    const getBigrams = (str) => {
        let bigrams = new Set();
        for (let i = 0; i < str.length - 1; i++) { bigrams.add(str.substring(i, i + 2)); }
        return bigrams;
    };
    const setA = getBigrams(a);
    const setB = getBigrams(b);
    let intersection = 0;
    setA.forEach(bigram => { if (setB.has(bigram)) intersection++; });
    const union = setA.size + setB.size - intersection;
    const jaccardScore = union === 0 ? 0 : (intersection / union) * 100;

    // Promediamos ambos motores para obtener un veredicto final altamente preciso
    return (levenshteinScore * 0.6) + (jaccardScore * 0.4);
};

export const LogisticaProvider = ({ children }) => {
  const [pedidos, setPedidos] = useState([]);
  const [flota, setFlota] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [fleteras, setFleteras] = useState([]);
  const [loading, setLoading] = useState(true);

  // EL CEREBRO AUTO-MASTICADOR
  const procesarPedidosCrudos = async (viajesCrudos) => {
    // ========================================================================
    // SOLUCIÓN: OBTENER LA VERDAD ABSOLUTA DE LA BD ANTES DE PROCESAR
    // Garantiza que los catálogos estén 100% cargados eliminando la condición de carrera.
    // ========================================================================
    const snapClientes = await getDocs(collection(db, 'clientes_logistica'));
    const snapFleteras = await getDocs(collection(db, 'catalogo_fleteras'));

    let localClientes = snapClientes.docs.map(d => ({ id: d.id, ...d.data() }));
    let localFleteras = snapFleteras.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const batch = writeBatch(db);
    let operacionesEnBatch = 0;

    for (let p of viajesCrudos) {
        let updates = { procesado_por_web: true };
        
        let rawEnvio = (p.tipo_envio || '').trim().toUpperCase();
        let detallesUpper = (p.detalles_entrega || '').trim().toUpperCase();
        let codigoCliente = (p.cliente_codigo || '').trim().toUpperCase();
        let nombreCliente = (p.cliente_nombre || '').trim().toUpperCase();
        let dirLimpia = (p.direccion || '').trim();

        updates.requiere_cobro = p.requiere_cobro === true || p.requiere_cobro === 'true';

        // =====================================
        // LÓGICA REPARTO LOCAL
        // =====================================
        if (rawEnvio === 'LOCAL' || rawEnvio === 'REPARTO') {
            updates.tipo_envio = 'bodega_cliente'; 
            
            let aliasBase = "MATRIZ";
            if (detallesUpper.includes('FISCAL') || detallesUpper === 'DF') aliasBase = "FISCAL";
            if (detallesUpper.includes('BODEGA') || detallesUpper === 'OB' || detallesUpper.includes('OTRA')) aliasBase = "BODEGA";

            let clienteIndex = localClientes.findIndex(c => (c.codigo || '').toUpperCase() === codigoCliente);
            let clienteMatch = clienteIndex >= 0 ? localClientes[clienteIndex] : null;

            if (!clienteMatch && codigoCliente) {
                let aliasFinal = aliasBase;
                const nuevoCliente = {
                    codigo: codigoCliente,
                    nombre: nombreCliente,
                    telefono: p.telefono_contacto || "",
                    direcciones: [{
                        alias: aliasFinal,
                        direccion: dirLimpia,
                        coordenadas: { lat: 25.6866, lng: -100.3161 }, 
                        horario: "", link_maps: "", telefono: p.telefono_contacto || ""
                    }]
                };
                
                const newClientRef = doc(collection(db, 'clientes_logistica'));
                batch.set(newClientRef, nuevoCliente); 
                operacionesEnBatch++;
                
                updates.destino_alias = aliasFinal;
                updates.cliente_id_vinculado = newClientRef.id;
                localClientes.push({ id: newClientRef.id, ...nuevoCliente }); 

            } else if (clienteMatch) {
                let direccionesCliente = clienteMatch.direcciones || [];
                
                let dirExistente = direccionesCliente.find(d => {
                    const esExacta = d.direccion.trim().toLowerCase() === dirLimpia.toLowerCase();
                    const esMuySimilar = similitudTextosFina(d.direccion, dirLimpia) >= 85; 
                    return esExacta || esMuySimilar;
                });

                if (dirExistente) {
                    updates.destino_alias = dirExistente.alias;
                    updates.cliente_id_vinculado = clienteMatch.id;
                } else {
                    let aliasFinal = aliasBase;
                    let contador = 1;
                    while (direccionesCliente.some(d => d.alias === aliasFinal)) {
                        aliasFinal = `${aliasBase} ${contador}`;
                        contador++;
                    }

                    const nuevaDir = {
                        alias: aliasFinal,
                        direccion: dirLimpia,
                        coordenadas: { lat: 25.6866, lng: -100.3161 },
                        horario: "", link_maps: "", telefono: p.telefono_contacto || ""
                    };

                    const clientRef = doc(db, 'clientes_logistica', clienteMatch.id);
                    batch.update(clientRef, { direcciones: arrayUnion(nuevaDir) }); 
                    operacionesEnBatch++;

                    updates.destino_alias = aliasFinal;
                    updates.cliente_id_vinculado = clienteMatch.id;
                    
                    direccionesCliente.push(nuevaDir);
                    localClientes[clienteIndex].direcciones = direccionesCliente;
                }
            }
        } 
        // =====================================
        // LÓGICA FLETERA FORÁNEA (BÚSQUEDA FINA)
        // =====================================
        else {
            let fleteraNombreCrudo = (p.destino_alias || p.metodo_mensajeria || '').trim().toUpperCase();
            
            const palabrasBasura = ['DOMICILIO', 'D', 'OCURRE', 'POR DEFINIR', 'LOCAL', 'NO REELECCIÓN'];
            let fleteraNombre = fleteraNombreCrudo;

            if (!fleteraNombre || fleteraNombre.length <= 2 || palabrasBasura.some(b => fleteraNombre === b)) {
                fleteraNombre = 'POR ASIGNAR';
            }

            if (detallesUpper.includes('DOMICILIO') || detallesUpper === 'D') {
                updates.tipo_envio = 'fletera_domicilio';
            } else {
                updates.tipo_envio = 'fletera_ocurre';
            }
            
            updates.destino_alias = limpiarRazonSocial(fleteraNombre) || fleteraNombre; 

            // ========================================================
            // SELECCIÓN INTELIGENTE DE FLETERAS
            // ========================================================
            let fleteraMatch = null;
            let mejorPuntaje = 0;

            if (fleteraNombre !== 'POR ASIGNAR') {
                localFleteras.forEach(f => {
                    // Match exacto directo
                    const exacto = f.nombre.trim().toUpperCase() === fleteraNombre.toUpperCase();
                    if (exacto) {
                        fleteraMatch = f;
                        mejorPuntaje = 100;
                        return;
                    }
                    
                    // Match difuso fino
                    const score = similitudTextosFina(f.nombre, fleteraNombre);
                    if (score >= 88 && score > mejorPuntaje) {
                        mejorPuntaje = score;
                        fleteraMatch = f;
                    }
                });
            }

            if (!fleteraMatch && fleteraNombre !== 'POR ASIGNAR') {
                const nombreParaCatalogo = limpiarRazonSocial(fleteraNombre);
                const nuevaFletera = {
                    nombre: nombreParaCatalogo.length > 2 ? nombreParaCatalogo : fleteraNombre,
                    direccion: "Dirección pendiente", 
                    telefono: "", link_maps: "", coordenadas: { lat: 25.6866, lng: -100.3161 }
                };
                
                const newFleteraRef = doc(collection(db, 'catalogo_fleteras'));
                batch.set(newFleteraRef, nuevaFletera); 
                operacionesEnBatch++;
                
                updates.fletera_asignada_id = newFleteraRef.id;
                updates.destino_alias = nuevaFletera.nombre; 
                localFleteras.push({ id: newFleteraRef.id, ...nuevaFletera });
            } else if (fleteraMatch) {
                updates.fletera_asignada_id = fleteraMatch.id;
                updates.destino_alias = fleteraMatch.nombre; 
            }
            
            // Validar Cliente Foráneo
            let clienteIndex = localClientes.findIndex(c => (c.codigo || '').toUpperCase() === codigoCliente);
            if (clienteIndex === -1 && codigoCliente) {
                 const nuevoClienteForaneo = {
                    codigo: codigoCliente,
                    nombre: nombreCliente,
                    telefono: p.telefono_contacto || "",
                    direcciones: [] 
                };
                
                const newClientForaneoRef = doc(collection(db, 'clientes_logistica'));
                batch.set(newClientForaneoRef, nuevoClienteForaneo); 
                operacionesEnBatch++;

                updates.cliente_id_vinculado = newClientForaneoRef.id;
                localClientes.push({ id: newClientForaneoRef.id, ...nuevoClienteForaneo });
            } else if (clienteIndex !== -1) {
                 updates.cliente_id_vinculado = localClientes[clienteIndex].id;
            }
        }

        const rutaRef = doc(db, 'rutas_logistica', p.id);
        batch.update(rutaRef, updates); 
        operacionesEnBatch++;
    }

    if (operacionesEnBatch > 0) {
        try {
            await batch.commit();
            console.log(`✅ Lote procesado: Se enviaron ${operacionesEnBatch} operaciones a Firebase tras verificar catálogos en vivo.`);
        } catch(e) { 
            console.error("Error ejecutando el Batch de pedidos:", e); 
        }
    }
  };

  useEffect(() => {
    const unsubFlota = onSnapshot(collection(db, 'flota'), snap => setFlota(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubChoferes = onSnapshot(collection(db, 'choferes'), snap => setChoferes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubClientes = onSnapshot(collection(db, 'clientes_logistica'), snap => {
        setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubFleteras = onSnapshot(collection(db, 'catalogo_fleteras'), snap => {
        setFleteras(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubRutas = onSnapshot(collection(db, 'rutas_logistica'), (snapshot) => {
      let activos = [];
      let crudos = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (['pendiente', 'camino', 'fallido', 'entregado'].includes(data.estado)) {
            activos.push({ id: doc.id, ...data });
        }

        if (data.origen === 'Contpaqi' && (data.procesado_por_web === false || data.procesado_por_web == null)) {
            crudos.push({ id: doc.id, ...data });
        }
      });

      activos.sort((a,b) => { 
        const ord = { 'fallido': 1, 'pendiente': 2, 'camino': 3, 'entregado': 4 }; 
        if (a.estado === 'camino' && b.estado === 'camino') {
            return (b.fecha_salida ? 1 : 0) - (a.fecha_salida ? 1 : 0);
        }
        return (ord[a.estado] || 5) - (ord[b.estado] || 5); 
      });

      setPedidos(activos);
      setLoading(false);

      // Disparamos el masticador pasándole únicamente los datos crudos
      if (crudos.length > 0) {
          procesarPedidosCrudos(crudos);
      }
    });

    return () => { unsubFlota(); unsubChoferes(); unsubClientes(); unsubFleteras(); unsubRutas(); };
  }, []);

  return (
    <LogisticaContext.Provider value={{ pedidos, flota, choferes, clientes, fleteras, loading }}>
      {children}
    </LogisticaContext.Provider>
  );
};

export const useLogistica = () => useContext(LogisticaContext);
