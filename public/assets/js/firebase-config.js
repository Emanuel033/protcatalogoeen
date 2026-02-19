// ==========================================
// CONFIGURACIÓN DE FIREBASE (CONEXIÓN BD)
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

let db, auth, analytics;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    auth = firebase.auth();
    if (typeof firebase.analytics === 'function') {
        analytics = firebase.analytics();
    }
} catch (error) {
    console.error("Error inicializando Firebase:", error);
}
