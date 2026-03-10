import React, { createContext, useState, useEffect, useContext } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, getDocs, query, where } from "firebase/firestore";
// Importar Analytics
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";

// ============================================================================
// CONFIGURACIÓN DE FIREBASE (BLINDADA)
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDkQ2HcaLHY7dPvg_IRmuiZNGtcfUhu05o",
  authDomain: "productoseen.firebaseapp.com",
  projectId: "productoseen",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  });
} catch (e) {
  db = getFirestore(app);
}

// Inicializar Analytics de forma segura (verifica si el navegador lo soporta)
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
  
  // NUEVO ESTADO: Para saber qué imagen tiene zoom
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  // Función centralizada para registrar eventos
  const registrarEvento = (nombreEvento, parametros = {}) => {
    if (analytics) {
      logEvent(analytics, nombreEvento, parametros);
    }
  };

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        // Leemos el archivo estático directamente. ¡Cero lecturas a Firebase!
        const response = await fetch('/catalogo_completo.json');
        
        if (!response.ok) {
          throw new Error("No se encontró catalogo_completo.json. ¿Entraste al modo secreto para generarlo?");
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
    
    // Rastrear cuando agregan algo al carrito
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

    // Rastrear cuando un cliente inicia el pedido por WhatsApp
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
      imagenAmpliada, setImagenAmpliada // Pasamos los estados del Zoom
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

// ============================================================================
// COMPONENTES DE INTERFAZ
// ============================================================================

function Navbar() {
  const { searchTerm, setSearchTerm, registrarEvento } = useApp();
  const handleQR = () => window.dispatchEvent(new Event('open-qr-scanner'));
  
  const clearSearch = () => {
    setSearchTerm('');
  };

  // NUEVO CÓDIGO SECRETO: Escribir "secreto123" en el buscador activa el modo admin
  useEffect(() => {
    if (searchTerm.trim().toLowerCase() === 'secreto123') {
      window.dispatchEvent(new Event('activar-admin'));
      setSearchTerm(''); // Limpia la barra para que no se note
      alert('¡Modo Administrador Desbloqueado!');
    }
  }, [searchTerm]);

  // Rastrear búsquedas
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim().length > 2 && searchTerm !== 'secreto123') {
        registrarEvento('search', { search_term: searchTerm });
      }
    }, 1500); 
    return () => clearTimeout(timeoutId);
  }, [searchTerm, registrarEvento]);

  return (
    <nav className="bg-indigo-900 text-white sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="bg-white text-indigo-900 p-2 rounded-xl font-bold h-10 w-10 flex items-center justify-center shadow-sm">E</div>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-tight">ENVASES LA ECONOMICA</h1>
              <p className="text-[10px] text-indigo-300 uppercase">Catálogo Digital</p>
            </div>
          </div>
          <div className="flex gap-2 md:hidden">
            <button onClick={handleQR} className="bg-indigo-800 p-2 rounded-full text-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            </button>
          </div>
        </div>
        <div className="w-full md:w-96 flex gap-2 relative">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar producto..." className="w-full py-2.5 pl-4 pr-10 rounded-xl bg-indigo-100/20 text-white placeholder-indigo-200 focus:bg-white focus:text-slate-800 transition-all text-sm outline-none" />
          {searchTerm !== '' && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">X</button>
          )}
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <div className="bg-indigo-800 py-8 px-4 text-center">
      <h2 className="text-3xl font-black text-white mb-2">Soluciones de Empaque</h2>
      <p className="text-indigo-200 text-sm">Todo lo que tu negocio necesita en un solo lugar.</p>
    </div>
  );
}

function CategoriesBar() {
  const { categorias, categoriaActiva, setCategoriaActiva, registrarEvento } = useApp();
  
  const manejarClickCategoria = (cat) => {
    setCategoriaActiva(cat);
    registrarEvento('select_content', { content_type: 'category', item_id: cat });
  };

  return (
    <div className="bg-white shadow-sm sticky top-[68px] z-30 overflow-x-auto border-b border-slate-200 py-3 px-4 flex gap-2">
      {categorias.map(cat => (
        <button key={cat} onClick={() => manejarClickCategoria(cat)} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${categoriaActiva === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          {cat}
        </button>
      ))}
    </div>
  );
}

function ProductCard({ product }) {
  const { agregarAlCarrito, setImagenAmpliada } = useApp();
  
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-2 hover:shadow-md transition">
      {/* Ccontenedor de imagen clickeable para abrir el zoom */}
      <div 
        onClick={() => setImagenAmpliada(product)}
        className="h-32 w-full bg-slate-50 rounded-xl overflow-hidden p-2 relative group cursor-pointer"
      >
        <img 
          src={product.image} 
          alt={product.name} 
          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-110" 
          onError={(e) => e.target.src='https://via.placeholder.com/150'} 
        />
        <div className="absolute inset-0 bg-indigo-900/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="bg-white/90 text-indigo-900 text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            Ver Foto
          </span>
        </div>
      </div>
      
      <h4 className="text-sm font-bold text-slate-800 line-clamp-2 mt-2">{product.name}</h4>
      <p className="text-[10px] uppercase font-bold text-slate-400">{product.category}</p>
      
      <button onClick={() => agregarAlCarrito(product, 1)} className="mt-auto bg-indigo-50 text-indigo-600 font-bold py-2 rounded-xl hover:bg-indigo-100 transition text-sm">
        Agregar
      </button>
    </div>
  );
}

// NUEVO: Componente para mostrar la imagen con Zoom
function ImageZoomModal() {
  const { imagenAmpliada, setImagenAmpliada, agregarAlCarrito } = useApp();

  if (!imagenAmpliada) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm transition-opacity" 
      onClick={() => setImagenAmpliada(null)}
    >
      <div 
        className="relative max-w-sm w-full bg-white rounded-2xl p-6 flex flex-col items-center shadow-2xl transform scale-100 transition-transform" 
        onClick={e => e.stopPropagation()} // Evita que se cierre al clickear la tarjeta
      >
        <button 
          onClick={() => setImagenAmpliada(null)} 
          className="absolute top-4 right-4 bg-slate-100 text-slate-500 hover:text-red-500 hover:bg-red-50 w-8 h-8 rounded-full flex items-center justify-center font-bold transition"
        >
          X
        </button>
        
        <div className="w-full h-64 bg-slate-50 rounded-xl p-4 mb-4 flex items-center justify-center">
           <img 
             src={imagenAmpliada.image} 
             alt={imagenAmpliada.name} 
             className="max-h-full max-w-full object-contain mix-blend-multiply" 
             onError={(e) => e.target.src='https://via.placeholder.com/300'} 
           />
        </div>
        
        <h3 className="text-lg font-black text-slate-800 text-center leading-tight">{imagenAmpliada.name}</h3>
        <p className="text-xs font-bold text-indigo-500 uppercase mt-2 mb-6">{imagenAmpliada.category}</p>
        
        <button 
          onClick={() => { agregarAlCarrito(imagenAmpliada, 1); setImagenAmpliada(null); }} 
          className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-500 transition shadow-md flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}

function ProductGrid() {
  const { productos, cargando, categoriaActiva, searchTerm } = useApp();

  if (cargando) {
    return (
      <div className="col-span-full text-center py-12">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium">Cargando catálogo...</p>
      </div>
    );
  }

  const termino = (searchTerm || '').toLowerCase().trim();
  const catActiva = (categoriaActiva || 'Todos').toLowerCase().trim();
  
  let productosFiltrados = (productos || []).filter(p => {
    const categoriaProducto = (p.category || '').toLowerCase();
    const nombreProducto = (p.name || '').toLowerCase();
    const codigoProducto = (p.codigo_sistema || '').toLowerCase();

    const coincideCategoria = catActiva === 'todos' || categoriaProducto === catActiva;
    const coincideBusqueda = termino === '' || nombreProducto.includes(termino) || codigoProducto.includes(termino);
    
    return coincideCategoria && coincideBusqueda;
  });

  productosFiltrados = productosFiltrados.sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  if (productosFiltrados.length === 0) {
    return (
      <div className="col-span-full text-center py-20 fade-in">
        <h3 className="text-lg font-bold text-slate-700 mb-1">Sin resultados</h3>
        <p className="text-sm text-slate-400">No encontramos "{searchTerm}" en esta categoría.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
      {productosFiltrados.map((prod) => <ProductCard key={prod.id} product={prod} />)}
    </div>
  );
}

function FloatingButtons() {
  const { toggleCart, totalPiezas } = useApp();
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button onClick={toggleCart} className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center relative hover:scale-105 transition">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        {totalPiezas > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{totalPiezas}</span>}
      </button>
    </div>
  );
}

function CartDrawer() {
  const { isCartOpen, toggleCart, carrito, totalPiezas, eliminarProducto, sendWhatsApp } = useApp();

  return (
    <div className={`fixed inset-0 z-50 ${isCartOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div onClick={toggleCart} className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity ${isCartOpen ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b flex justify-between items-center bg-indigo-50">
          <h2 className="font-bold text-indigo-900">Tu Pedido ({totalPiezas})</h2>
          <button onClick={toggleCart} className="text-slate-500 hover:text-red-500 font-bold">X</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {carrito.length === 0 ? (
             <p className="text-center text-slate-400 mt-10">Tu carrito está vacío</p>
          ) : (
            carrito.map(item => (
              <div key={item.id} className="flex gap-3 border-b pb-3">
                <img src={item.image} alt={item.name} className="w-12 h-12 object-contain bg-slate-50 rounded p-1" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold line-clamp-2">{item.name}</h4>
                  <p className="text-xs text-indigo-600 mt-1">Cantidad: {item.cantidad}</p>
                </div>
                <button onClick={() => eliminarProducto(item.id)} className="text-red-400 text-xs">Quitar</button>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t">
          <button onClick={() => sendWhatsApp({})} disabled={carrito.length === 0} className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl disabled:opacity-50">
            Enviar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

function QRScanner() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-qr-scanner', handleOpen);
    return () => window.removeEventListener('open-qr-scanner', handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 text-white text-center">
      <div className="w-full max-w-sm bg-slate-800 rounded-xl p-6">
        <h3 className="font-bold mb-4">Escáner QR (Modo de Vista Previa)</h3>
        <p className="text-sm text-slate-400 mb-6">La cámara está desactivada en la vista previa segura. Por favor, compila tu aplicación localmente para probar el escáner.</p>
        <button onClick={() => setIsOpen(false)} className="bg-red-500 px-6 py-2 rounded-lg font-bold">Cerrar Escáner</button>
      </div>
    </div>
  );
}

function BackupTool({ onClose }) {
  const [cargando, setCargando] = useState(false);

  const descargarCatalogoPerfecto = async () => {
    setCargando(true);
    try {
      // AQUÍ ES EL ÚNICO LUGAR DONDE SE LEE FIREBASE: En la herramienta secreta de Admin.
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

      const jsonTexto = JSON.stringify(allProducts, null, 2);
      const blob = new Blob([jsonTexto], { type: 'application/json' });
      const enlace = document.createElement('a');
      const url = URL.createObjectURL(blob);
      enlace.href = url;
      enlace.download = `catalogo_completo.json`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url); 
      
      alert(`¡Catálogo Completo exportado con éxito! Ahora muévelo a la carpeta 'public' de tu proyecto.`);
    } catch (error) {
      console.error(error);
      alert(`Error al generar el catálogo. Asegúrate de tener conexión a internet.`);
    }
    setCargando(false);
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl my-8 text-center border border-emerald-500/30 relative">
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 text-slate-400 hover:text-red-400 font-bold w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 transition-colors"
        title="Cerrar Herramienta"
      >
        X
      </button>
      <h3 className="text-lg font-black mb-2 pr-6">Generador de Catálogo Estático</h3>
      <p className="text-xs text-slate-400 mb-6 max-w-xl mx-auto">Este botón recopila todos tus productos y sus paquetes desde la base de datos y arma el archivo JSON que usaremos para que tu app funcione sin gastar saldo en Firebase.</p>
      <button 
        onClick={descargarCatalogoPerfecto} 
        disabled={cargando}
        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-3 px-6 rounded-xl font-black transition active:scale-95 disabled:opacity-50"
      >
        {cargando ? 'Armando Catálogo...' : 'Descargar catalogo_completo.json'}
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-center py-6 text-xs mt-10">
      <p>© 2026 Envases La Económica del Norte.</p>
    </footer>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
function App() {
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    // Revisión por si acaso aún usan el URL
    const parametrosUrl = new URLSearchParams(window.location.search);
    if (parametrosUrl.get('modo') === 'secreto') {
      setEsAdmin(true);
    }

    // Escuchar el evento desencadenado desde la barra de búsqueda
    const activarModoAdmin = () => setEsAdmin(true);
    window.addEventListener('activar-admin', activarModoAdmin);
    
    return () => window.removeEventListener('activar-admin', activarModoAdmin);
  }, []);

  return (
    <AppProvider>
      <div className="bg-slate-50 font-sans text-slate-800 flex flex-col min-h-screen relative overflow-x-hidden">
        <Navbar />
        <Hero />
        <CategoriesBar />
        
        <main className="flex-grow max-w-7xl mx-auto px-4 py-4 w-full">
          {esAdmin && <BackupTool onClose={() => setEsAdmin(false)} />} 
          <ProductGrid />
        </main>
        
        <Footer />
        <CartDrawer />
        <FloatingButtons />
        <QRScanner /> 
        <ImageZoomModal /> {/* Componente del Zoom renderizado al final */}
      </div>
    </AppProvider>
  );
}

export default App;
