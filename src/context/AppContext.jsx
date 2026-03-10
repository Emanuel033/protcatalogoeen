import React, { createContext, useState, useEffect, useContext } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
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

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// Exportamos la db para que el BackupTool (Modo Secreto) pueda usarla
export let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  });
} catch (e) {
  db = getFirestore(app);
}

// Inicializar Analytics
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
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
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  const registrarEvento = (nombreEvento, parametros = {}) => {
    if (analytics) {
      logEvent(analytics, nombreEvento, parametros);
    }
  };

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await fetch('/catalogo_completo.json');
        
        if (!response.ok) {
          throw new Error("No se encontró catalogo_completo.json.");
        }

        const allProducts = await response.json();
        setProductos(allProducts);
        extraerCategorias(allProducts);
        setCargando(false);
      } catch (error) {
        console.error("Error al cargar productos estáticos:", error);
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

  const agregarAlCarrito = (producto, cantidadAAgregar = 1) => {
    setCarrito((prev) => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + cantidadAAgregar } : item);
      return [...prev, { ...producto, cantidad: cantidadAAgregar }];
    });
    
    registrarEvento('add_to_cart', {
      item_name: producto.name,
      item_category: producto.category,
      quantity: cantidadAAgregar
    });
  };

  const quitarDelCarrito = (productoId) => setCarrito(prev => prev.map(item => item.id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item).filter(item => item.cantidad > 0));
  const eliminarProducto = (id) => setCarrito(prev => prev.filter(item => item.id !== id));
  const totalPiezas = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  const sendWhatsApp = (clientData) => {
    if(carrito.length === 0) return alert("Carrito vacío");

    registrarEvento('begin_checkout', {
      total_items: totalPiezas,
      delivery_method: deliveryMethod
    });

    const name = clientData.name || "Cliente Público";
    let msg = `👋 Hola, soy *${name}*.\nPedido:\n\n`;
    
    if(deliveryMethod === 'recoger') msg += `📍 Recoger en Sucursal\n💳 Pago: ${paymentMethod || 'Por definir'}\n\n`;
    else if(deliveryMethod === 'local') msg += `🚚 Envío Local\n📍 Dirección: ${clientData.address || 'N/A'}\n💳 Pago: ${paymentMethod || 'Por definir'}\n\n`;
    else if(deliveryMethod === 'foraneo') msg += `✈️ Envío Foráneo\n📦 Modalidad: ${clientData.ocurre ? 'OCURRE' : 'DOMICILIO'}\n🚛 Fletera: ${clientData.fletera || 'N/A'}\n💳 Pago: ${paymentMethod || 'Transferencia'}\n\n`;

    msg += `*🛒 LISTA DE ARTÍCULOS:*\n\n`;
    
    carrito.forEach((item, index) => {
        msg += `*${index + 1}. ${item.name}* - Total: ${item.cantidad} pz\n`;
    });

    window.open(`https://api.whatsapp.com/send?phone=528113728493&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <AppContext.Provider value={{ 
      productos, categorias, cargando, categoriaActiva, setCategoriaActiva,
      searchTerm, setSearchTerm,
      carrito, isCartOpen, toggleCart, clearCart, agregarAlCarrito, quitarDelCarrito, eliminarProducto, totalPiezas,
      deliveryMethod, setDeliveryMethod, paymentMethod, setPaymentMethod, sendWhatsApp,
      registrarEvento,
      imagenAmpliada, setImagenAmpliada
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
