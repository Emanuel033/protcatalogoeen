// ==========================================
// ADMIN CONTROL
// ==========================================
let allProducts = [], html5QrCode = null;
let catLimit = 50, invLimit = 50;

// Auth Check
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('admin-content').classList.remove('hidden');
        document.getElementById('loading-screen').classList.add('hidden');
        initApp();
    } else window.location.href = 'login.html';
});
function logout() { auth.signOut().then(() => window.location.href = 'login.html'); }

// Init
function initApp() {
    db.ref('productos').on('value', (snap) => {
        allProducts = [];
        if (snap.exists()) snap.forEach(c => allProducts.push({ id: c.key, ...c.val() }));
        allProducts.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        updateDashboard(); renderCatalog(); renderInventory();
    });
}

// Dashboard
function updateDashboard() {
    document.getElementById('total-products').innerText = allProducts.length;
    document.getElementById('total-categories').innerText = [...new Set(allProducts.map(p => p.category))].length;
    document.getElementById('active-products').innerText = allProducts.filter(p => p.activo !== false).length;
}

function showSection(id) {
    document.querySelectorAll('main > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if (id === 'scanner') startScanner(); else stopScanner();
}

// CRUD
function openModal(mode, id = null) {
    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('prodId').value = id || '';
    if (mode === 'edit' && id) {
        const p = allProducts.find(x => x.id === id);
        document.getElementById('name').value = p.name;
        document.getElementById('category').value = p.category;
        document.getElementById('image').value = p.image;
        document.getElementById('piezas').value = p.piezas;
        previewImage(p.image);
    } else {
        document.getElementById('product-form').reset();
        document.getElementById('imgPreviewBox').classList.add('hidden');
    }
}
function closeModal() { document.getElementById('product-modal').classList.add('hidden'); }

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('prodId').value;
    const data = {
        name: document.getElementById('name').value,
        category: document.getElementById('category').value,
        image: document.getElementById('image').value,
        piezas: document.getElementById('piezas').value || "1",
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    try {
        if (id) await db.ref('productos/' + id).update(data);
        else { data.createdAt = firebase.database.ServerValue.TIMESTAMP; data.activo = true; data.stock = 0; await db.ref('productos').push(data); }
        closeModal(); showToast("Guardado correctamente");
    } catch (err) { alert("Error: " + err.message); }
}

async function deleteProduct(id) { if(confirm("¿Eliminar?")) await db.ref('productos/' + id).remove(); }
async function toggleActive(id, val) { await db.ref(`productos/${id}/activo`).set(!val); }

// Render
function renderCatalog() {
    const term = document.getElementById('searchCatalog').value.toLowerCase();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term) || (p.category||'').toLowerCase().includes(term));
    document.getElementById('catalog-body').innerHTML = filtered.slice(0, catLimit).map(p => `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-3"><div class="flex items-center gap-3"><img src="${p.image}" class="w-10 h-10 object-contain bg-white border"><div><div class="font-bold text-sm">${p.name}</div><div class="text-[10px] text-slate-400">${p.category}</div></div></div></td>
            <td class="p-3 text-center"><button onclick="toggleActive('${p.id}', ${p.activo!==false})" class="px-2 py-1 rounded text-xs font-bold ${p.activo!==false?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">${p.activo!==false?'Activo':'Inactivo'}</button></td>
            <td class="p-3 text-right"><button onclick="openGenerateQR('${p.id}', '${p.name}')" class="mx-1 text-slate-400 hover:text-indigo-600"><i class="fa-solid fa-qrcode"></i></button><button onclick="openModal('edit','${p.id}')" class="mx-1 text-slate-400 hover:text-blue-600"><i class="fa-solid fa-pen"></i></button><button onclick="deleteProduct('${p.id}')" class="mx-1 text-slate-400 hover:text-red-600"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`).join('');
}
function renderInventory() {
    const term = document.getElementById('searchInventory').value.toLowerCase();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
    document.getElementById('inventory-grid').innerHTML = filtered.slice(0, invLimit).map(p => `
        <div class="bg-white p-3 rounded-xl border shadow-sm flex justify-between items-center"><div class="flex gap-3 overflow-hidden"><img src="${p.image}" class="w-10 h-10 object-contain border rounded"><div class="min-w-0"><div class="font-bold text-sm truncate">${p.name}</div><div class="text-xs text-slate-400">Stock: <span class="font-bold text-indigo-600">${p.stock||0}</span></div></div></div><div class="flex gap-1"><button onclick="updateStock('${p.id}',-1)" class="w-8 h-8 rounded bg-red-50 text-red-500"><i class="fa-solid fa-minus"></i></button><button onclick="updateStock('${p.id}',1)" class="w-8 h-8 rounded bg-green-50 text-green-500"><i class="fa-solid fa-plus"></i></button></div></div>`).join('');
}
async function updateStock(id, chg) { const p=allProducts.find(x=>x.id===id); if(p) await db.ref(`productos/${id}/stock`).set((p.stock||0)+chg); }
function loadMore(t) { if(t==='cat') catLimit+=50; else invLimit+=50; renderCatalog(); renderInventory(); }

// QR Gen
function openGenerateQR(id, name) {
    document.getElementById('qr-modal').classList.remove('hidden');
    new QRious({ element: document.getElementById('qr-canvas'), value: `https://productoseen.web.app/?add=${id}`, size: 250 });
    document.getElementById('qr-prod-name').innerText = name;
}
function printQR() {
    const w = window.open('','','height=600,width=800');
    w.document.write(`<html><body style="text-align:center;font-family:sans-serif;"><h1>${document.getElementById('qr-prod-name').innerText}</h1><img src="${document.getElementById('qr-canvas').toDataURL()}" style="width:300px;"><p>Escanear para agregar</p></body></html>`);
    w.document.close(); w.print();
}

// Scanner Input
function startScanner() {
    if(html5QrCode) return;
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({facingMode:"environment"}, {fps:10,qrbox:{width:250,height:250}}, onScanSuccess);
}
function stopScanner() { if(html5QrCode) html5QrCode.stop().then(()=>{html5QrCode.clear();html5QrCode=null;}); }
async function onScanSuccess(txt) {
    let id = txt.includes('add=') ? txt.split('add=')[1] : txt;
    const p = allProducts.find(x => x.id === id);
    if(p) {
        await updateStock(id, 1);
        const ov = document.getElementById('scan-overlay');
        ov.innerHTML = `<div class="text-green-400 font-black text-4xl">¡Stock +1!</div><div class="text-white">${p.name}</div>`;
        ov.classList.remove('opacity-0'); setTimeout(()=>ov.classList.add('opacity-0'), 1000);
        document.getElementById('scanProdName').innerText = p.name;
        document.getElementById('scanTotal').innerText = (p.stock||0)+1;
    }
}

// Utils
window.previewImage = (u) => { const b=document.getElementById('imgPreviewBox'); if(u.length>10) { b.classList.remove('hidden'); document.getElementById('imgPreview').src=u; } else b.classList.add('hidden'); }
function showToast(m) { const t=document.getElementById('toast'); document.getElementById('toast-msg').innerText=m; t.classList.remove('translate-y-32'); setTimeout(()=>t.classList.add('translate-y-32'),3000); }
