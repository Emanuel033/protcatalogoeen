import { useState, useEffect } from 'react';
// Ajusta esta ruta a donde tengas tu instancia de Firebase modular (v9+)
import { auth, db } from '../../../firebase'; 
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export const useAdminData = () => {
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [allItems, setAllItems] = useState([]);
  const [baseItems, setBaseItems] = useState([]);
  const [facturacionCatalog, setFacturacionCatalog] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // --- 1. GESTIÓN DE AUTENTICACIÓN Y ROLES ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'usuarios_permisos', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (!docSnap.exists()) {
            await signOut(auth);
            setAuthError("Usuario no registrado en el sistema de permisos.");
            setIsLoadingAuth(false);
            return;
          }

          const userData = docSnap.data();
          if (userData.activo === false) {
            await signOut(auth);
            setAuthError("Tu cuenta ha sido desactivada por un administrador.");
            setIsLoadingAuth(false);
            return;
          }

          setUserName(userData.nombre || user.email);
          setUserRole(userData.rol); // 'admin' o 'almacen'
          setAuthError(null);
        } catch (e) {
          console.error("🚨 ERROR REAL DETECTADO:", e);
          setAuthError("Error real: " + (e.message || "Ver consola para detalles."));
          await signOut(auth);
        }
      } else {
        setUserRole(null);
        setUserName('');
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // --- 2. SUSCRIPCIONES EN TIEMPO REAL (SOLO SI EL USUARIO TIENE ACCESO) ---
  useEffect(() => {
    // Si no hay rol (no está logueado), no escuchamos a Firebase
    if (!userRole) return;

    setIsDataLoading(true);
    
    // Suscripción al catálogo web
    const unsubscribeProducts = onSnapshot(collection(db, 'productos_master'), (snapshot) => {
      const items = [];
      const bases = [];
      
      snapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() };
        items.push(item);
        if (!item.tipo_item || item.tipo_item === 'PIEZA_BASE') {
          bases.push(item);
        }
      });
      
      setAllItems(items);
      setBaseItems(bases);
    }, (error) => {
      console.error("Error al cargar productos:", error);
    });

    // Suscripción al catálogo de facturación
    const unsubscribeFacturacion = onSnapshot(collection(db, 'catalogo_facturacion'), (snapshot) => {
      const factCatalog = [];
      snapshot.forEach(doc => {
        factCatalog.push({ id: doc.id, ...doc.data() });
      });
      
      // Ordenamos alfabéticamente para cuando lo uses en selectores/datalist
      const sortedFact = factCatalog.sort((a, b) => {
        const nameA = String(a.descripcion_oficial || a.nombre || a.codigo || '').toLowerCase();
        const nameB = String(b.descripcion_oficial || b.nombre || b.codigo || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setFacturacionCatalog(sortedFact);
      setIsDataLoading(false);
    }, (error) => {
      console.error("Error al cargar facturación:", error);
      setIsDataLoading(false);
    });

    // Cleanup: Al desmontar el hook, nos desuscribimos para no dejar fugas de memoria
    return () => {
      unsubscribeProducts();
      unsubscribeFacturacion();
    };
  }, [userRole]);

  return {
    // Auth
    userRole,
    userName,
    isLoadingAuth,
    authError,
    // Data
    allItems,
    baseItems,
    facturacionCatalog,
    isDataLoading
  };
};