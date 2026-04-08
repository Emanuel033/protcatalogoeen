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
  
  // ✨ NUEVO ESTADO PARA EL FILTRO RÁPIDO (Píldoras)
  const [filtroRapido, setFiltroRapido] = useState(null);

  // ---------------------------------------------------------
  // ✨ EFECTO PARA LEER LA URL Y AUTO-BUSCAR
  // ---------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const busquedaURL = params.get('q'); 

    if (busquedaURL) {
      setSearchTerm(busquedaURL);
    }
  }, []); 
  // ---------------------------------------------------------

  // 1. Al iniciar, intenta recuperar el carrito guardado
  const [carrito, setCarrito] = useState(() => {
    try {
      const carritoGuardado = localStorage.getItem('carrito_een');
      return carritoGuardado ? JSON.parse(carritoGuardado) : [];
    } catch (error) {
      return [];
    }
  });

  // 2. Cada vez que 'carrito' cambie, guárdalo en la memoria del navegador
  useEffect(() => {
    localStorage.setItem('carrito_een', JSON.stringify(carrito));
  }, [carrito]);
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
        
        const allProductsRaw = await response.json();

        // 🧠 1. CALCULAR STOCK DE KITS PRIMERO
        const productosConStockReal = calcularStockKits(allProductsRaw);

        // 🛑 2. EL FILTRO MÁGICO MEJORADO
        const productosParaWeb = productosConStockReal.filter(producto => {
            const categoriaDelProducto = (producto.category || '').toLowerCase();
            return !categoriaDelProducto.includes('sistema');
        });

        setProductos(productosParaWeb);
        extraerCategorias(productosParaWeb);
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

  const obtenerDesgloseBase = (idItem, cantidadMultiplicador, catalogoGlobal, resultado = {}) => {
      const item = catalogoGlobal.find(p => p.id === idItem);
      if (!item) return resultado;

      const tipoStr = String(item.tipo_item || 'PIEZA_BASE').toUpperCase().trim();
      const tieneReceta = item.receta && Object.keys(item.receta).length > 0;
      const esKitFlexible = tipoStr.includes('FLEXIBLE') || tieneReceta;

      if (!esKitFlexible) {
          const cod = item.codigo_sistema || item.codigo_sistema_oficial || 'SIN-CODIGO';
          if (!resultado[cod]) {
              resultado[cod] = { nombre: item.name || item.nombre_flexible, cantidad: 0 };
          }
          resultado[cod].cantidad += cantidadMultiplicador;
      } 
      else {
          const receta = item.receta || item.receta_desglose;
          if (receta && Object.keys(receta).length > 0) {
              for (const [compId, compQty] of Object.entries(receta)) {
                  obtenerDesgloseBase(compId, cantidadMultiplicador * compQty, catalogoGlobal, resultado);
              }
          } else {
              resultado['ERROR-RECETA'] = { nombre: `[BD: Falta Receta] ${item.name || item.nombre_flexible}`, cantidad: cantidadMultiplicador };
          }
      }
      return resultado;
  };

  const sendWhatsApp = (clientData) => { /* Tu código actual intacto... */ };
  const sendEmail = (clientData) => { /* Tu código actual intacto... */ };

  return (
    <AppContext.Provider value={{ 
      productos, categorias, cargando, categoriaActiva, setCategoriaActiva,
      searchTerm, setSearchTerm,
      filtroRapido, setFiltroRapido, // ✨ LO PASAMOS AL PROVIDER AQUI
      carrito, isCartOpen, toggleCart, clearCart, agregarAlCarrito, eliminarProducto, totalPiezas,
      deliveryMethod, setDeliveryMethod, paymentMethod, setPaymentMethod, sendWhatsApp, sendEmail, 
      registrarEvento, esAdmin, setEsAdmin
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
