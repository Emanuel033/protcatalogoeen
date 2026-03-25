// firebase-config.js
// Este archivo se puede importar en TODAS tus páginas HTML
// Solo necesitas agregar: <script src="assets/js/firebase-config.js"></script>

const firebaseConfig = {
    apiKey: "AIzaSyDkQ2HcaLHY7dPvg_IRmuiZNGtcfUhu05o",
    authDomain: "productoseen.firebaseapp.com",
    databaseURL: "https://productoseen-default-rtdb.firebaseio.com",
    projectId: "productoseen",
    storageBucket: "productoseen.firebasestorage.app",
    messagingSenderId: "1052892398028",
    appId: "1:1052892398028:web:055e67f2aa4bce0d9c9d69"
};

// Inicializar Firebase solo si no se ha inicializado antes
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Exportar las referencias globales (Base de datos y Autenticación)
const db = firebase.firestore();
//const rtdb = firebase.database();
const auth = firebase.auth(); // <-- Agregado para gestionar sesiones en cualquier página

// Colecciones principales del sistema EEN
const productsRef = db.collection('productos_master');
const facturacionRef = db.collection('catalogo_facturacion');
const bitacoraRef = db.collection('bitacora_inventario'); 
const cashiersRef = db.collection('usuarios_pos');
const usuariosPermisosRef = db.collection('usuarios_permisos'); // <-- Agregado para el sistema de roles (admin/almacen)
