import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState(['Todos']);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  
  // ESTADO DEL BUSCADOR (Garantizado)
  const [searchTerm, setSearchTerm] = useState('');
  
  const [carrito, setCarrito] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [deliveryMethod, setDeliveryMethod] = useState('recoger');
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const cacheLocal = sessionStorage.getItem('catalogo_een_data');
        const timestampCache = sessionStorage.getItem('catalogo_een_time');
        const TIEMPO_EXPIRACION = 60 * 60 * 1000;

        if (cacheLocal && timestampCache && (Date.now() - timestampCache < TIEMPO_EXPIRACION)) {
          const cachedData = JSON.parse(cacheLocal);
          setProductos(cachedData);
          extraerCategorias(cachedData);
          setCargando(false);
          return;
        }

        const q = query(collection(db, 'productos_master'), where('activo', '==', true));
        const snapshot = await getDocs(q);

        let rawProducts = [];
        let basesToFetch = new Set();

        snapshot.forEach(doc => {
          const data = doc.data();
          rawProducts.push({ id: doc.id, ...data });
          if (data.tipo_item === 'PIEZA_BASE') basesToFetch.add(doc.id);
          else if (data.hereda_empaques_de) basesToFetch.add(data.hereda_empaques_de);
        });

        const paquetesMap = {};
        const promesasPaquetes = Array.from(basesToFetch).map(async (baseId) => {
          try {
            const paqSnap = await getDocs(collection(db, 'productos_master', baseId, 'paquetes'));
            paquetesMap[baseId] = [];
            paqSnap.forEach(pDoc => paquetesMap[baseId].push({ id: pDoc.id, ...pDoc.data() }));
            paquetesMap[baseId].sort((a, b) => a.piezas - b.piezas);
          } catch (error) {}
        });
        
        await Promise.all(promesasPaquetes);

        const allProducts = rawProducts.map(data => {
          const producto = {
            id: data.id,
            name: data.nombre_flexible || 'Sin nombre',
            category: data.categoria || 'General',
            image: data.imagen_url || 'https://via.placeholder.com/300?text=Sin+Imagen',
            piezas: data.piezas_por_caja_original || 1,
            stock: data.stock_total_piezas || 0,
            tipo_item: data.tipo_item || 'PIEZA_BASE',
            codigo_sistema: data.codigo_sistema_oficial || data.codigo_sistema || null,
            receta: data.receta_desglose || data.receta || null,
            paquetes: [] 
          };

          if (producto.tipo_item === 'PIEZA_BASE') producto.paquetes = paquetesMap[producto.id] || [];
          else if (data.hereda_empaques_de) producto.paquetes = paquetesMap[data.hereda_empaques_de] || [];
          return producto;
        });

        sessionStorage.setItem('catalogo_een_data', JSON.stringify(allProducts));
        sessionStorage.setItem('catalogo_een_time', Date.now());

        setProductos(allProducts);
        extraerCategorias(allProducts);
        setCargando(false);
      } catch (error) {
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
  };

  const quitarDelCarrito = (productoId) => setCarrito(prev => prev.map(item => item.id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item).filter(item => item.cantidad > 0));
  const eliminarProducto = (id) => setCarrito(prev => prev.filter(item => item.id !== id));
  const totalPiezas = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  const obtenerDesgloseBase = (idItem, cantidadMultiplicador, catalogoGlobal, resultado = {}) => {
    const item = catalogoGlobal.find(p => p.id === idItem);
    if (!item) return resultado;
    if (item.tipo_item !== 'KIT_FLEXIBLE') {
        const cod = item.codigo_sistema || 'SIN-CODIGO';
        if (!resultado[cod]) resultado[cod] = { nombre: item.name, cantidad: 0 };
        resultado[cod].cantidad += cantidadMultiplicador;
    } else {
        const receta = item.receta;
        if (receta) {
            for (const [compId, compQty] of Object.entries(receta)) obtenerDesgloseBase(compId, cantidadMultiplicador * compQty, catalogoGlobal, resultado);
        }
    }
    return resultado;
  };

  const getRandomPhone = () => ['528113728493', '528118400503'][Math.floor(Math.random() * 2)];

  const sendWhatsApp = (clientData) => {
    if(carrito.length === 0) return alert("Carrito vacío");
    const name = clientData.name || "Cliente Público";
    let msg = `👋 Hola, soy *${name}*.\nPedido:\n\n`;
    
    if(deliveryMethod === 'recoger') msg += `📍 Recoger en Sucursal\n💳 Pago: ${paymentMethod || 'Por definir'}\n\n`;
    else if(deliveryMethod === 'local') msg += `🚚 Envío Local\n📍 Dirección: ${clientData.address || 'N/A'}\n💳 Pago: ${paymentMethod || 'Por definir'}\n\n`;
    else if(deliveryMethod === 'foraneo') msg += `✈️ Envío Foráneo\n📦 Modalidad: ${clientData.ocurre ? 'OCURRE' : 'DOMICILIO'}\n🚛 Fletera: ${clientData.fletera || 'N/A'}\n💳 Pago: ${paymentMethod || 'Transferencia'}\n\n`;

    msg += `*🛒 LISTA DE ARTÍCULOS:*\n\n`;

    carrito.forEach((item, index) => {
        const isBolsas = (item.category||'').toLowerCase().includes('bolsa');
        const paquetes = item.paquetes || [];
        let packSize = paquetes.length > 0 ? parseInt(paquetes[0].piezas) : (isBolsas ? 100 : parseInt(item.piezas) || 0);
        const p = Math.floor(item.cantidad / packSize);
        const l = item.cantidad % packSize;
        let desgloseText = [];
        if(p > 0) desgloseText.push(`📦 ${p} Paq`);
        if(l > 0) desgloseText.push(`🧩 ${l} Sueltas`);
        
        msg += `*${index + 1}. ${item.name}*\n`;
        if (item.tipo_item === 'PIEZA_BASE' || item.tipo_item === 'KIT_OFICIAL') {
            msg += `🔹 [${item.codigo_sistema || 'SIN_CODIGO'}]\n`;
            if(packSize > 1) msg += `📝 Selección: ${desgloseText.join(' | ')} | 🏷️ Total: ${item.cantidad} pz\n`;
            else msg += `📦 Total: ${item.cantidad} pz\n`;
        } else if (item.tipo_item === 'KIT_FLEXIBLE') {
            if(packSize > 1) msg += `📝 Selección: ${desgloseText.join(' | ')} | 🏷️ Total Kits: ${item.cantidad}\n`;
            else msg += `🔢 Total Kits armados: ${item.cantidad}\n`;
            msg += `   *--- DESGLOSE PARA CAPTURA ---*\n`;
            const desgloseFinal = {};
            obtenerDesgloseBase(item.id, item.cantidad, productos, desgloseFinal);
            for (const [cod, info] of Object.entries(desgloseFinal)) msg += `   🔸 [${cod}] ${info.nombre}: ${info.cantidad} pz\n`;
        }
        msg += `\n`; 
    });

    window.open(`https://api.whatsapp.com/send?phone=${getRandomPhone()}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const askProduct = (productName) => window.open(`https://api.whatsapp.com/send?phone=${getRandomPhone()}&text=${encodeURIComponent("Info sobre: " + productName)}`, '_blank');

  return (
    <AppContext.Provider value={{ 
      productos, categorias, cargando, categoriaActiva, setCategoriaActiva,
      searchTerm, setSearchTerm, // <--- EXPORTANDO EL BUSCADOR
      carrito, isCartOpen, toggleCart, clearCart, agregarAlCarrito, quitarDelCarrito, eliminarProducto, totalPiezas,
      deliveryMethod, setDeliveryMethod, paymentMethod, setPaymentMethod, sendWhatsApp, askProduct
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);