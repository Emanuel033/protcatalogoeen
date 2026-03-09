import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Usamos la configuración de tu proyecto "productoseen"
const firebaseConfig = {
  apiKey: "AIzaSyDkQ2HcaLHY7dPvg_IRmuiZNGtcfUhu05o",
  authDomain: "productoseen.firebaseapp.com",
  projectId: "productoseen",
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos la base de datos (Firestore) para usarla en el resto de la app
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});
