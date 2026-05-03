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

  // El cerebro auto-masticador migrado a React
  const procesarPedidosCrudos = async (viajesCrudos, clientesActuales, fleterasActuales) => {
    for (let p of viajesCrudos) {
        let updates = { procesado_por_web: true };
        let isFletera = (p.tipo_envio === 'FLETERA') || (p.detalles_entrega && p.detalles_entrega.toLowerCase().includes('fletera'));
        let dirLimpia = (p.direccion || '').trim();
        let aliasLimpio = (p.detalles_entrega || '').trim();
        let codigoCliente = (p.cliente_codigo || '').trim().toUpperCase();
        let nombreCliente = (p.cliente_nombre || '').trim().toUpperCase();

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
            updates.destino_alias = aliasLimpio || 'Dirección Matriz';
            updates.coordenadas = {lat: 25.689804, lng: -100.312066};
        } else {
            updates.destino_alias = aliasLimpio;
            updates.coordenadas = clienteMatch.direcciones?.[0]?.coordenadas || {lat: 25.689804, lng: -100.312066};
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
        
        // ==========================================
        // AQUÍ AGREGAMOS 'entregado' PARA QUE LOS TOME EN CUENTA
        // ==========================================
        if (['pendiente', 'camino', 'fallido', 'entregado'].includes(data.estado)) {
            activos.push({ id: doc.id, ...data });
        }

        if (data.origen === 'Contpaqi' && data.procesado_por_web === false) {
            crudos.push({ id: doc.id, ...data });
        }
      });

      // Ordenar como en tu HTML
      activos.sort((a,b) => { 
        const ord = { 'fallido': 1, 'pendiente': 2, 'camino': 3, 'entregado': 4 }; 
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