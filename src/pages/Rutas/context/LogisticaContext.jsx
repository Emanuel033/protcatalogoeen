import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase'; 

const LogisticaContext = createContext();

// Función de similitud (Levenshtein) para el fuzzy matching
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

  // EL CEREBRO AUTO-MASTICADOR (AHORA CON REGLAS CONTPAQ EXACTAS)
  const procesarPedidosCrudos = async (viajesCrudos, clientesActuales, fleterasActuales) => {
    for (let p of viajesCrudos) {
        let updates = { procesado_por_web: true };
        
        let rawEnvio = (p.tipo_envio || '').toUpperCase();
        let tipoLimpio = 'bodega_cliente';
        let destinoAlias = p.destino_alias || p.detalles_entrega || '';

        // 1. TRADUCTOR CONTPAQ: Separar por " Y "
        if (rawEnvio.includes(' Y ')) {
            const partes = rawEnvio.split(' Y ');
            const transporte = partes[0].trim(); // "LOCAL" o Nombre de Fletera
            const modalidad = partes[1].trim();  // "DF", "OB", "D", "O"

            if (transporte === 'LOCAL') {
                tipoLimpio = 'bodega_cliente';
                if (modalidad === 'DF') destinoAlias = 'Domicilio Fiscal';
                if (modalidad === 'OB') destinoAlias = 'Otra Bodega';
            } else {
                // Si no es LOCAL, asume que es el nombre de la fletera
                tipoLimpio = (modalidad === 'O' || modalidad === 'OCURRE') ? 'fletera_ocurre' : 'fletera_domicilio';
                destinoAlias = transporte; 
            }
        } else {
            // Fallback por si viene en otro formato
            if (rawEnvio === 'LOCAL') tipoLimpio = 'bodega_cliente';
            else if (rawEnvio === 'FLETERA') tipoLimpio = 'fletera_domicilio';
        }

        updates.tipo_envio = tipoLimpio;
        updates.destino_alias = destinoAlias;

        // 2. Banderas de Cobranza y Variables Extra
        updates.requiere_cobro = p.requiere_cobro === true || p.requiere_cobro === 'true';

        let dirLimpia = (p.direccion || '').trim();
        let codigoCliente = (p.cliente_codigo || '').trim().toUpperCase();
        let nombreCliente = (p.cliente_nombre || '').trim().toUpperCase();

        const isFletera = tipoLimpio.includes('fletera');
        if (isFletera) {
            // SI ES FLETERA: Buscar en el catálogo de fleteras, no en clientes
            let fleteraMatch = null;
            let mejorPuntajeFletera = 0;
            fleterasActuales.forEach(f => {
                let score = similitudTextos(f.nombre, updates.destino_alias || nombreCliente);
                if (score > mejorPuntajeFletera) { mejorPuntajeFletera = score; fleteraMatch = f; }
            });
            
            if (mejorPuntajeFletera >= 80 && fleteraMatch) {
                updates.destino_alias = fleteraMatch.alias || fleteraMatch.nombre;
                if(!dirLimpia) updates.direccion = fleteraMatch.direccion || dirLimpia;
                updates.coordenadas = fleteraMatch.coordenadas || {lat: 25.689804, lng: -100.312066};
            } else {
                updates.destino_alias = updates.destino_alias || 'Fletera Foránea';
                updates.coordenadas = {lat: 25.689804, lng: -100.312066};
            }
        } else {
            // SI ES LOCAL: Buscar en el catálogo de clientes
            let clienteMatch = codigoCliente ? clientesActuales.find(c => (c.codigo || '').toUpperCase() === codigoCliente) : null;
            
            if (!clienteMatch && nombreCliente) {
                let mejorPuntajeCliente = 0;
                clientesActuales.forEach(c => {
                    let score = similitudTextos(c.nombre, nombreCliente);
                    if (score > mejorPuntajeCliente) { mejorPuntajeCliente = score; clienteMatch = c; }
                });
                if (mejorPuntajeCliente < 80) clienteMatch = null; 
            }

            if (!clienteMatch) {
                updates.destino_alias = updates.destino_alias || 'Dirección Matriz';
                updates.coordenadas = {lat: 25.689804, lng: -100.312066};
            } else {
                updates.destino_alias = updates.destino_alias || 'Dirección Matriz';
                updates.coordenadas = clienteMatch.direcciones?.[0]?.coordenadas || {lat: 25.689804, lng: -100.312066};
                if(!dirLimpia) updates.direccion = clienteMatch.direcciones?.[0]?.direccion || '';
            }
        }

        await updateDoc(doc(db, 'rutas_logistica', p.id), updates);
    }
  };

  useEffect(() => {
    // Escuchar catálogos maestros
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

    // Escuchar Rutas y detonar procesamiento
    const unsubRutas = onSnapshot(collection(db, 'rutas_logistica'), (snapshot) => {
      let activos = [];
      let crudos = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (['pendiente', 'camino', 'fallido', 'entregado'].includes(data.estado)) {
            activos.push({ id: doc.id, ...data });
        }

        if (data.origen === 'Contpaqi' && data.procesado_por_web === false) {
            crudos.push({ id: doc.id, ...data });
        }
      });

      // Ordenar: Fallas primero, luego Pendientes, luego lo que está en movimiento, y al final Entregados
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