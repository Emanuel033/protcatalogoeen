import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase'; 

const LogisticaContext = createContext();

// Función de similitud (Levenshtein) para el fuzzy matching (Mantenida por si se requiere en otras áreas)
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

  // EL CEREBRO AUTO-MASTICADOR (CON REGLAS ESTRICTAS DE N8N)
  const procesarPedidosCrudos = async (viajesCrudos, clientesActuales, fleterasActuales) => {
    // Copias locales para no duplicar datos si vienen 5 pedidos del mismo cliente nuevo al mismo tiempo
    let localClientes = [...clientesActuales];
    let localFleteras = [...fleterasActuales];

    for (let p of viajesCrudos) {
        let updates = { procesado_por_web: true };
        
        let rawEnvio = (p.tipo_envio || '').trim().toUpperCase();
        let detallesUpper = (p.detalles_entrega || '').trim().toUpperCase();
        let codigoCliente = (p.cliente_codigo || '').trim().toUpperCase();
        let nombreCliente = (p.cliente_nombre || '').trim().toUpperCase();
        let dirLimpia = (p.direccion || '').trim();

        // Asegurar bandera de cobranza
        updates.requiere_cobro = p.requiere_cobro === true || p.requiere_cobro === 'true';

        // LÓGICA REPARTO LOCAL
        if (rawEnvio === 'LOCAL' || rawEnvio === 'REPARTO') {
            updates.tipo_envio = 'reparto_local'; // PUNTO 4: Pre-seleccionar en Edit
            
            // Definir base del ALIAS
            let aliasBase = "MATRIZ";
            if (detallesUpper.includes('FISCAL') || detallesUpper === 'DF') aliasBase = "FISCAL";
            if (detallesUpper.includes('BODEGA') || detallesUpper === 'OB' || detallesUpper.includes('OTRA')) aliasBase = "BODEGA";

            // Buscar Cliente Exacto por Código SAP
            let clienteIndex = localClientes.findIndex(c => (c.codigo || '').toUpperCase() === codigoCliente);
            let clienteMatch = clienteIndex >= 0 ? localClientes[clienteIndex] : null;

            if (!clienteMatch && codigoCliente) {
                // PUNTO 1: Cliente no existe -> Darlo de Alta con todo
                let aliasFinal = aliasBase;
                const nuevoCliente = {
                    codigo: codigoCliente,
                    nombre: nombreCliente,
                    telefono: p.telefono_contacto || "",
                    direcciones: [{
                        alias: aliasFinal,
                        direccion: dirLimpia,
                        coordenadas: { lat: 25.6866, lng: -100.3161 }, // Coordenada default Monterrey
                        horario: "", link_maps: "", telefono: p.telefono_contacto || ""
                    }]
                };
                try {
                    const docRef = await addDoc(collection(db, 'clientes_logistica'), nuevoCliente);
                    updates.destino_alias = aliasFinal;
                    updates.cliente_id_vinculado = docRef.id;
                    localClientes.push({ id: docRef.id, ...nuevoCliente }); // Guardar en caché temporal
                } catch (e) { console.error("Error agregando cliente:", e); }

            } else if (clienteMatch) {
                // Cliente existe. Validar direcciones.
                let direccionesCliente = clienteMatch.direcciones || [];
                
                // PUNTO 3: Validar si la dirección exacta ya existe
                let dirExistente = direccionesCliente.find(d => d.direccion.trim().toLowerCase() === dirLimpia.toLowerCase());

                if (dirExistente) {
                    updates.destino_alias = dirExistente.alias;
                    updates.cliente_id_vinculado = clienteMatch.id;
                } else {
                    // PUNTO 2: Dirección NO existe -> Crear Alias Autoincremental
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

                    try {
                        await updateDoc(doc(db, 'clientes_logistica', clienteMatch.id), {
                            direcciones: arrayUnion(nuevaDir)
                        });
                        updates.destino_alias = aliasFinal;
                        updates.cliente_id_vinculado = clienteMatch.id;
                        
                        // Actualizar caché temporal
                        direccionesCliente.push(nuevaDir);
                        localClientes[clienteIndex].direcciones = direccionesCliente;
                    } catch(e) { console.error("Error agregando nueva dirección:", e); }
                }
            }
        } 
        // LÓGICA FLETERA FORÁNEA
        else {
            // PUNTO 5: Fleteras
            // CORRECCIÓN: Tomar solo el método de mensajería, ignorar destino_alias para el nombre
            let fleteraNombre = (p.metodo_mensajeria || '').trim(); 
            
            // Si el nombre viene vacío o trae textos basura comunes de Contpaqi, forzar a "POR ASIGNAR"
            if (!fleteraNombre || ['DOMICILIO', 'D', 'OCURRE', 'POR DEFINIR'].includes(fleteraNombre.toUpperCase())) {
                fleteraNombre = 'POR ASIGNAR';
            }

            // Pre-Selección en Modal
            if (detallesUpper.includes('DOMICILIO') || detallesUpper === 'D') {
                updates.tipo_envio = 'fletera_domicilio';
            } else {
                updates.tipo_envio = 'fletera_ocurre';
            }
            
            // Guardamos el alias para el envío, pero NO lo usamos para nombrar a la fletera
            updates.destino_alias = (p.destino_alias || fleteraNombre).trim(); 

            // Buscar Fletera en Catálogo
            let fleteraIndex = localFleteras.findIndex(f => f.nombre.trim().toUpperCase() === fleteraNombre.toUpperCase());
            let fleteraMatch = fleteraIndex >= 0 ? localFleteras[fleteraIndex] : null;

            if (!fleteraMatch && fleteraNombre !== 'POR ASIGNAR') {
                // Dar de alta la Fletera SOLO si es un nombre real y no existía
                const nuevaFletera = {
                    nombre: fleteraNombre,
                    direccion: "Dirección pendiente", // Placeholder para investigar luego
                    telefono: "", link_maps: "", coordenadas: { lat: 25.6866, lng: -100.3161 }
                };
                try {
                    const fDoc = await addDoc(collection(db, 'catalogo_fleteras'), nuevaFletera);
                    updates.fletera_asignada_id = fDoc.id;
                    localFleteras.push({ id: fDoc.id, ...nuevaFletera });
                } catch(e) { console.error("Error agregando fletera:", e); }
            } else if (fleteraMatch) {
                updates.fletera_asignada_id = fleteraMatch.id;
            }
            
            // Validar Cliente Foráneo (Dar de alta para la Base de Datos pero sin direcciones locales)
            let clienteIndex = localClientes.findIndex(c => (c.codigo || '').toUpperCase() === codigoCliente);
            if(clienteIndex === -1 && codigoCliente) {
                 const nuevoClienteForaneo = {
                    codigo: codigoCliente,
                    nombre: nombreCliente,
                    telefono: p.telefono_contacto || "",
                    direcciones: [] // Vacío porque la entrega depende de la fletera
                };
                try {
                    const docRef = await addDoc(collection(db, 'clientes_logistica'), nuevoClienteForaneo);
                    updates.cliente_id_vinculado = docRef.id;
                    localClientes.push({ id: docRef.id, ...nuevoClienteForaneo });
                } catch (e) { console.error("Error agregando cliente foraneo:", e); }
            } else if (clienteIndex !== -1) {
                 updates.cliente_id_vinculado = localClientes[clienteIndex].id;
            }
        }

        // IMPACTAR CAMBIOS EN EL PEDIDO FINAL
        try {
            await updateDoc(doc(db, 'rutas_logistica', p.id), updates);
        } catch(e) { console.error("Error al actualizar estado web del pedido:", e); }
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

        // BLINDAJE: Acepta false, null o undefined
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
          // Ejecutar el procesamiento de forma asíncrona para no trabar la interfaz
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
