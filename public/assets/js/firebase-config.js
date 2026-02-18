// ==========================================
// CONFIGURACIÓN CENTRAL DE FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDkQ2HcaLHY7dPvg_IRmuiZNGtcfUhu05o",
    authDomain: "productoseen.firebaseapp.com",
    databaseURL: "https://productoseen-default-rtdb.firebaseio.com",
    projectId: "productoseen",
    storageBucket: "productoseen.firebasestorage.app",
    messagingSenderId: "1052892398028",
    appId: "1:1052892398028:web:055e67f2aa4bce0d9c9d69"
};

// Inicializar Firebase (Singleton)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Exponer servicios globalmente para usar en otros scripts
const db = firebase.database();
const auth = firebase.auth();

// Inicializar Analytics solo si está soportado en el entorno actual
let analytics;
if (typeof firebase.analytics === 'function') {
    analytics = firebase.analytics();
}
