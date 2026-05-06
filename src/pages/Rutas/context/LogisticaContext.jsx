import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase'; 

const LogisticaContext = createContext();

// Función de similitud (Levenshtein) para evitar duplicar direcciones por errores de dedo
const similitudTextos = (a = '', b = '') => {
    a = a.toLowerCase().trim(); b = b.toLowerCase().trim();
    if (a === b) return 100;
    if (a.includes(b) || b.includes(a)) return 85; 
    let matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) { matrix[i][j] = matrix[i - 1][j - 1]; } 
            else { matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)); }
        }
    }
    let distance = matrix[b.length][a.length];
    let maxLen = Math.max(a.length, b.length);
    return ((maxLen - distance) / maxLen) * 100;
};

export const LogisticaProvider = ({ children }) => {
  const [pedidos, setPedidos] = useState([]);
  const [flota, setFlota] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [fleteras, setFleteras] = useState([]);
  const [loading, setLoading] = useState(true);

  // EL CEREBRO AUTO-MASTICADOR (OPTIMIZADO CON BATCH Y FUZZY MATCHING)
  const procesarPedidosCrudos = async (viajesCrudos, clientesActuales, fleterasActuales) => {
    let localClientes = [...clientesActuales];
    let localFleteras = [...fleterasActuales];
    
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

        // LÓGICA REPARTO LOCAL
        if (rawEnvio === 'LOCAL' || rawEnvio === 'REPARTO') {
            updates.tipo_envio = 'reparto_local'; 
            
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
                
                // MEJORA: Buscar dirección exacta O con una similitud del 85% o más (Ignora errores de dedo o falta de "#")
                let dirExistente = direccionesCliente.find(d => {
                    const esExacta = d.direccion.trim().toLowerCase() === dirLimpia.toLowerCase();
                    const esMuySimilar = similitudTextos(d.direccion, dirLimpia) >= 85;
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
        // LÓGICA FLETERA FORÁNEA
        else {
            let fleteraNombre = (p.metodo_mensajeria || '').trim(); 
            
            if (!fleteraNombre || ['DOMICILIO', 'D', 'OCURRE', 'POR DEFINIR'].includes(fleteraNombre.toUpperCase())) {
                fleteraNombre = 'POR ASIGNAR';
            }

            if (detallesUpper.includes('DOMICILIO') || detallesUpper === 'D') {
                updates.tipo_envio = 'fletera_domicilio';
            } else {
                updates.tipo_envio = 'fletera_ocurre';
            }
            updates.destino_alias = (p.destino_alias || fleteraNombre).trim(); 

            let fleteraIndex = localFleteras.findIndex(f => f.nombre.trim().toUpperCase() === fleteraNombre.toUpperCase());
            let fleteraMatch = fleteraIndex >= 0 ? localFleteras[fleteraIndex] : null;

            if (!fleteraMatch && fleteraNombre !== 'POR ASIGNAR') {
                const nuevaFletera = {
                    nombre: fleteraNombre,
                    direccion: "Dirección pendiente", 
                    telefono: "", link_maps: "", coordenadas: { lat: 25.6866, lng: -100.3161 }
                };
                
                const newFleteraRef = doc(collection(db, 'catalogo_fleteras'));
                batch.set(newFleteraRef, nuevaFletera); 
                operacionesEnBatch++;
                
                updates.fletera_asignada_id = newFleteraRef.id;
                localFleteras.push({ id: newFleteraRef.id, ...nuevaFletera });
            } else if (fleteraMatch) {
                updates.fletera_asignada_id = fleteraMatch.id;
            }
            
            let clienteIndex = localClientes.findIndex(c => (c.codigo || '').toUpperCase() === codigoCliente);
            if(clienteIndex === -1 && codigoCliente) {
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
            console.log(`✅ Lote procesado: Se enviaron ${operacionesEnBatch} operaciones a Firebase de manera segura.`);
        } catch(e) { 
            console.error("Error ejecutando el Batch de pedidos:", e); 
        }
    }
  };

  useEffect(() => {
    const unsubFlota = onSnapshot(collection(db, 'flota'), snap => setFlota(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubChoferes = onSnapshot(collection(db, 'choferes'), snap => setChoferes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    let clientesTemp = [];
    let fleterasTemp = [];
    const unsubClientes = onSnapshot(collection(db, 'clientes_logistica'), snap => {
        clientesTemp = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setClientes(clientesTemp);
    });
    const unsubFleteras = onSnapshot(collection(db, 'catalogo_fleteras'), snap => {
        fleterasTemp = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFleteras(fleterasTemp);
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
          setTimeout(() => procesarPedidosCrudos(crudos, clientesTemp, fleterasTemp), 1000);
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
