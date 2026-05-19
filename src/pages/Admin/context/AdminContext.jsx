import { createContext, useContext, useState } from 'react';
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
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

  const saveProduct = async (dataToUpdate) => {
  try {
    if (editingProduct?.id) {
      // 1. EDICIÓN (updateDoc es correcto porque el documento ya existe)
      const prodRef = doc(db, 'productos_master', editingProduct.id);
      await updateDoc(prodRef, {
        ...dataToUpdate,
        ultima_actualizacion: new Date()
      });
      console.log("Producto actualizado:", editingProduct.id);
    } else {
      // 2. NUEVO (Debe ser addDoc para que Firebase genere el ID automático)
      const prodRef = collection(db, 'productos_master');
      await addDoc(prodRef, {
        ...dataToUpdate,
        fecha_creacion: new Date()
      });
      console.log("Producto creado exitosamente");
    }
    
    // Cerramos el modal y limpiamos
    setIsConfigModalOpen(false);
    setEditingProduct(null);
  } catch (error) {
    console.error("Error al guardar en Firebase:", error);
    alert("Error crítico al guardar: " + error.message);
  }
};

  const deleteProduct = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto permanentemente?\nEsta acción no se puede deshacer y borrará también sus cajas configuradas.')) return;
    
    try {
      const batch = writeBatch(db);
      const productRef = doc(db, 'productos_master', id);
      
      const paquetesRef = collection(db, 'productos_master', id, 'paquetes');
      const paquetesSnapshot = await getDocs(paquetesRef);
      
      paquetesSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      batch.delete(productRef);
      await batch.commit();
      clearSelection();
      console.log('Producto eliminado correctamente');
    } catch (error) {
      console.error("Error al eliminar", error);
      alert('Error de conexión al eliminar');
    }
  };

  const cloneProduct = (productToClone) => {
    alert(`Preparando clonación de: ${productToClone.nombre_flexible}. Se abrirá en el modal próximamente.`);
  };

  const applyMassEdit = async (ids, updates) => {
    if (!ids || ids.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      
      // Añadimos cada producto al lote de actualización
      ids.forEach((id) => {
        const productRef = doc(db, 'productos_master', id);
        batch.update(productRef, updates);
      });
      
      // Ejecutamos el lote en Firebase
      await batch.commit();
      
      // Limpiamos la selección de checkboxes
      clearSelection();
      console.log(`Actualizados ${ids.length} productos con éxito.`);
    } catch (error) {
      console.error("Error en la edición masiva de Firebase:", error);
      alert("Hubo un error de conexión al aplicar los cambios en lote.");
      throw error; // Re-lanzamos para que el modal sepa si falló
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