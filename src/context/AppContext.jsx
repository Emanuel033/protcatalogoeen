import React, { createContext, useState, useEffect, useContext } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, getDocs, query, where } from "firebase/firestore";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";

// ============================================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDkQ2HcaLHY7dPvg_IRmuiZNGtcfUhu05o",
  authDomain: "productoseen.firebaseapp.com",
  projectId: "productoseen",
  appId: "1:1052892398028:web:055e67f2aa4bce0d9c9d69"
};

const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let db;
try {
  db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  db = getFirestore(firebaseApp);
}

let analytics;
isSupported().then((supported) => {
  if (supported) analytics = getAnalytics(firebaseApp);
});

// ============================================================================
// CONTEXTO GLOBAL (CEREBRO)
// ============================================================================
const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState(['Todos']);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('recoger');
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // NUEVO: Estado para el modo secreto
  const [esAdmin, setEsAdmin] = useState(false);

  const registrarEvento = (nombreEvento, parametros = {}) => {
    if (analytics) logEvent(analytics, nombreEvento, parametros);
  };

  // Detectar Modo Secreto
  useEffect(() => {
    if (searchTerm.trim().toLowerCase() === 'secreto123') {
      setEsAdmin(true);
      setSearchTerm(''); // Limpia el buscador
      alert('¡Modo Administrador Desbloqueado!');
    }
  }, [searchTerm]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await fetch('/catalogo_completo.json');
        if (!response.ok) throw new Error("Archivo JSON no encontrado");
        
        const allProducts = await response.json();
        setProductos(allProducts);
        extraerCategorias(allProducts);
        setCargando(false);
      } catch (error) {
        console.error("Error al cargar productos:", error);
        setCargando(false);
      }
    };
    fetchProductos();
  }, []);

  const extraerCategorias = (lista) => {
    let uniqueCats = [...new Set(lista.map(p => p.category || 'Varios'))];
    uniqueCats = uniqueCats.filter(c => c.toLowerCase() !== 'todos').sort();
    setCategorias(['Todos', ...uniqueCats]);
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);
  const clearCart = () => { if(window.confirm('¿Vaciar carrito?')) setCarrito([]); };

  const agregarAlCarrito = (producto, cantidad = 1) => {
    setCarrito((prev) => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + cantidad } : item);
      return [...prev, { ...producto, cantidad }];
    });
    registrarEvento('add_to_cart', { item_name: producto.name });
  };

  const eliminarProducto = (id) => setCarrito(prev => prev.filter(item => item.id !== id));
  const totalPiezas = carrito.reduce((sum, item) => sum + item.cantidad, 0);

 // ======================================================================
  // MOTOR TRADUCTOR RECURSIVO (El desglose sagrado)
  // ======================================================================
  const obtenerDesgloseBase = (idItem, cantidadMultiplicador, catalogoGlobal, resultado = {}) => {
      const item = catalogoGlobal.find(p => p.id === idItem);
      if (!item) return resultado;

      if (item.tipo_item !== 'KIT_FLEXIBLE') {
          const cod = item.codigo_sistema || item.codigo_sistema_oficial || 'SIN-CODIGO';
          if (!resultado[cod]) {
              resultado[cod] = { nombre: item.name || item.nombre_flexible, cantidad: 0 };
          }
          resultado[cod].cantidad += cantidadMultiplicador;
      } 
      else {
          const receta = item.receta || item.receta_desglose;
          if (receta) {
              for (const [compId, compQty] of Object.entries(receta)) {
                  obtenerDesgloseBase(compId, cantidadMultiplicador * compQty, catalogoGlobal, resultado);
              }
          } else {
              resultado['ERROR-RECETA'] = { nombre: `[Falta Receta] ${item.name || item.nombre_flexible}`, cantidad: cantidadMultiplicador };
          }
      }
      return resultado;
  };

  // ======================================================================
  // 1. ENVÍO POR WHATSAPP (Con negritas y emojis)
  // ======================================================================
  const sendWhatsApp = (clientData) => {
    if(carrito.length === 0) return alert("Carrito vacío");
    registrarEvento('begin_checkout', { total_items: totalPiezas });

    const name = clientData.name || "Cliente Público";
    const delivery = clientData.deliveryMethod || deliveryMethod;
    const payment = clientData.paymentMethod || paymentMethod || 'Por definir';
    const isOcurre = clientData.ocurre;

    let msg = `👋 Hola, soy *${name}*.\nPedido:\n\n`;

    // Datos de entrega
    if(delivery === 'recoger') {
        msg += `📍 *Recoger en Sucursal*\n💳 Pago: ${payment}\n\n`;
    } else if(delivery === 'local') {
        msg += `🚚 *Envío Local*\n📍 Dirección: ${clientData.address || 'N/A'}\n💳 Pago: ${payment}\n\n`;
    } else if(delivery === 'foraneo') {
        msg += `✈️ *Envío Foráneo*\n📦 Modalidad: ${isOcurre ? 'OCURRE' : 'DOMICILIO'}\n🚛 Fletera: ${clientData.fletera || 'N/A'}\n💳 Pago: ${payment}\n\n`;
    }

    msg += `*🛒 LISTA DE ARTÍCULOS:*\n\n`;

    // Recorremos el carrito con tu lógica exacta
    carrito.forEach((item, index) => {
        const prod = productos.find(p => p.id === item.id) || item;
        const isBolsas = (prod.category||'').toLowerCase().includes('bolsa');
        const paquetes = prod.paquetes || item.paquetes || [];
        
        let packSize = 1;
        if (paquetes.length > 0) packSize = parseInt(paquetes[0].piezas);
        else if (isBolsas) packSize = 100;
        else packSize = parseInt(prod.piezas) || 0;

        const tipoItem = prod.tipo_item || item.tipo_item || 'PIEZA_BASE';
        const codigoOficial = prod.codigo_sistema || prod.codigo_sistema_oficial || item.codigo_sistema || 'SIN_CODIGO';
        
        // En React tu cantidad está en "item.cantidad" (en el viejo era item.quantity)
        const p = Math.floor(item.cantidad / packSize);
        const l = item.cantidad % packSize;
        let desgloseText = [];
        if(p > 0) desgloseText.push(`📦 ${p} Paq`);
        if(l > 0) desgloseText.push(`🧩 ${l} Sueltas`);
        
        msg += `*${index + 1}. ${item.name}*\n`;
        
        if (tipoItem === 'PIEZA_BASE' || tipoItem === 'KIT_OFICIAL') {
            msg += `🔹 [${codigoOficial}]\n`;
            if(packSize > 1) {
                msg += `📝 Selección: ${desgloseText.join(' | ')} | 🏷️ Total: ${item.cantidad} pz\n`;
            } else {
                msg += `📦 Total: ${item.cantidad} pz\n`;
            }
        } 
        else if (tipoItem === 'KIT_FLEXIBLE') {
            if(packSize > 1) {
                msg += `📝 Selección: ${desgloseText.join(' | ')} | 🏷️ Total Kits: ${item.cantidad}\n`;
            } else {
                msg += `🔢 Total Kits armados: ${item.cantidad}\n`;
            }
            
            msg += `   *--- DESGLOSE PARA CAPTURA ---*\n`;
            const desgloseFinal = {};
            obtenerDesgloseBase(prod.id, item.cantidad, productos, desgloseFinal);
            
            for (const [cod, info] of Object.entries(desgloseFinal)) {
                msg += `   🔸 [${cod}] ${info.nombre}: ${info.cantidad} pz\n`;
            }
        }
        msg += `\n`; 
    });

    window.open(`https://api.whatsapp.com/send?phone=528113728493&text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ======================================================================
  // 2. ENVÍO POR CORREO (Formato formal, sin emojis para B2B)
  // ======================================================================
  const sendEmail = (clientData) => {
    if(carrito.length === 0) return alert("Carrito vacío");
    registrarEvento('begin_checkout_email', { total_items: totalPiezas });

    const name = clientData.name || "Cliente Público";
    const delivery = clientData.deliveryMethod || deliveryMethod;
    const payment = clientData.paymentMethod || paymentMethod || 'Por definir';
    const isOcurre = clientData.ocurre;

    // Saludo más formal
    let msg = `Estimado equipo de Ventas,\n\nAdjunto los detalles del pedido solicitado por: ${name}\n\n`;
    
    msg += `--- DATOS DE LOGÍSTICA Y PAGO ---\n`;

    if(delivery === 'recoger') {
        msg += `Método de entrega: Recoger en Sucursal\nForma de pago: ${payment}\n\n`;
    } else if(delivery === 'local') {
        msg += `Método de entrega: Envío Local\nDirección: ${clientData.address || 'No especificada'}\nForma de pago: ${payment}\n\n`;
    } else if(delivery === 'foraneo') {
        msg += `Método de entrega: Envío Foráneo\nModalidad: ${isOcurre ? 'OCURRE' : 'DOMICILIO'}\nFletera: ${clientData.fletera || 'No especificada'}\nForma de pago: ${payment}\n\n`;
    }

    msg += `--- LISTA DE ARTÍCULOS ---\n\n`;

    carrito.forEach((item, index) => {
        const prod = productos.find(p => p.id === item.id) || item;
        const isBolsas = (prod.category||'').toLowerCase().includes('bolsa');
        const paquetes = prod.paquetes || item.paquetes || [];
        
        let packSize = 1;
        if (paquetes.length > 0) packSize = parseInt(paquetes[0].piezas);
        else if (isBolsas) packSize = 100;
        else packSize = parseInt(prod.piezas) || 0;

        const tipoItem = prod.tipo_item || item.tipo_item || 'PIEZA_BASE';
        const codigoOficial = prod.codigo_sistema || prod.codigo_sistema_oficial || item.codigo_sistema || 'SIN_CODIGO';
        
        const p = Math.floor(item.cantidad / packSize);
        const l = item.cantidad % packSize;
        let desgloseText = [];
        if(p > 0) desgloseText.push(`${p} Paquetes`);
        if(l > 0) desgloseText.push(`${l} Sueltas`);
        
        msg += `${index + 1}. ${item.name}\n`;
        
        if (tipoItem === 'PIEZA_BASE' || tipoItem === 'KIT_OFICIAL') {
            msg += `   Código: [${codigoOficial}]\n`;
            if(packSize > 1) {
                msg += `   Selección: ${desgloseText.join(' | ')} | Total: ${item.cantidad} pz\n`;
            } else {
                msg += `   Total: ${item.cantidad} pz\n`;
            }
        } 
        else if (tipoItem === 'KIT_FLEXIBLE') {
            if(packSize > 1) {
                msg += `   Selección: ${desgloseText.join(' | ')} | Total Kits: ${item.cantidad}\n`;
            } else {
                msg += `   Total Kits armados: ${item.cantidad}\n`;
            }
            
            msg += `   --- DESGLOSE PARA CAPTURA ---\n`;
            const desgloseFinal = {};
            obtenerDesgloseBase(prod.id, item.cantidad, productos, desgloseFinal);
            
            for (const [cod, info] of Object.entries(desgloseFinal)) {
                // Viñeta limpia con guion en lugar de emoji
                msg += `   - [${cod}] ${info.nombre}: ${info.cantidad} pz\n`;
            }
        }
        msg += `\n`; 
    });

    // Asunto más profesional y descriptivo
    const subject = encodeURIComponent(`Nuevo Pedido Web - ${name}`);
    const body = encodeURIComponent(msg);
    window.location.href = `mailto:ventas@laeconomicamty.com?subject=${subject}&body=${body}`;
  };

  return (
    <AppContext.Provider value={{ 
      productos, categorias, cargando, categoriaActiva, setCategoriaActiva,
      searchTerm, setSearchTerm,
      carrito, isCartOpen, toggleCart, clearCart, agregarAlCarrito, eliminarProducto, totalPiezas,
      deliveryMethod, setDeliveryMethod, paymentMethod, setPaymentMethod, sendWhatsApp, sendEmail, // <-- Agrega sendEmail aquí
      registrarEvento, esAdmin, setEsAdmin
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
