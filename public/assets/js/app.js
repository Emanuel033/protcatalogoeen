// ==========================================
// ESTADO GLOBAL
// ==========================================
let allProducts = [], filteredProducts = [], cart = [];
let currentCategory = 'Todos', currentPage = 1, latestProductIds = [];
const itemsPerPage = 48;
let searchTimeout;
let html5QrcodeScanner;

// Variables de Checkout
let selectedDelivery = null, selectedPayment = null, isOcurre = false;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        try { cart = JSON.parse(localStorage.getItem('cart_een')) || []; } catch(e) { cart = []; }
        
        loadPrefs();
        loadProducts();
        renderCart();
        checkQRParam();

        window.addEventListener('scroll', () => {
            const btn = document.getElementById('scroll-top-btn');
            if(btn) btn.classList.toggle('visible', window.scrollY > 300);
        });

        // TOUR DESACTIVADO: Se comenta esta sección para evitar que aparezca
        /*
        const urlParams = new URLSearchParams(window.location.search);
        if(!localStorage.getItem('tour_seen_v2') && !urlParams.has('add')) {
           setTimeout(() => startTour(), 2000); 
        }
        */
    } catch (e) { console.error("Error init:", e); }
});

// ==========================================
// LÓGICA DE PRODUCTOS
// ==========================================
function loadProducts() {
    const container = document.getElementById('products-container');
    if(!container) return;

    db.ref('productos').on('value', (snap) => {
        allProducts = [];
        if(snap.exists()) {
            snap.forEach(child => {
                const val = child.val();
                if(val.activo !== false) allProducts.push({ id: child.key, ...val });
            });
            const tempByDate = [...allProducts].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
            latestProductIds = tempByDate.slice(0, 12).map(p => p.id);
            allProducts.sort((a, b) => {
                const isANew = latestProductIds.includes(a.id), isBNew = latestProductIds.includes(b.id);
                if (isANew && !isBNew) return -1;
                if (!isANew && isBNew) return 1;
                return a.name.localeCompare(b.name);
            });
        }
        renderCategories();
        applyFilter();
    });
}

function renderCategories() {
    const cont = document.getElementById('categories-container');
    if(!cont) return;
    const cats = ['Todos', ...new Set(allProducts.map(p => p.category || 'Varios'))].sort();
    cont.innerHTML = cats.map(cat => `
        <button onclick="filterCat('${cat}')" class="px-5 py-2 rounded-full text-sm font-bold border transition ${currentCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:text-indigo-600'}">${cat}</button>
    `).join('');
}

function filterCat(cat) {
    currentCategory = cat;
    renderCategories();
    applyFilter();
    if(analytics) analytics.logEvent('select_content', { content_type: 'category', item_id: cat });
}

function debouncedFilter() {
    const term = document.getElementById('searchInput')?.value;
    const clearBtn = document.getElementById('clearSearchBtn');
    if(clearBtn) clearBtn.classList.toggle('hidden', !term);

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        applyFilter();
        if(term && term.length > 2 && analytics) {
            analytics.logEvent('search', { search_term: term });
        }
    }, 500);
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    if(input) { input.value = ''; debouncedFilter(); input.focus(); }
}

function applyFilter() {
    const term = document.getElementById('searchInput')?.value.toLowerCase() || '';
    filteredProducts = allProducts.filter(p => {
        return (currentCategory === 'Todos' || p.category === currentCategory) && p.name.toLowerCase().includes(term);
    });
    currentPage = 1;
    renderGrid();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({'&': '&amp;','<': '&lt;','>': '&gt;',"'": '&#39;','"': '&quot;'}[tag]));
}

function renderGrid() {
    const cont = document.getElementById('products-container');
    const controls = document.getElementById('pagination-controls');
    if(!cont) return;

    if(filteredProducts.length === 0) {
        cont.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400">Sin resultados.</div>`;
        if(controls) controls.classList.add('hidden');
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredProducts.slice(start, start + itemsPerPage);

    cont.innerHTML = pageItems.map((p, idx) => {
        const isBolsas = (p.category || '').toLowerCase().includes('bolsa'); 
        const packQty = isBolsas ? 100 : (p.piezas ? parseInt(p.piezas) : 0);
        const hasPack = packQty > 1;
        const isNew = latestProductIds.includes(p.id);
        
        let selectorHTML = isBolsas 
            ? `<select id="sel-${p.id}" class="w-full text-xs border border-indigo-200 rounded-lg p-1.5 mb-2 bg-indigo-50 text-indigo-700 font-bold outline-none"><option value="100">Paquete (100 pzas)</option></select>`
            : (hasPack ? `<select id="sel-${p.id}" class="w-full text-xs border border-slate-200 rounded-lg p-1.5 mb-2 bg-slate-50 text-slate-700 font-medium outline-none"><option value="1">Individual</option><option value="${packQty}">Paquete completo</option></select>` 
            : `<input type="hidden" id="sel-${p.id}" value="1">`);

        // Diseño actualizado para nombre completo (más pequeño)
        return `
        <div class="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 flex flex-col fade-in relative group transition-all duration-300 hover:-translate-y-1" style="animation-delay: ${idx * 30}ms">
            <div class="relative h-52 p-4 cursor-pointer overflow-hidden rounded-t-2xl" onclick="openImage('${p.image}')">
                <img src="${p.image}" loading="lazy" alt="${escapeHTML(p.name)}" class="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" onerror="this.src='https://via.placeholder.com/300?text=Sin+Imagen'">
                ${isNew ? `<span class="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md badge-pulse">NUEVO</span>` : ''}
            </div>
            <div class="p-4 flex flex-col flex-1 border-t border-slate-50">
                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">${escapeHTML(p.category || 'General')}</span>
                
                <h3 class="font-bold text-xs text-slate-900 mb-3 leading-relaxed">
                    ${escapeHTML(p.name)}
                </h3>
                
                ${selectorHTML}
                
                <div class="mt-auto flex gap-2 pt-2">
                    <button onclick="add('${p.id}')" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition active:scale-95">Agregar</button>
                    <button onclick="askProduct('${p.id}')" class="product-help-btn w-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-green-500 hover:bg-green-50 transition active:scale-95"><i class="fa-brands fa-whatsapp"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');

    if(controls) {
        const total = Math.ceil(filteredProducts.length / itemsPerPage);
        controls.classList.toggle('hidden', total <= 1);
        if(total > 1) {
            document.getElementById('page-info').innerText = `Pág ${currentPage} / ${total}`;
            document.getElementById('btn-prev').disabled = currentPage === 1;
            document.getElementById('btn-next').disabled = currentPage === total;
        }
    }
}

function changePage(d) { currentPage += d; renderGrid(); document.getElementById('products-container').scrollIntoView({ behavior: 'smooth' }); }

// ==========================================
// CARRITO
// ==========================================
function add(id) {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;
    const sel = document.getElementById(`sel-${id}`);
    const qty = sel ? parseInt(sel.value) : 1;
    const exist = cart.find(x => x.id === id);
    if(exist) exist.quantity += qty; else cart.push({ ...p, quantity: qty });
    saveCart();
    showToast(`Agregado (+${qty})`);
    if(analytics) analytics.logEvent('add_to_cart', { items: [{ item_id: id, item_name: p.name, quantity: qty }] });
}

function updateCartItem(id) {
    const item = cart.find(x => x.id === id);
    if(!item) return;
    const prod = allProducts.find(p => p.id === id) || item; 
    const isBolsas = (prod.category||'').toLowerCase().includes('bolsa');
    const packSize = isBolsas ? 100 : (parseInt(prod.piezas)||0);
    
    if (packSize > 1) {
        const packs = parseInt(document.getElementById(`inp-pack-${id}`).value) || 0;
        let loose = isBolsas ? 0 : (parseInt(document.getElementById(`inp-loose-${id}`).value) || 0);
        item.quantity = (packs * packSize) + loose;
    } else {
        item.quantity = parseInt(document.getElementById(`inp-simple-${id}`).value) || 1;
    }
    item.quantity <= 0 ? remove(id) : saveCart();
}

function remove(id) { cart = cart.filter(x => x.id !== id); saveCart(); }

function saveCart() {
    try { localStorage.setItem('cart_een', JSON.stringify(cart)); } catch (e) {}
    renderCart();
    const b = document.getElementById('cart-badge');
    if(b) { b.classList.remove('scale-0'); b.classList.add('scale-125'); setTimeout(() => b.classList.remove('scale-125'), 200); }
}

function renderCart() {
    const itemsCont = document.getElementById('cart-items');
    if(!itemsCont) return;
    
    const total = cart.reduce((a,b) => a + b.quantity, 0);
    document.getElementById('cart-badge').innerText = total;
    document.getElementById('cart-badge').classList.toggle('scale-0', total === 0);
    document.getElementById('cart-total').innerText = total;

    if(cart.length === 0) {
        itemsCont.innerHTML = `<div class="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl m-2"><p class="text-sm font-medium">Carrito vacío</p></div>`;
        document.getElementById('cart-config').classList.add('hidden');
        return;
    }
    document.getElementById('cart-config').classList.remove('hidden');

    itemsCont.innerHTML = cart.map(item => {
        const prod = allProducts.find(p => p.id === item.id) || item;
        const isBolsas = (prod.category||'').toLowerCase().includes('bolsa');
        const packSize = isBolsas ? 100 : (parseInt(prod.piezas)||0);
        
        let inputsHTML = packSize > 1 
            ? `<div class="flex gap-2 mt-2"><div class="flex-1"><label class="text-[9px] text-slate-400 font-bold uppercase block">Paquetes</label><input type="number" id="inp-pack-${item.id}" value="${Math.floor(item.quantity/packSize)}" min="0" onchange="updateCartItem('${item.id}')" class="w-full border rounded text-center text-sm py-1 bg-indigo-50 outline-none"></div><div class="flex-1 ${isBolsas?'hidden':''}"><label class="text-[9px] text-slate-400 font-bold uppercase block">Sueltas</label><input type="number" id="inp-loose-${item.id}" value="${item.quantity%packSize}" min="0" onchange="updateCartItem('${item.id}')" class="w-full border rounded text-center text-sm py-1 outline-none"></div></div>`
            : `<div class="mt-2 flex justify-end items-center gap-2"><label class="text-[10px] text-slate-400 font-bold">Piezas:</label><input type="number" id="inp-simple-${item.id}" value="${item.quantity}" min="1" onchange="updateCartItem('${item.id}')" class="w-20 border rounded text-center text-sm py-1 outline-none"></div>`;

        return `<div class="bg-white p-4 rounded-xl border flex gap-4 shadow-sm"><img src="${item.image}" class="w-16 h-16 object-contain shrink-0"><div class="flex-1"><div class="flex justify-between font-bold text-sm text-slate-800"><span>${escapeHTML(item.name)}</span><button onclick="remove('${item.id}')" class="text-red-400 hover:text-red-600 transition">×</button></div>${inputsHTML}</div></div>`;
    }).join('');
}

function clearCart() { if(confirm("¿Vaciar carrito?")) { cart = []; saveCart(); toggleCart(); } }
function toggleCart() {
    const m = document.getElementById('cart-modal'), b = document.getElementById('cart-backdrop'), p = document.getElementById('cart-panel');
    if(m.classList.contains('hidden')) {
        m.classList.remove('hidden'); setTimeout(() => { b.classList.remove('opacity-0'); p.classList.remove('translate-x-full'); }, 10);
        if(analytics) analytics.logEvent('view_cart');
    } else {
        b.classList.add('opacity-0'); p.classList.add('translate-x-full'); setTimeout(() => m.classList.add('hidden'), 300);
    }
}

// ==========================================
// INTEGRACIONES Y HELPERS
// ==========================================
function checkQRParam() {
    const pid = new URLSearchParams(window.location.search).get('add');
    if (pid) {
        showToast("Procesando código QR...");
        let att = 0;
        const i = setInterval(() => {
            if (++att > 60) { clearInterval(i); showToast("Error de conexión"); return; }
            if (allProducts.length > 0) {
                const exists = allProducts.find(p => p.id === pid);
                if (exists) { 
                    add(pid); 
                    toggleCart(); 
                    showToast("¡Escaneado exitoso!"); 
                    window.history.replaceState({},'',window.location.pathname); 
                    if(analytics) analytics.logEvent('scan_qr', { product_id: pid });
                }
                clearInterval(i);
            }
        }, 500);
    }
}

function startQRScanner() {
    document.getElementById('qr-scanner-modal').classList.remove('hidden');
    if(html5QrcodeScanner) stopQRScanner().then(initScanner); else initScanner();
}

function initScanner() {
    html5QrcodeScanner = new Html5Qrcode("reader");
    html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (txt) => {
        stopQRScanner();
        let pid = txt.includes('add=') ? txt.split('add=')[1].split('&')[0] : txt;
        if (allProducts.find(p => p.id === pid)) { add(pid); if(document.getElementById('cart-modal').classList.contains('hidden')) toggleCart(); showToast("Producto detectado"); }
        else alert("Código no reconocido");
    }).catch(e => { alert("Error cámara"); document.getElementById('qr-scanner-modal').classList.add('hidden'); });
}

function stopQRScanner() {
    document.getElementById('qr-scanner-modal').classList.add('hidden');
    return html5QrcodeScanner ? html5QrcodeScanner.stop().then(() => { html5QrcodeScanner.clear(); html5QrcodeScanner = null; }) : Promise.resolve();
}

// === LÓGICA DE ROUND ROBIN WHATSAPP ===
function getRandomPhone() {
    const phones = ['528113728493', '528118400503'];
    return phones[Math.floor(Math.random() * phones.length)];
}

function sendWhatsApp() {
    if(cart.length === 0) return showToast("Carrito vacío");
    const name = document.getElementById('client-name').value.trim() || "Cliente";
    let msg = `👋 Hola, soy *${name}*.\nPedido:\n\n`;
    
    if(selectedDelivery === 'recoger') msg += `📍 Recoger en Sucursal (${selectedPayment||'?'})\n`;
    else if(selectedDelivery === 'local') msg += `🚚 Envío Local a: ${document.getElementById('delivery-address').value} (${selectedPayment||'?'})\n`;
    else if(selectedDelivery === 'foraneo') msg += `✈️ Envío Foráneo (${isOcurre?'Ocurre':'Domicilio'}) por ${document.getElementById('fletera-name').value}\n`;

    cart.forEach(i => {
        const prod = allProducts.find(p => p.id === i.id) || i;
        const packSize = (prod.category||'').toLowerCase().includes('bolsa') ? 100 : (parseInt(prod.piezas)||0);
        msg += `🔹 ${i.name}`;
        if(packSize > 1) {
            const p = Math.floor(i.quantity/packSize), l = i.quantity%packSize;
            if(p>0) msg+=`\n   📦 ${p} Paq (${packSize}c/u)`;
            if(l>0) msg+=`\n   🧩 ${l} Pzas sueltas`;
        } else msg += ` (${i.quantity} pzas)`;
        msg += '\n';
    });

    const phone = getRandomPhone();
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
    
    if(analytics) analytics.logEvent('generate_lead', { currency: 'MXN', value: 0 });
}

function openGeneralWhatsApp() {
    const phone = getRandomPhone();
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent("Hola, tengo una duda general.")}`, '_blank');
}

function askProduct(id) { 
    const p = allProducts.find(x => x.id === id); 
    const phone = getRandomPhone();
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent("Info sobre: "+p.name)}`, '_blank');
    if(analytics) analytics.logEvent('ask_product', { product_id: id });
}

function loadPrefs() { try { const p = JSON.parse(localStorage.getItem('user_prefs_een')) || {}; if(p.name) document.getElementById('client-name').value = p.name; if(p.deliveryType) setDelivery(p.deliveryType, false); } catch(e){} }
function savePrefs() { localStorage.setItem('user_prefs_een', JSON.stringify({ name: document.getElementById('client-name').value, deliveryType: selectedDelivery, paymentMethod: selectedPayment, isOcurre: isOcurre, address: document.getElementById('delivery-address').value, fletera: document.getElementById('fletera-name').value })); }

function setDelivery(t,s=true) {
    selectedDelivery = t;
    ['recoger','local','foraneo'].forEach(x => {
        document.getElementById(`btn-${x}`).classList.remove('selected');
        document.getElementById(`panel-${x}`).classList.add('hidden');
    });
    document.getElementById(`btn-${t}`).classList.add('selected');
    document.getElementById(`panel-${t}`).classList.remove('hidden');
    if(s) savePrefs();
}

function setPayment(m) { selectedPayment = m; document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('selected')); event.target.classList.add('selected'); document.getElementById('bank-info').classList.toggle('hidden', m !== 'Transferencia'); savePrefs(); }
function setPublicoGeneral() { document.getElementById('client-name').value = "Público General"; savePrefs(); }
function setOcurre(v) { isOcurre = v; document.getElementById('btn-ocurre-si').classList.toggle('selected', v); document.getElementById('btn-ocurre-no').classList.toggle('selected', !v); savePrefs(); }

function showToast(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('opacity-0','translate-y-24'); setTimeout(()=>t.classList.add('opacity-0','translate-y-24'),2500); }
function openImage(s) { document.getElementById('lightbox-img').src=s; document.getElementById('lightbox').classList.remove('hidden'); }
function scrollToTop() { window.scrollTo({top:0, behavior:'smooth'}); }

function startTour() {
    const tour = [
        {el:'#main-nav', t:'¡Bienvenido!', d:'Explora nuestro catálogo digital.'},
        {el:'#searchInput', t:'Buscador', d:'Encuentra productos rápidamente.'},
        {el:'#categories-bar', t:'Filtros', d:'Navega por categorías.'},
        {el:'#products-container > div:first-child', t:'Producto', d:'Agrega o consulta dudas.'},
        {el:'#cart-fab', t:'Carrito', d:'Revisa tu pedido aquí.'}
    ];
    localStorage.setItem('tour_seen_v2', 'true');
}
function startCartTour() { alert("Aquí puedes ver tu pedido, elegir entrega y enviar por WhatsApp."); }
