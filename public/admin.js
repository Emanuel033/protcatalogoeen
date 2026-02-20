// ==========================================
// CONFIGURACIÓN DE FIREBASE
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
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ==========================================
// VARIABLES GLOBALES Y LÍMITES (Mejora Rendimiento UI)
// ==========================================
let currentUser = null;
let allProducts = []; 
let currentFilteredProducts = [];
let html5QrCode = null; 

// Límites de paginación para no saturar celulares de gama baja
let catLimit = 50;
let invLimit = 50;

// ==========================================
// AUTENTICACIÓN Y REALTIME DATABASE
// ==========================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user; 
        try {
            const snap = await db.ref('usuarios_permisos/' + user.uid).once('value');
            if (snap.exists() && snap.val().redireccion === "admin.html") {
                document.getElementById('user-info').innerText = user.email.split('@')[0];
                document.getElementById('loader').classList.add('opacity-0', 'pointer-events-none');
                document.getElementById('main-content').classList.remove('hidden');
                document.getElementById('main-content').classList.add('flex');
                setupRealtimeListener(); 
            } else throw new Error("Permisos insuficientes.");
        } catch (error) { alert(error.message); window.location.href = "login.html"; }
    } else window.location.href = "login.html";
});

window.logout = async () => { await auth.signOut(); window.location.href = "login.html"; }

function setupRealtimeListener() {
    db.ref('productos').orderByChild('createdAt').on('value', (snapshot) => {
        allProducts = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => { allProducts.push({id: child.key, ...child.val()}); });
            allProducts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        filterProducts();
        renderInventoryTable();
    });
}

// ==========================================
// NAVEGACIÓN TABS
// ==========================================
window.switchTab = (tabName) => {
    const vCat = document.getElementById('view-catalogo'), vInv = document.getElementById('view-inventario');
    const tCat = document.getElementById('tab-catalogo'), tInv = document.getElementById('tab-inventario');

    if (tabName === 'catalogo') {
        vCat.classList.remove('hidden'); vCat.classList.add('flex'); 
        vInv.classList.add('hidden'); vInv.classList.remove('flex');
        tCat.className = "flex-1 py-3 px-2 flex flex-col items-center gap-1 font-bold border-b-2 border-indigo-600 text-indigo-700 transition-colors";
        tInv.className = "flex-1 py-3 px-2 flex flex-col items-center gap-1 font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-colors";
        closeScannerModal();
    } else {
        vInv.classList.remove('hidden'); vInv.classList.add('flex'); 
        vCat.classList.add('hidden'); vCat.classList.remove('flex');
        tInv.className = "flex-1 py-3 px-2 flex flex-col items-center gap-1 font-bold border-b-2 border-indigo-600 text-indigo-700 transition-colors";
        tCat.className = "flex-1 py-3 px-2 flex flex-col items-center gap-1 font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-colors";
        renderInventoryTable();
    }
}

// ==========================================
// VISTA CATÁLOGO (Con Debounce y Paginación)
// ==========================================
let debounceCatTimer;
window.filterProducts = () => {
    clearTimeout(debounceCatTimer);
    debounceCatTimer = setTimeout(() => {
        const term = document.getElementById('searchInput').value.toLowerCase();
        currentFilteredProducts = allProducts.filter(p => (p.name || '').toLowerCase().includes(term) || (p.category || '').toLowerCase().includes(term));
        catLimit = 50; // Reiniciar límite al buscar
        renderTable(currentFilteredProducts);
    }, 250); // Espera 250ms antes de ejecutar
};

window.filterIncomplete = () => {
    currentFilteredProducts = allProducts.filter(p => !p.piezas || p.piezas <= 0);
    catLimit = 50;
    renderTable(currentFilteredProducts);
    showToast("Mostrando productos sin piezas", "success");
};

function renderTable(products) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = "";
    
    // Cortamos la lista usando paginación
    const toRender = products.slice(0, catLimit);
    
    toRender.forEach(p => {
        const isActive = p.activo !== false; 
        const fallbackImg = "https://via.placeholder.com/100?text=IMG";
        const tr = document.createElement('tr');
        tr.className = `group hover:bg-indigo-50/50 transition-colors ${!isActive ? 'opacity-50 grayscale' : ''}`;
        tr.innerHTML = `
            <td class="p-2 text-center align-middle"><div class="w-10 h-10 mx-auto bg-gray-100 rounded-lg shadow-sm overflow-hidden"><img src="${p.image}" class="w-full h-full object-cover" onerror="this.src='${fallbackImg}'"></div></td>
            <td class="p-2 align-middle">
                <input onchange="updateProduct('${p.id}','name',this.value, this)" value="${p.name || ''}" class="block w-full font-bold text-gray-800 bg-transparent border-none text-xs focus:ring-0 outline-none">
                <input onchange="updateProduct('${p.id}','category',this.value, this)" value="${p.category || ''}" class="block w-full text-[10px] text-indigo-500 font-medium bg-transparent border-none focus:ring-0 outline-none mt-0.5">
            </td>
            <td class="p-2 align-middle text-center"><input type="number" onchange="updateProduct('${p.id}','piezas',this.value, this)" value="${p.piezas || ''}" class="w-16 mx-auto bg-gray-50 border border-gray-200 rounded text-center text-xs py-1 outline-none focus:border-indigo-500"></td>
            <td class="p-2 text-center align-middle">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" class="sr-only peer" onchange="updateProduct('${p.id}', 'activo', this.checked)" ${isActive ? 'checked' : ''}>
                  <div class="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
                </label>
            </td>
            <td class="p-2 text-center align-middle">
                <div class="flex items-center justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="printSingleQR('${p.id}', 'inventario')" class="text-purple-600 hover:bg-purple-100 w-7 h-7 rounded flex items-center justify-center transition" title="QR Caja (Inventario)"><i class="fa-solid fa-box"></i></button>
                    <button onclick="printSingleQR('${p.id}', 'vitrina')" class="text-pink-600 hover:bg-pink-100 w-7 h-7 rounded flex items-center justify-center transition" title="QR URL (Vitrina)"><i class="fa-solid fa-store"></i></button>
                    <button onclick="cloneProduct('${p.id}')" class="text-blue-500 hover:bg-blue-100 w-7 h-7 rounded flex items-center justify-center transition" title="Clonar"><i class="fa-solid fa-copy"></i></button>
                    <button onclick="makeProductOld('${p.id}')" class="text-orange-400 hover:bg-orange-100 w-7 h-7 rounded flex items-center justify-center transition" title="Hacer Antiguo"><i class="fa-solid fa-clock-rotate-left"></i></button>
                    <button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:bg-red-100 w-7 h-7 rounded flex items-center justify-center transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Botón Cargar Más
    if (products.length > catLimit) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" class="p-4 text-center"><button onclick="loadMoreCat()" class="bg-indigo-50 text-indigo-700 px-6 py-2 rounded-lg font-bold text-xs shadow-sm border border-indigo-100 hover:bg-indigo-100 transition"><i class="fa-solid fa-caret-down mr-1"></i> Cargar más resultados (${products.length - catLimit} pendientes)</button></td>`;
        tbody.appendChild(tr);
    }
}

window.loadMoreCat = () => { catLimit += 50; renderTable(currentFilteredProducts); };

// ==========================================
// VISTA INVENTARIO MÓVIL (Con Debounce y Paginación)
// ==========================================
let debounceInvTimer;
window.renderInventoryTable = () => {
    clearTimeout(debounceInvTimer);
    debounceInvTimer = setTimeout(() => {
        const term = document.getElementById('searchInvInput').value.toLowerCase();
        const filtered = allProducts.filter(p => (p.name || '').toLowerCase().includes(term));
        invLimit = 50; // Reiniciar límite
        renderInventoryCards(filtered);
    }, 250);
};

function renderInventoryCards(filteredProducts) {
    const container = document.getElementById('inventoryCardsContainer');
    container.innerHTML = "";
    
    const toRender = filteredProducts.slice(0, invLimit);

    toRender.forEach(p => {
        const stock = p.stock || 0;
        const fallbackImg = "https://via.placeholder.com/100?text=IMG";
        const card = document.createElement('div');
        card.className = `bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-3 flex items-center gap-3 transition-colors ${stock > 0 ? 'border-l-4 border-l-indigo-500' : ''}`;
        card.innerHTML = `
            <div class="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0 shadow-sm border border-gray-200"><img src="${p.image}" class="w-full h-full object-cover" onerror="this.src='${fallbackImg}'"></div>
            <div class="flex-grow min-w-0">
                <h3 class="font-bold text-gray-800 text-xs truncate">${p.name}</h3>
                <p class="text-[10px] text-gray-400 truncate">${p.category||'Sin categoría'} • Pzas/Paq: <span class="font-bold text-gray-500">${p.piezas||0}</span></p>
            </div>
            <div class="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 shrink-0">
                <button onclick="adjustStock('${p.id}', -1)" class="w-8 h-8 rounded-lg bg-white text-gray-600 hover:text-red-500 shadow-sm font-bold flex justify-center items-center text-lg active:scale-90 transition-transform"><i class="fa-solid fa-minus text-[10px]"></i></button>
                <input type="number" onchange="updateProduct('${p.id}','stock',this.value, this)" value="${stock}" class="w-10 text-center bg-transparent font-black text-indigo-700 outline-none text-sm">
                <button onclick="adjustStock('${p.id}', 1)" class="w-8 h-8 rounded-lg bg-white text-gray-600 hover:text-green-500 shadow-sm font-bold flex justify-center items-center text-lg active:scale-90 transition-transform"><i class="fa-solid fa-plus text-[10px]"></i></button>
            </div>
        `;
        container.appendChild(card);
    });

    if (filteredProducts.length > invLimit) {
        const btn = document.createElement('div');
        btn.innerHTML = `<button onclick="loadMoreInv()" class="w-full bg-indigo-50 text-indigo-700 p-3 rounded-xl font-bold text-xs mt-2 border border-indigo-100 hover:bg-indigo-100 transition"><i class="fa-solid fa-caret-down mr-1"></i> Cargar más resultados (${filteredProducts.length - invLimit} pendientes)</button>`;
        container.appendChild(btn);
    } else if (filteredProducts.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 mt-10"><i class="fa-solid fa-box-open text-4xl mb-2 opacity-50"></i><p>Sin resultados.</p></div>`;
    }
}

window.loadMoreInv = () => { invLimit += 50; window.renderInventoryTable(); };

// ==========================================
// FUNCIONES DE ACTUALIZACIÓN (Reversión Segura ante fallos)
// ==========================================
window.updateProduct = async (id, field, val, el) => { 
    if(!currentUser) return; 
    
    // Backup del valor original por si el internet falla
    const prod = allProducts.find(p => p.id === id);
    const originalVal = prod ? prod[field] : '';

    if (field === 'piezas' || field === 'stock') val = Number(val); 
    
    if(el) el.classList.add('bg-indigo-50'); 
    
    try { 
        await db.ref('productos/'+id).update({[field]: val}); 
        if(el) { 
            el.classList.replace('bg-indigo-50', 'bg-green-50'); 
            setTimeout(() => el.classList.remove('bg-green-50'), 500); 
        } 
    } catch(e) { 
        showToast("Error de red: Valor no guardado", "error"); 
        if(el) {
            el.classList.remove('bg-indigo-50');
            el.classList.add('bg-red-50', 'text-red-500');
            el.value = originalVal; // Revertir visualmente al valor que sí está en la BD
            setTimeout(() => el.classList.remove('bg-red-50', 'text-red-500'), 1500);
        }
    } 
};

window.adjustStock = async (id, amount) => {
    const prod = allProducts.find(p => p.id === id); if (!prod) return;
    const newStock = Math.max(0, (prod.stock || 0) + amount);
    await db.ref('productos/'+id).update({stock: newStock});
};

window.resetAllStock = async () => {
    if(!confirm("⚠️ ADVERTENCIA ⚠️\n¿Poner TODO a CERO?")) return;
    const updates = {}; allProducts.forEach(prod => updates['/productos/' + prod.id + '/stock'] = 0);
    await db.ref().update(updates); showToast("Inventario reiniciado", "success");
};

// ==========================================
// FORMULARIO DE ALTA (Validaciones Estrictas)
// ==========================================
window.checkEnter = (e) => { if (e.key === 'Enter') window.uploadProduct(); };

window.uploadProduct = async () => { 
    if (!currentUser) return;
    const name = document.getElementById('prodName').value;
    const cat = document.getElementById('prodCat').value;
    const url = document.getElementById('prodFile').value;
    const pcs = document.getElementById('prodPcs').value;
    const isOld = document.getElementById('prodOldDate').checked;
    const btn = document.getElementById('btnUpload');

    // Validaciones Estrictas añadidas
    if(!name) return showToast("Falta nombre", "error");
    if(pcs && Number(pcs) < 0) return showToast("Las piezas no pueden ser negativas", "error");
    if(url && url.trim() !== "" && !url.startsWith('http')) return showToast("La URL de la imagen debe iniciar con http", "error");

    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`; 
    btn.disabled = true;

    try { 
        await db.ref('productos').push({ 
            name, 
            category: cat, 
            image: url, 
            piezas: pcs ? Number(pcs) : 0, 
            stock: 0, 
            activo: true, 
            createdAt: isOld ? new Date('2024-01-01').getTime() : firebase.database.ServerValue.TIMESTAMP 
        }); 
        showToast("Guardado", "success"); 
        ['prodName','prodCat','prodFile','prodPcs'].forEach(id => document.getElementById(id).value = ""); 
        document.getElementById('imgPreviewBox').classList.add('hidden'); 
        document.getElementById('prodOldDate').checked = false; 
        document.getElementById('prodName').focus(); 
    } 
    catch(e) { showToast(e.message, "error"); } 
    finally { btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i>`; btn.disabled = false; }
};

window.makeProductOld = async (id) => { if(confirm("¿Hacer Antiguo?")) { await db.ref('productos/'+id).update({createdAt: new Date('2024-01-01').getTime()}); showToast("Listo", "success"); } };
window.cloneProduct = (id) => { const p = allProducts.find(x => x.id === id); if(!p) return; ['Name','Cat','Pcs','File'].forEach(k => document.getElementById(`prod${k}`).value = p[k.toLowerCase()] || p[k==='Pcs'?'piezas':'image']); document.getElementById('addFormDetails').open = true; document.getElementById('prodName').focus(); };
window.deleteProduct = async (id) => { if(confirm("¿Borrar?")) await db.ref('productos/'+id).remove(); };
window.applyMassUpdate = async () => { const q = document.getElementById('massQtyInput').value; if(!q || Number(q)<0) return showToast("Cantidad inválida", "error"); if(confirm(`¿Actualizar items?`)) { const u = {}; currentFilteredProducts.forEach(p => u[`/productos/${p.id}/piezas`] = Number(q)); await db.ref().update(u); showToast("Actualizado", "success"); } };

// ==========================================
// LÓGICA DE IMPRESIÓN INTELIGENTE Y EXCEL
// ==========================================
function buildPrintHTML(productsToPrint, qtyPerProduct, printType, baseUrl) {
    let html = `<html><head><title>Etiquetas</title><style>
        body { font-family: sans-serif; text-align: center; margin: 0; padding: 10px; }
        .label { display: inline-block; width: 140px; border: 1px dashed #ccc; margin: 5px; padding: 10px; page-break-inside: avoid; }
        img { max-width: 100%; height: auto; }
        .title { font-size: 10px; font-weight: bold; margin-bottom: 5px; height: 30px; overflow: hidden; }
        .qty-badge { font-size: 14px; font-weight: 900; background: ${printType === 'vitrina' ? '#ec4899' : '#000'}; color: #fff; padding: 4px; border-radius: 4px; margin-top: 5px; display: inline-block;}
    </style></head><body>`;
    
    productsToPrint.forEach(p => {
        let pzasToPrint = 1;
        let qrValue = "";

        if (printType === 'inventario') {
            pzasToPrint = p.piezas || 1;
            qrValue = `ID:${p.id}|P:${pzasToPrint}`; 
        } else {
            const nameAndCat = ((p.name || '') + ' ' + (p.category || '')).toLowerCase();
            const isBolsa = nameAndCat.includes('bolsa');
            pzasToPrint = isBolsa ? (p.piezas || 100) : 1;
            qrValue = `${baseUrl}/?add=${p.id}`; 
        }

        const qr = new QRious({ value: qrValue, size: 300, level: 'M' });
        for(let i=0; i<qtyPerProduct; i++) {
            html += `<div class="label"><div class="title">${p.name}</div><img src="${qr.toDataURL()}"><div class="qty-badge">${pzasToPrint} PZAS</div></div>`;
        }
    });
    html += `</body><script>setTimeout(() => { window.print(); window.close(); }, 500);<\/script></html>`;
    return html;
}

function getBaseUrl() {
    let baseUrl = localStorage.getItem('een_catalog_url');
    if (!baseUrl) {
        baseUrl = prompt("Para generar códigos URL, ingresa la dirección de tu catálogo:\n(Ej: https://productoseen.web.app)", window.location.origin);
        if (baseUrl) {
            if(!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
            if(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            localStorage.setItem('een_catalog_url', baseUrl);
        }
    }
    return baseUrl;
}

window.printFilteredQRs = (printType) => {
    if (currentFilteredProducts.length === 0) return showToast("Filtra productos primero", "error");
    let baseUrl = "";
    if (printType === 'vitrina') { baseUrl = getBaseUrl(); if (!baseUrl) return showToast("Se requiere URL", "error"); }
    const qty = prompt(`¿Cuántas etiquetas POR CADA PRODUCTO?`, "1");
    if (!qty || qty <= 0) return;
    const pw = window.open('', '_blank'); pw.document.write(buildPrintHTML(currentFilteredProducts, qty, printType, baseUrl)); pw.document.close();
};

window.printSingleQR = (id, printType) => {
    const p = allProducts.find(x => x.id === id); if (!p) return;
    let baseUrl = "";
    if (printType === 'vitrina') { baseUrl = getBaseUrl(); if (!baseUrl) return showToast("Se requiere URL", "error"); }
    const qty = prompt(`Etiquetas para:\n${p.name}\n\n¿Cuántas?`, "1");
    if (!qty || qty <= 0) return;
    const pw = window.open('', '_blank'); pw.document.write(buildPrintHTML([p], qty, printType, baseUrl)); pw.document.close();
};

window.exportToExcel = (tipo) => {
    let csv = "\uFEFF";
    if (tipo === 'inventario') {
        csv += "Nombre,Categoria,Stock_Contado\n";
        allProducts.forEach(p => csv += `"${(p.name||"").replace(/"/g,'""')}","${(p.category||"").replace(/"/g,'""')}",${p.stock||0}\n`);
    } else {
        csv += "Nombre,Categoria,PiezasxPaq,Activo\n";
        allProducts.forEach(p => csv += `"${(p.name||"").replace(/"/g,'""')}","${(p.category||"").replace(/"/g,'""')}",${p.piezas||0},${p.activo!==false?"SI":"NO"}\n`);
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); a.download = `${tipo}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
};

// ====================================================
// LECTOR QR (Exacto a Versión 5.5, Lógica Intacta)
// ====================================================
window.openScannerModal = () => {
    document.getElementById('scannerModal').classList.remove('hidden'); document.getElementById('scannerModal').classList.add('flex');
    if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess).catch((err) => { showToast("Error al iniciar cámara", "error"); });
};

window.closeScannerModal = () => {
    document.getElementById('scannerModal').classList.add('hidden'); document.getElementById('scannerModal').classList.remove('flex');
    if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(err => console.log(err));
};

let lastScanTime = 0;
async function onScanSuccess(decodedText) {
    const now = Date.now();
    if (now - lastScanTime < 1500) return; 
    
    try {
        let scannedId = null;
        let scannedPzas = null;

        if (decodedText.startsWith('ID:')) {
            const parts = decodedText.split('|');
            scannedId = parts[0].split(':')[1];
            scannedPzas = parseInt(parts[1].split(':')[1]);
        } else if (decodedText.includes('add=')) {
            scannedId = decodedText.split('add=')[1].split('&')[0];
        }

        if (!scannedId) return; 

        const prod = allProducts.find(p => p.id === scannedId);
        if (!prod) { showToast("El producto no existe", "error"); return; }

        if (scannedPzas === null || isNaN(scannedPzas)) scannedPzas = prod.piezas || 1; 

        lastScanTime = now;
        
        // Efecto físico/sonido intacto
        try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.connect(ctx.destination); osc.frequency.value = 1200; osc.start(); setTimeout(() => osc.stop(), 80); } catch(e){}
        try { if ("vibrate" in navigator) navigator.vibrate([100]); } catch(e){}

        const nuevoStock = (prod.stock || 0) + scannedPzas;
        await db.ref('productos/'+scannedId).update({stock: nuevoStock});

        const overlay = document.getElementById('scanOverlay');
        document.getElementById('overlayQty').innerText = `+${scannedPzas}`;
        overlay.classList.remove('opacity-0'); overlay.classList.add('success-flash');
        document.getElementById('scanProdName').innerText = prod.name;
        document.getElementById('scanTotal').innerText = nuevoStock;

        setTimeout(() => { overlay.classList.add('opacity-0'); overlay.classList.remove('success-flash'); }, 600);
    } catch (err) { console.error(err); }
}

// === UTILIDADES ===
window.previewImage = (url) => { const b = document.getElementById('imgPreviewBox'), i = document.getElementById('imgPreview'); if(url && url.length > 10) { b.classList.remove('hidden'); i.src = url; i.onerror = () => b.classList.add('hidden'); } else b.classList.add('hidden'); }
function showToast(msg, type="success") { 
    const t = document.getElementById('toast'), i = document.getElementById('toast-icon'), bg = document.getElementById('toast-icon-bg'); 
    document.getElementById('toast-msg').innerText = msg; 
    i.className = type === 'error' ? "fa-solid fa-xmark text-red-500 text-xs" : "fa-solid fa-check text-green-400 text-xs"; 
    bg.className = type === 'error' ? "w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0" : "w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0";
    t.classList.replace(type==='error'?'border-indigo-500':'border-red-500', type==='error'?'border-red-500':'border-indigo-500'); 
    t.classList.remove('translate-y-32'); setTimeout(() => t.classList.add('translate-y-32'), 2500); 
}
