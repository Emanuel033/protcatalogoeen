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

// Inicialización de Firestore
let db;
try {
  db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  db = getFirestore(firebaseApp);
}

// Inicialización de Analytics
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(firebaseApp);
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
        // Carga desde el JSON estático en la carpeta public
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

  return (
    <AppContext.Provider value={{ 
      productos, categorias, cargando, categoriaActiva, setCategoriaActiva,
      searchTerm, setSearchTerm,
      carrito, isCartOpen, toggleCart, clearCart, agregarAlCarrito, eliminarProducto, totalPiezas,
      deliveryMethod, setDeliveryMethod, paymentMethod, setPaymentMethod, sendWhatsApp,
      registrarEvento, imagenAmpliada, setImagenAmpliada
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
  
  // ACTIVADOR DEL MODO SECRETO: Escribe 'secreto123' en la búsqueda
  useEffect(() => {
    if (searchTerm.trim().toLowerCase() === 'secreto123') {
      window.dispatchEvent(new Event('activar-admin'));
      setSearchTerm('');
      alert('¡Modo Administrador Desbloqueado!');
    }
  }, [searchTerm, setSearchTerm]);

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
    <nav className="bg-indigo-900 text-white sticky top-0 z-40 p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="font-black tracking-tighter text-xl">ENVASES LA ECONÓMICA</h1>
        <input 
          type="text" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar producto o código secreto..." 
          className="w-full md:w-80 p-2 rounded-lg bg-indigo-800 text-white placeholder-indigo-300 outline-none focus:ring-2 ring-indigo-400"
        />
      </div>
    </nav>
  );
}

function ProductCard({ product }) {
  const { agregarAlCarrito, setImagenAmpliada } = useApp();
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition">
      <div 
        onClick={() => setImagenAmpliada(product)}
        className="h-32 w-full bg-slate-50 rounded-xl overflow-hidden mb-3 cursor-zoom-in group"
      >
        <img 
          src={product.image} 
          className="h-full w-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform" 
          alt={product.name}
          onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Sin+Imagen'; }}
        />
      </div>
      <h4 className="text-sm font-bold text-slate-800 line-clamp-2 min-h-[40px]">{product.name}</h4>
      <button 
        onClick={() => agregarAlCarrito(product)}
        className="mt-4 bg-indigo-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition"
      >
        Agregar
      </button>
    </div>
  );
}

function ImageZoomModal() {
  const { imagenAmpliada, setImagenAmpliada, agregarAlCarrito } = useApp();
  if (!imagenAmpliada) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setImagenAmpliada(null)}>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
        <button onClick={() => setImagenAmpliada(null)} className="absolute top-4 right-4 text-slate-400 text-xl font-bold">✕</button>
        <img src={imagenAmpliada.image} className="w-full h-64 object-contain mb-4" alt="Zoom" />
        <h3 className="font-bold text-lg text-slate-800 mb-6">{imagenAmpliada.name}</h3>
        <button 
          onClick={() => { agregarAlCarrito(imagenAmpliada); setImagenAmpliada(null); }}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200"
        >
          Agregar al Carrito
        </button>
      </div>
    </div>
  );
}

function BackupTool({ onClose }) {
  const [cargando, setCargando] = useState(false);

  const generarJson = async () => {
    setCargando(true);
    try {
      const q = query(collection(db, 'productos_master'), where('activo', '==', true));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'catalogo_completo.json';
      link.click();
      alert("¡Catálogo generado! Guárdalo en la carpeta 'public' de tu proyecto.");
    } catch (e) {
      alert("Error al conectar con Firebase: " + e.message);
    }
    setCargando(false);
  };

  return (
    <div className="bg-emerald-900 text-white p-6 rounded-3xl my-6 text-center border-2 border-emerald-400">
      <h2 className="font-bold mb-2">Herramienta de Administrador</h2>
      <p className="text-xs text-emerald-200 mb-4">Usa este botón para actualizar el archivo JSON de tu catálogo.</p>
      <button 
        onClick={generarJson} 
        disabled={cargando}
        className="bg-white text-emerald-900 px-6 py-3 rounded-xl font-black disabled:opacity-50"
      >
        {cargando ? 'Cargando Firebase...' : 'Generar catalogo_completo.json'}
      </button>
      <button onClick={onClose} className="block w-full mt-4 text-xs text-emerald-300">Cerrar Modo Admin</button>
    </div>
  );
}

function ProductList() {
  const { productos, cargando, categoriaActiva, searchTerm } = useApp();
  
  if (cargando) return <p className="col-span-full text-center py-10">Cargando catálogo...</p>;

  const term = searchTerm.toLowerCase().trim();
  const filtered = productos.filter(p => 
    (categoriaActiva === 'Todos' || p.category === categoriaActiva) &&
    (p.name.toLowerCase().includes(term) || (p.codigo_sistema && p.codigo_sistema.toLowerCase().includes(term)))
  );

  if (filtered.length === 0) return <p className="col-span-full text-center py-10 text-slate-400">No se encontraron productos.</p>;

  return filtered.map(p => <ProductCard key={p.id} product={p} />);
}

const App = () => {
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    const activar = () => setEsAdmin(true);
    window.addEventListener('activar-admin', activar);
    return () => window.removeEventListener('activar-admin', activar);
  }, []);

  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-50 pb-20">
        <Navbar />
        <main className="max-w-7xl mx-auto p-4">
          {esAdmin && <BackupTool onClose={() => setEsAdmin(false)} />}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <ProductList /> 
          </div>
        </main>
        <ImageZoomModal />
      </div>
    </AppProvider>
  );
};

export default App;
