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

  const sendWhatsApp = (clientData) => {
    if(carrito.length === 0) return alert("Carrito vacío");
    registrarEvento('begin_checkout', { total_items: totalPiezas });

    const name = clientData.name || "Cliente Público";
    let msg = `👋 Hola, soy *${name}*.\nPedido:\n\n`;
    
    carrito.forEach((item, index) => {
        msg += `*${index + 1}. ${item.name}* - Cant: ${item.cantidad}\n`;
    });

    window.open(`https://api.whatsapp.com/send?phone=528113728493&text=${encodeURIComponent(msg)}`, '_blank');
  };
  
// --- NUEVA FUNCIÓN: Enviar por Correo ---
  const sendEmail = (clientData) => {
    if(carrito.length === 0) return alert("Carrito vacío");
    registrarEvento('begin_checkout_email', { total_items: totalPiezas });

    const name = clientData.name || "Cliente Público";
    const address = clientData.address || "No especificada";
    const delivery = deliveryMethod;
    const payment = paymentMethod || "No especificado";

    let msg = `Hola, mi nombre es ${name}.\n\nAdjunto los detalles de mi pedido:\n\n`;
    
    carrito.forEach((item, index) => {
        msg += `${index + 1}. ${item.name} - Cantidad: ${item.cantidad}\n`;
    });

    msg += `\n--- DATOS DE ENTREGA Y PAGO ---\n`;
    msg += `Método de entrega: ${delivery.toUpperCase()}\n`;
    if (delivery === 'local') msg += `Dirección: ${address}\n`;
    if (delivery === 'foraneo') msg += `Fletera: ${clientData.fletera || 'No especificada'} (${clientData.ocurre ? 'Ocurre' : 'Domicilio'})\n`;
    msg += `Método de pago: ${payment.toUpperCase()}\n\n`;

    const subject = encodeURIComponent(`Nuevo Pedido de ${name}`);
    const body = encodeURIComponent(msg);
    
    // Cambia el correo "ventas@tuempresa.com" por el tuyo
    window.location.href = `mailto:ventas@tuempresa.com?subject=${subject}&body=${body}`;
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
