import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch, arrayUnion, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase.js';

const LogisticaContext = createContext();

// ============================================================================
// MOTOR DE SIMILITUD DE TEXTOS (VERSIÓN QUIRÚRGICA Y BLINDADA AL 100%)
// ============================================================================

const limpiarRazonSocial = (texto) => {
    return String(texto || '').toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // <-- NUEVO: Quita acentos (Á->A, Ñ->N)
        // 1. Unificar nombres separados por error de captura
        .replace(/\bTEAM MEX\b/g, 'TEAMMEX')
        // 2. Extirpar instrucciones de envío que se cuelan en el nombre
        .replace(/\b(A DOMICILIO|DOMICILIO|A OCURRE|OCURRE)\b/g, '')
        // 3. Quitar terminaciones legales
        .replace(/\b(SA|DE|CV|RL|SAPI|SNC|LLC|CO|INC|LTD)\b/g, '')
        // 4. Quitar palabras genéricas de transporte
        .replace(/\b(TRANSPORTES|TRANSPORTE|FLETERA|FLETES|LOGISTICA|EXPRESS|CARGA|ENVIOS|PAQUETERIA|MENSAJERIA)\b/g, '')
        // 5. Limpiar símbolos raros (reemplaza por espacio en vez de juntar)
        .replace(/[^A-Z0-9 ]/g, ' ') 
        .replace(/\s+/g, ' ').trim();
};

const limpiarDireccion = (texto) => {
    return String(texto || '').toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // <-- NUEVO: Quita acentos y normaliza
        .replace(/NUEVO LE[OON]/g, 'NL') // Blindado sin acento
        .replace(/N\.L\./g, 'NL')
        .replace(/\bMTY\b/g, 'MONTERREY') 
        .replace(/\b(AVE|AVENIDA)\b/g, 'AV') 
        .replace(/\b(PRIVADA)\b/g, 'PRIV') // <-- NUEVO: Estandariza "Privada"
        // <-- NUEVO: Elimina referencias de interior como "BODEGA 17", "INT 4", "LOCAL B"
        .replace(/\b(BODEGA|BOD|INT|INTERIOR|LOCAL|EDIFICIO|EDIF|LOTE|LT|MANZANA|MZ)\s*[A-Z0-9-]*\b/g, '')
        // <-- Basura clásica a ignorar
        .replace(/\b(COLONIA|COL|FRACCIONAMIENTO|FRACC|CP|C\.P\.|NUMERO|NUM|NO|#)\b/g, '')
        // <-- NUEVO: Reemplaza símbolos por espacio para evitar que "0-BODEGA" se fusione en "0BODEGA"
        .replace(/[^A-Z0-9 ]/g, ' ') 
        .replace(/\s+/g, ' ').trim();
};

const esConflictoConocido = (strA, strB) => {
    const a = String(strA || '').replace(/\s+/g, '');
    const b = String(strB || '').replace(/\s+/g, '');
    if ((a.includes('TEAM') && b.includes('TRATA')) || (b.includes('TEAM') && a.includes('TRATA'))) return true;
    if ((a === 'ESTRELLA' && b.includes('BLANCA')) || (b === 'ESTRELLA' && a.includes('BLANCA'))) return true;
    return false;
};

const similitudTextosFina = (crudoA = '', crudoB = '', tipo = 'razon_social') => {
    const a = tipo === 'direccion' ? limpiarDireccion(crudoA) : limpiarRazonSocial(crudoA);
    const b = tipo === 'direccion' ? limpiarDireccion(crudoB) : limpiarRazonSocial(crudoB);

    if (!a || !b) return 0;
    if (a === b) return 100;
    if (esConflictoConocido(a, b)) return 0; 

    const regexA = new RegExp(`\\b${a}\\b`);
    const regexB = new RegExp(`\\b${b}\\b`);
    if (regexA.test(b) || regexB.test(a)) {
        if (Math.abs(a.length - b.length) <= 3) return 95;
    }

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

    return (levenshteinScore * 0.6) + (jaccardScore * 0.4);
};

export const LogisticaProvider = ({ children }) => {
  const [pedidos, setPedidos] = useState([]);
  const [flota, setFlota] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [fleteras, setFleteras] = useState([]);
  const [loading, setLoading] = useState(true);

  const procesarPedidosCrudos = async (viajesCrudos) => {
    const snapClientes = await getDocs(collection(db, 'clientes_logistica'));
    const snapFleteras = await getDocs(collection(db, 'catalogo_fleteras'));

    let localClientes = snapClientes.docs.map(d => ({ id: d.id, ...d.data() }));
    let localFleteras = snapFleteras.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const batch = writeBatch(db);
    let operacionesEnBatch = 0;

    for (let p of viajesCrudos) {
        let updates = { procesado_por_web: true };
        
        let rawEnvio = String(p.tipo_envio || '').trim().toUpperCase();
        let detallesUpper = String(p.detalles_entrega || '').trim().toUpperCase();
        let codigoCliente = String(p.cliente_codigo || '').trim().toUpperCase();
        let nombreCliente = String(p.cliente_nombre || '').trim().toUpperCase();
        let dirLimpia = String(p.direccion || '').trim();

        updates.requiere_cobro = p.requiere_cobro === true || p.requiere_cobro === 'true';

        // =====================================
        // LÓGICA REPARTO LOCAL (BODEGAS)
        // =====================================
        if (rawEnvio === 'LOCAL' || rawEnvio === 'REPARTO') {
            updates.tipo_envio = 'bodega_cliente'; 
            
            let aliasBase = "MATRIZ";
            if (detallesUpper.includes('FISCAL') || detallesUpper === 'DF') aliasBase = "FISCAL";
            if (detallesUpper.includes('BODEGA') || detallesUpper === 'OB' || detallesUpper.includes('OTRA')) aliasBase = "BODEGA";

            let clienteIndex = localClientes.findIndex(c => String(c.codigo || '').toUpperCase() === codigoCliente);
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
                    const esExacta = String(d.direccion || '').trim().toLowerCase() === dirLimpia.toLowerCase();
                    const esMuySimilar = similitudTextosFina(d.direccion, dirLimpia, 'direccion') >= 85; 
                    return esExacta || esMuySimilar;
                });

                if (dirExistente) {
                    updates.destino_alias = dirExistente.alias;
                    updates.cliente_id_vinculado = clienteMatch.id;
                    updates.direccion = dirExistente.direccion; 
                    updates.coordenadas = dirExistente.coordenadas;
                    updates.telefono_contacto = dirExistente.telefono || p.telefono_contacto || "";
                    if (dirExistente.link_maps) updates.link_maps = dirExistente.link_maps;
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
        // LÓGICA FLETERA FORÁNEA
        // =====================================
        else {
            let fleteraNombreCrudo = String(p.destino_alias || p.metodo_mensajeria || '').trim().toUpperCase();
            
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
            
            let fleteraMatch = null;
            let mejorPuntaje = 0;

            if (fleteraNombre !== 'POR ASIGNAR') {
                localFleteras.forEach(f => {
                    const exacto = String(f.nombre || '').trim().toUpperCase() === fleteraNombre;
                    if (exacto) {
                        fleteraMatch = f;
                        mejorPuntaje = 100;
                        return;
                    }
                    
                    const score = similitudTextosFina(f.nombre, fleteraNombre);
                    if (score >= 88 && score > mejorPuntaje) {
                        mejorPuntaje = score;
                        fleteraMatch = f;
                    }
                });
            }

            if (fleteraMatch) {
                updates.fletera_asignada_id = fleteraMatch.id;
                updates.destino_alias = fleteraMatch.nombre; 
                updates.direccion = fleteraMatch.direccion || "Dirección pendiente"; 
                updates.coordenadas = fleteraMatch.coordenadas || { lat: 25.6866, lng: -100.3161 };
                updates.telefono_contacto = fleteraMatch.telefono || "";
                if (fleteraMatch.link_maps) updates.link_maps = fleteraMatch.link_maps;
            } else if (fleteraNombre !== 'POR ASIGNAR') {
                const nombreParaCatalogo = limpiarRazonSocial(fleteraNombre);
                const nuevaFletera = {
                    nombre: nombreParaCatalogo.length > 2 ? nombreParaCatalogo : fleteraNombre,
                    direccion: "Dirección de terminal pendiente", 
                    telefono: "", 
                    link_maps: "", 
                    coordenadas: { lat: 25.6866, lng: -100.3161 }
                };
                
                const newFleteraRef = doc(collection(db, 'catalogo_fleteras'));
                batch.set(newFleteraRef, nuevaFletera); 
                operacionesEnBatch++;
                
                updates.fletera_asignada_id = newFleteraRef.id;
                updates.destino_alias = nuevaFletera.nombre; 
                
                localFleteras.push({ id: newFleteraRef.id, ...nuevaFletera });
            } else {
                updates.destino_alias = fleteraNombre;
            }
            
            updates.direccion_cliente_final = dirLimpia;
            
            let clienteIndex = localClientes.findIndex(c => String(c.codigo || '').toUpperCase() === codigoCliente);
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
            console.log(`✅ Lote procesado y ENRIQUECIDO: ${operacionesEnBatch} operaciones.`);
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
