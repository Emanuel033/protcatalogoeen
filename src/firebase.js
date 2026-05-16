import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDkQ2HcaLHY7dPvg_IRmuiZNGtcfUhu05o",
  authDomain: "productoseen.firebaseapp.com",
  projectId: "productoseen",
};

// 1. BLINDAJE: Verificamos si Firebase ya se inicializó antes. Si no, lo creamos.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. BLINDAJE: Intentamos prender Firestore con la caché activada
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  });
} catch (error) {
  // Si da el error de "ya fue inicializado" por recargar la página, simplemente usamos el que ya existe
  db = getFirestore(app);
}
const auth = getAuth(app); // <-- 2. Inicializa auth

export { db, auth }; // <-- 3. Exporta auth junto con db