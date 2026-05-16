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
      cloneProduct
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