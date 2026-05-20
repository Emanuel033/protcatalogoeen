import { createContext, useContext, useState } from 'react';
import { doc,addDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase.js';
// Creamos el contexto
const AdminContext = createContext();

// Proveedor del contexto que envolverá a toda tu sección Admin
export const AdminProvider = ({ children }) => {
  // --- 1. NAVEGACIÓN Y VISTAS ---
  const [activeTab, setActiveTab] = useState('master'); // 'master' o 'import'
  const [masterView, setMasterView] = useState('desglose'); // 'desglose' o 'agrupado'

  // --- 2. BÚSQUEDA Y FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'PIEZA_BASE', 'KIT_FLEXIBLE', 'KIT_OFICIAL'
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  // --- 3. ORDENAMIENTO (Mapeo exacto de tus variables sortConfig) ---
  const [sortDesglose, setSortDesglose] = useState({ key: 'fecha_creacion', desc: true });
  const [sortAgrupado, setSortAgrupado] = useState({ key: 'codigo', desc: false });
  const [sortImport, setSortImport] = useState({ key: 'codigo', desc: false });

  // --- 4. SELECCIÓN MASIVA (Reemplaza a document.querySelectorAll('.row-cb:checked')) ---
  const [selectedItems, setSelectedItems] = useState([]);

  const [lightboxImg, setLightboxImg] = useState(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Funciones de ayuda para la selección masiva
  const toggleSelection = (id) => {
    setSelectedItems((prev) => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedItems([]);
  
  const selectAll = (idsArray) => setSelectedItems(idsArray);

  // Funciones para manejar el ordenamiento (Sort) de forma genérica
  const handleSortChange = (view, columnKey) => {
    if (view === 'desglose') {
      setSortDesglose(prev => ({
        key: columnKey,
        desc: prev.key === columnKey ? !prev.desc : false
      }));
    } else if (view === 'agrupado') {
      setSortAgrupado(prev => ({
        key: columnKey,
        desc: prev.key === columnKey ? !prev.desc : false
      }));
    } else if (view === 'import') {
      setSortImport(prev => ({
        key: columnKey,
        desc: prev.key === columnKey ? !prev.desc : false
      }));
    }
  };

  // Reseteamos las selecciones cuando el usuario cambia de pestaña
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    clearSelection();
  };

  const toggleProductStatus = async (id, currentState) => {
    try {
      const productRef = doc(db, 'productos_master', id);
      await updateDoc(productRef, { activo: !currentState });
      console.log(!currentState ? 'El producto ahora es VISIBLE' : 'El producto ha sido OCULTADO');
    } catch (error) {
      console.error("Error al cambiar visibilidad", error);
      alert('Error al cambiar visibilidad');
    }
  };

  // GUARDAR / ACTUALIZAR PRODUCTO (VERSIÓN FINAL INTEGRADA)
  const saveProduct = async (formData) => {
    try {
      // Si el editingProduct no tiene ID, es uno nuevo (o un clon)
      const isNew = !editingProduct?.id;
      
      const productData = {
        nombre_flexible: formData.nombre_flexible || '',
        imagen_url: formData.imagen_url || '',
        categoria: formData.categoria ? formData.categoria.toUpperCase() : '',
        codigo_sistema_oficial: formData.codigo_sistema_oficial || '',
        tipo_item: formData.tipo_item || 'PIEZA_BASE',
        activo: formData.activo !== false,
        ultima_actualizacion: new Date(),
      };

      // 📦 INYECCIÓN DE LÓGICA COMPLETA: Recetas y Herencias
      // Si el modal nos manda una receta (porque es KIT_FLEXIBLE), la guardamos
      if (formData.receta_desglose !== undefined) {
        productData.receta_desglose = formData.receta_desglose;
      }

      // Si el modal nos manda un ID de herencia, lo guardamos
      if (formData.hereda_empaques_de !== undefined) {
        productData.hereda_empaques_de = formData.hereda_empaques_de;
      }

      // 🔗 RETENCIÓN DE FACTURACIÓN
      // Si el producto viene de una importación, rescatamos su enlace
      if (editingProduct?.id_facturacion) {
        productData.id_facturacion = editingProduct.id_facturacion;
      }

      // EJECUCIÓN EN LA BASE DE DATOS
      if (isNew) {
        productData.fecha_creacion = new Date();
        productData.stock_total_piezas = 0;
        await addDoc(collection(db, 'productos_master'), productData);
        console.log('✅ Producto creado/clonado con éxito');
      } else {
        const docRef = doc(db, 'productos_master', editingProduct.id);
        await updateDoc(docRef, productData);
        console.log('✅ Producto actualizado con éxito');
      }

      // Cerramos modal y limpiamos estado
      setIsConfigModalOpen(false);
      setEditingProduct(null);
      
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert('Hubo un error de conexión al guardar la ficha.');
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto permanentemente?\\nEsta acción no se puede deshacer y borrará también sus cajas configuradas.')) return;
    
    try {
      const batch = writeBatch(db);
      
      // 1. Obtener y borrar todos los documentos de la subcolección 'paquetes'
      const paquetesRef = collection(db, 'productos_master', productId, 'paquetes');
      const paquetesSnap = await getDocs(paquetesRef);
      paquetesSnap.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 2. Borrar el producto padre
      const productRef = doc(db, 'productos_master', productId);
      batch.delete(productRef);

      // 3. Ejecutar todo de golpe
      await batch.commit();
      
      console.log('Producto eliminado correctamente');
      clearSelection(); // Limpiamos selección por si estaba checkeado
    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      alert('Error de conexión al eliminar');
    }
  };

  const cloneProduct = (productToClone) => {
    // Clonamos la data, quitamos el ID para que Firebase sepa que es nuevo
    const clonedData = {
      ...productToClone,
      id: null, 
      nombre_flexible: `${productToClone.nombre_flexible || 'Sin Nombre'} (Copia)`,
      codigo_sistema_oficial: productToClone.codigo_sistema_oficial ? `${productToClone.codigo_sistema_oficial}-COPIA` : '',
      activo: productToClone.activo !== false,
      // Nota: No pasamos la subcolección de paquetes porque es un producto nuevo.
    };

    setEditingProduct(clonedData);
    setIsConfigModalOpen(true);
  };

  const applyMassEdit = async (selectedIds, updates) => {
    try {
      const batch = writeBatch(db);
      
      // Agregamos la fecha de actualización a los cambios
      const finalUpdates = {
        ...updates,
        ultima_actualizacion: new Date()
      };

      selectedIds.forEach(id => {
        const ref = doc(db, 'productos_master', id);
        batch.update(ref, finalUpdates);
      });

      await batch.commit();
      console.log(`¡Se actualizaron ${selectedIds.length} productos!`);
      clearSelection(); // Limpiamos la barra al terminar
      
    } catch (error) {
      console.error("Error en edición masiva:", error);
      throw error; // Lanzamos el error para que el catch del BulkActionBar quite el "isSaving"
    }
  };

  return (
    <AdminContext.Provider
      value={{
        // Estados
        activeTab,
        masterView,
        searchTerm,
        filterType,
        showOnlyPending,
        sortDesglose,
        sortAgrupado,
        sortImport,
        selectedItems,

        // Mutadores de Estado directo
        setMasterView,
        setSearchTerm,
        setFilterType,
        setShowOnlyPending,

        // Funciones con lógica
        handleTabChange,
        toggleSelection,
        clearSelection,
        selectAll,
        handleSortChange,


        toggleProductStatus,
      deleteProduct,
      editingProduct,
      setEditingProduct,
      saveProduct,
      applyMassEdit,
      cloneProduct,

      lightboxImg,
      setLightboxImg,
      isConfigModalOpen,      // 👈 Agrega esta
        setIsConfigModalOpen
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

// Hook personalizado para usar este contexto en cualquier componente del Admin
export const useAdminContext = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdminContext debe usarse dentro de un AdminProvider");
  }
  return context;
};