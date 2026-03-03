// ==========================================
// ESTADO GLOBAL
// ==========================================
let allProducts = [], filteredProducts = [], cart = [];
let currentCategory = 'Todos', currentPage = 1, latestProductIds = [];
let itemsPerPage = window.innerWidth < 768 ? 16 : 48; 
let searchTimeout;
let html5QrcodeScanner;

// Variables de Checkout
let selectedDelivery = null, selectedPayment = null, isOcurre = false;

// Variables del Tour
let currentTourSteps = [];
let tourIndex = 0;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        try { cart = JSON.parse(localStorage.getItem('cart_een')) || []; } catch(e) { cart = []; }
        
        loadPrefs();
        loadProducts(); // Llamada a Firebase (Ahora optimizada)
        renderCart();
        checkQRParam();

        window.addEventListener('scroll', () => {
            const btn = document.getElementById('scroll-top-btn');
            if(btn) btn.classList.toggle('visible', window.scrollY > 300);
        });

        window.addEventListener('resize', () => {
            itemsPerPage = window.innerWidth < 768 ? 16 : 48;
        });

    } catch (e) { console.error("Error init:", e); }
});

// ==========================================
// LÓGICA DE PRODUCTOS (CONEXIÓN A FIRESTORE OPTIMIZADA 💰)
// ==========================================
async function loadProducts() {
    const container = document.getElementById('products-grid') || document.getElementById('products-container');
    if (container) {
        container.innerHTML = '<div class="col-span-full text-center py-12"><div class="loader mx-auto mb-4"></div><p class="text-slate-500 font-medium">Cargando catálogo...</p></div>';
    }

    try {
        // --- 1. INTENTO DE CARGA DESDE CACHÉ LOCAL (AHORRO DE COSTOS) ---
        const cacheLocal = sessionStorage.getItem('catalogo_een_data');
        const timestampCache = sessionStorage.getItem('catalogo_een_time');
        const TIEMPO_EXPIRACION = 60 * 60 * 1000; // 1 hora en milisegundos

        if (cacheLocal && timestampCache && (Date.now() - timestampCache < TIEMPO_EXPIRACION)) {
            console.log("Catálogo cargado desde memoria local (Sin costo de Firebase)");
            allProducts = JSON.parse(cacheLocal);
            
            latestProductIds = allProducts.slice(-8).map(p => p.id);
            if (typeof renderCategories === 'function') renderCategories();
            if (typeof applyFilter === 'function') applyFilter();
            return; // Detenemos la función aquí, no le pedimos nada a Firebase
        }

        console.log("Descargando catálogo desde Firebase...");
        const db = firebase.firestore();
        
        // --- 2. DESCARGA ÚNICA CON .get() EN LUGAR DE .onSnapshot() ---
        const snapshot = await db.collection('productos_master')
                                 .where('activo', '==', true)
                                 .get();

        let rawProducts = [];
        let basesToFetch = new Set(); // Set evita que busquemos el mismo ID dos veces

        snapshot.forEach(doc => {
            const data = doc.data();
            rawProducts.push({ id: doc.id, ...data });

            // Si es pieza base, buscamos sus propios paquetes
            if (data.tipo_item === 'PIEZA_BASE') {
                basesToFetch.add(doc.id);
            } 
            // Si hereda, anotamos el ID de su "papá" para ir a robarle sus paquetes
            else if (data.hereda_empaques_de) {
                basesToFetch.add(data.hereda_empaques_de);
            }
        });

        // --- 3. DESCARGAR TODOS LOS PAQUETES NECESARIOS AL MISMO TIEMPO ---
        const paquetesMap = {};
        const promesasPaquetes = Array.from(basesToFetch).map(async (baseId) => {
            try {
                const paqSnap = await db.collection('productos_master').doc(baseId).collection('paquetes').get();
                paquetesMap[baseId] = [];
                paqSnap.forEach(pDoc => {
                    paquetesMap[baseId].push({ id: pDoc.id, ...pDoc.data() });
                });
                // Ordenar de menor a mayor (ej. Caja de 12 primero, Caja de 50 después)
                paquetesMap[baseId].sort((a, b) => a.piezas - b.piezas);
            } catch (error) { console.error("Error cargando paquetes para", baseId, error); }
        });
        
        await Promise.all(promesasPaquetes);

        // --- 4. ARMAR LISTA FINAL ASIGNANDO LAS CAJAS ---
        allProducts = rawProducts.map(data => {
            const producto = {
                id: data.id,
                name: data.nombre_flexible || 'Sin nombre',
                category: data.categoria || 'General',
                image: data.imagen_url || 'https://via.placeholder.com/150',
                piezas: data.piezas_por_caja_original || 1,
                stock: data.stock_total_piezas || 0,
                tipo_item: data.tipo_item || 'PIEZA_BASE',
                codigo_sistema: data.codigo_sistema_oficial || null,
                receta: data.receta_desglose || null,
                paquetes: [] 
            };

            // Aquí ocurre la herencia: le pasamos las cajas que le tocan
            if (producto.tipo_item === 'PIEZA_BASE') {
                producto.paquetes = paquetesMap[producto.id] || [];
            } else if (data.hereda_empaques_de) {
                producto.paquetes = paquetesMap[data.hereda_empaques_de] || [];
            }

            return producto;
        });

        // --- 5. GUARDAR RESULTADO EN CACHÉ PARA AHORRAR LECTURAS FUTURAS ---
        sessionStorage.setItem('catalogo_een_data', JSON.stringify(allProducts));
        sessionStorage.setItem('catalogo_een_time', Date.now());

        latestProductIds = allProducts.slice(-8).map(p => p.id);
        
        if (typeof renderCategories === 'function') renderCategories();
        if (typeof applyFilter === 'function') applyFilter();
        
    } catch (error) {
        console.error("Error crítico al cargar catálogo:", error);
        if (container) container.innerHTML = '<div class="col-span-full text-center py-12 text-red-500 font-bold"><i class="fas fa-exclamation-triangle text-3xl mb-3"></i><br>Error al cargar el catálogo. Por favor recarga la página.</div>';
    }
}


function getCategoryIcon(cat) {
    const c = cat.toLowerCase();
    if(c.includes('bolsa')) return '<i class="fa-solid fa-bag-shopping mr-1.5 opacity-80"></i>';
    if(c.includes('cubeta')) return '<i class="fa-solid fa-bucket mr-1.5 opacity-80"></i>'; 
    if(c.includes('garrafa')) return '<i class="fa-solid fa-jug-detergent mr-1.5 opacity-80"></i>';
    if(c.includes('tapa')) return '<i class="fa-solid fa-circle-notch mr-1.5 opacity-80"></i>';
    if(c.includes('tambor') || c.includes('barril')) return '<i class="fa-solid fa-drum-steelpan mr-1.5 opacity-80"></i>';
    if(c.includes('lámina') || c.includes('lamina')) return '<i class="fa-solid fa-fill-drip mr-1.5 opacity-80"></i>';
    if(c.includes('pad')) return '<i class="fa-solid fa-flask mr-1.5 opacity-80"></i>'; 
    if(c.includes('pbd')) return '<i class="fa-solid fa-droplet mr-1.5 opacity-80"></i>'; 
    if(c.includes('botella') || c.includes('pet')) return '<i class="fa-solid fa-bottle-water mr-1.5 opacity-80"></i>'; 
    if(c.includes('todos')) return '<i class="fa-solid fa-border-all mr-1.5 opacity-80"></i>';
    return '<i class="fa-solid fa-box mr-1.5 opacity-80"></i>';
}

function renderCategories() {
    const cont = document.getElementById('categories-container');
    if(!cont) return;
    
    let uniqueCats = [...new Set(allProducts.map(p => p.category || 'Varios'))];
    uniqueCats = uniqueCats.filter(c => c.toLowerCase() !== 'todos'); 
    uniqueCats.sort((a, b) => a.localeCompare(b)); 
    
    const cats = ['Todos', ...uniqueCats]; 
    
    cont.innerHTML = cats.map(cat => `
        <button onclick="filterCat('${cat}')" class="px-5 py-2 flex items-center rounded-full text-sm font-bold border transition whitespace-nowrap ${currentCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:text-indigo-600'}">
            ${getCategoryIcon(cat)} ${cat}
        </button>
    `).join('');
}

function filterCat(cat) {
    currentCategory = cat;
    renderCategories();
    applyFilter();
    
    setTimeout(() => {
        const activeBtn = document.querySelector('#categories-container button.bg-indigo-600');
        if(activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, 50);

    if(typeof analytics !== 'undefined' && analytics) analytics.logEvent('select_content', { content_type: 'category', item_id: cat });
}

function debouncedFilter() {
    const term = document.getElementById('searchInput')?.value;
    const clearBtn = document.getElementById('clearSearchBtn');
    if(clearBtn) clearBtn.classList.toggle('hidden', !term);

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        applyFilter();
        if(term && term.length > 2 && typeof analytics !== 'undefined' && analytics) {
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
    return str ? String(str).replace(/[&<>'"]/g, tag => ({'&': '&amp;','<': '&lt;','>': '&gt;',"'": '&#39;','"': '&quot;'}[tag])) : '';
}

// ==========================================
// 2. DIBUJAR TARJETAS DE PRODUCTOS
// ==========================================

function renderGrid() {
    const cont = document.getElementById('products-container') || document.getElementById('products-grid');
    const controls = document.getElementById('pagination-controls');
    if(!cont) return;

    if(filteredProducts.length === 0) {
        cont.innerHTML = `<div class="col-span-full text-center py-20 fade-in"><h3 class="text-lg font-bold text-slate-700 mb-1">Sin resultados</h3></div>`;
        if(controls) controls.classList.add('hidden');
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredProducts.slice(start, start + itemsPerPage);

    cont.innerHTML = pageItems.map((p, idx) => {
        const isNew = latestProductIds.includes(p.id);
        const paquetes = p.paquetes || [];
        const hasPack = paquetes.length > 0;
        
        const basePiezas = p.piezas ? parseInt(p.piezas) : 1;
        const minText = `Min: ${basePiezas} pz${basePiezas > 1 ? 's' : ''}`;
        
        let packText = "";
        if (paquetes.length === 1) {
            packText = `<span class="text-indigo-600 font-black">Paquete: ${paquetes[0].piezas} pzas</span>`;
        } else if (paquetes.length > 1) {
            packText = `<span class="text-indigo-600 font-black">Varias opciones</span>`;
        }

        let selectorHTML = '';
        if (hasPack) {
            selectorHTML = `<select id="sel-${p.id}" class="w-full text-xs border border-indigo-200 rounded-lg p-1.5 mb-2 bg-indigo-50 text-indigo-700 font-bold outline-none">
                <option value="${basePiezas}|BASE">Individual (${basePiezas} pz)</option>`;
            paquetes.forEach(pkg => {
                selectorHTML += `<option value="${pkg.piezas}|${pkg.sku}">Paquete/Bolsa (${pkg.piezas} pzas)</option>`;
            });
            selectorHTML += `</select>`;
        } else {
            selectorHTML = `<input type="hidden" id="sel-${p.id}" value="${basePiezas}|BASE">`;
        }

        return `
        <div class="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 flex flex-col fade-in relative group transition-all duration-300 hover:-translate-y-1" style="animation-delay: ${idx * 30}ms">
            <div class="relative h-52 p-4 cursor-pointer overflow-hidden rounded-t-2xl" onclick="openImage('${p.image}')">
                <img src="${p.image}" loading="lazy" alt="${escapeHTML(p.name)}" class="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" onerror="this.src='https://via.placeholder.com/300?text=Sin+Imagen'">
                ${isNew ? `<span class="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md badge-pulse">NUEVO</span>` : ''}
            </div>
            <div class="p-4 flex flex-col flex-1 border-t border-slate-50">
                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">${escapeHTML(p.category || 'General')}</span>
                <h3 class="font-bold text-xs text-slate-900 mb-2 leading-relaxed h-auto">${escapeHTML(p.name)}</h3>
                <div class="flex justify-between items-end text-[10px] font-bold text-slate-500 mb-2">
                    <span>${minText}</span>
                    ${packText}
                </div>
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


function changePage(d) { 
    currentPage += d; 
    renderGrid(); 
    
    const container = document.getElementById('products-container');
    if(container) {
        const yOffset = -120; 
        const y = container.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
}

// ==========================================
// CARRITO
// ==========================================

function saveCart() {
    localStorage.setItem('cart_een', JSON.stringify(cart));
}

function updateCartCount() {
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.innerText = total;
        badge.classList.toggle('scale-0', total === 0);
    }
    
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.innerText = total;

    document.querySelectorAll('#cartCountHeader, #cartCountMobile').forEach(el => {
        el.innerText = total;
        if(total > 0) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
}

// ======================================================================
// 2. FUNCIÓN ADD
// ======================================================================
function add(id) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;

    const selectElem = document.getElementById(`sel-${id}`);
    let qtyToAdd = 1; 

    if (selectElem && selectElem.value) {
        const valores = selectElem.value.split('|'); 
        qtyToAdd = parseInt(valores[0]) || 1; 
    }

    const existingItem = cart.find(x => x.id === id);
    
    if (existingItem) {
        existingItem.quantity += qtyToAdd; 
    } else {
        cart.push({
            id: prod.id, 
            name: prod.name, 
            image: prod.image,
            category: prod.category, 
            piezas: prod.piezas,
            tipo_item: prod.tipo_item || 'PIEZA_BASE',
            codigo_sistema: prod.codigo_sistema || prod.codigo_sistema_oficial || 'S/N',
            receta: prod.receta || prod.receta_desglose || null,
            paquetes: prod.paquetes || [],
            quantity: qtyToAdd 
        });
    }
    
    saveCart();
    if(typeof updateCartCount === 'function') updateCartCount();
    if(typeof renderCart === 'function') renderCart();
    
    const fab = document.getElementById('cart-fab');
    if(fab) { fab.classList.remove('animate-pop'); void fab.offsetWidth; fab.classList.add('animate-pop'); }
    try {
        const badges = document.querySelectorAll('#cart-badge, .cart-badge');
        badges.forEach(b => {
            b.style.transition = 'all 0.4s'; b.style.setProperty('background-color', '#22c55e', 'important'); b.style.setProperty('transform', 'scale(1.6)', 'important');     
            setTimeout(() => { b.style.removeProperty('background-color'); b.style.removeProperty('transform'); }, 500);
        });
    } catch(e) {}

    if (typeof showToast === 'function') showToast(`Agregado (+${qtyToAdd} pz)`);
}

function clearCart() {
    if (cart.length === 0) return;
    if (confirm('¿Estás seguro de que deseas vaciar el carrito por completo?')) {
        cart = []; 
        saveCart(); 
        updateCartCount(); 
        renderCart(); 
        if (typeof showToast === 'function') showToast('Carrito vaciado exitosamente');
    }
}


// ======================================================================
// 3. RENDER CARRITO
// ======================================================================
function renderCart() {
    const itemsCont = document.getElementById('cart-items');
    if(!itemsCont) return;
    
    const total = cart.reduce((a,b) => a + b.quantity, 0);
    const badge = document.getElementById('cart-badge');
    if(badge) {
        badge.innerText = total;
        badge.classList.toggle('scale-0', total === 0);
    }
    const cartTotalEl = document.getElementById('cart-total');
    if(cartTotalEl) cartTotalEl.innerText = total;

    if(cart.length === 0) {
        itemsCont.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-slate-400 m-4 py-20 fade-in">
            <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300 animate-pulse"><i class="fa-solid fa-basket-shopping text-3xl"></i></div>
            <p class="text-sm font-bold text-slate-500">Tu pedido está vacío</p>
        </div>`;
        const cartConfig = document.getElementById('cart-config');
        if(cartConfig) cartConfig.classList.add('hidden');
        return;
    }
    
    const cartConfig = document.getElementById('cart-config');
    if(cartConfig) cartConfig.classList.remove('hidden');

    itemsCont.innerHTML = cart.map((item, idx) => {
        const prod = allProducts.find(p => p.id === item.id) || item;
        const isBolsas = (prod.category || '').toLowerCase().includes('bolsa');
        const paquetes = prod.paquetes || item.paquetes || [];
        
        let packSize = 1;
        if (paquetes.length > 0) packSize = parseInt(paquetes[0].piezas); 
        else if (isBolsas) packSize = 100; 
        else packSize = parseInt(prod.piezas) || 0;
        
        let inputsHTML = '';
        if (packSize > 1) {
            const packsCalculados = Math.floor(item.quantity / packSize);
            const sueltasCalculadas = item.quantity % packSize;

            inputsHTML = `
            <div class="flex gap-2 mt-2">
                <div class="flex-1 flex items-center gap-2 bg-slate-50 border rounded-lg px-2 py-1.5">
                    <i class="fa-solid fa-box text-indigo-500 text-sm"></i>
                    <div class="flex flex-col flex-1">
                        <label class="text-[9px] uppercase font-bold text-slate-400 leading-none">Paquetes</label>
                        <input type="number" id="inp-pack-${item.id}" value="${packsCalculados}" min="0" onchange="updateCartItem('${item.id}')" class="w-full bg-transparent font-bold text-slate-800 text-sm outline-none">
                    </div>
                </div>
                ${!isBolsas ? `<div class="flex-1 flex items-center gap-2 bg-slate-50 border rounded-lg px-2 py-1.5"><i class="fa-solid fa-shapes text-slate-400 text-sm"></i><div class="flex flex-col flex-1"><label class="text-[9px] uppercase font-bold text-slate-400 leading-none">Pzas Sueltas</label><input type="number" id="inp-loose-${item.id}" value="${sueltasCalculadas}" min="0" onchange="updateCartItem('${item.id}')" class="w-full bg-transparent font-bold text-slate-800 text-sm outline-none"></div></div>` : ''}
            </div>`;
        } else {
             inputsHTML = `<div class="flex justify-end mt-2"><div class="flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-1.5 w-32"><span class="text-[10px] font-bold text-slate-400">PZAS:</span><input type="number" id="inp-simple-${item.id}" value="${item.quantity}" min="1" onchange="updateCartItem('${item.id}')" class="w-full bg-transparent font-bold text-slate-800 text-center outline-none"></div></div>`;
        }
        
        const safeName = escapeHTML(item.name);
        
        return `
        <div class="flex gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm mb-3 fade-in relative transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div class="h-16 w-16 shrink-0 rounded-lg bg-slate-50 p-1 flex items-center justify-center border"><img src="${item.image}" class="h-full w-full object-contain mix-blend-multiply" onerror="this.src='https://via.placeholder.com/60'"></div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start gap-2">
                    <h4 class="text-xs font-bold text-slate-800 leading-snug line-clamp-2">${safeName}</h4>
                    <button onclick="remove('${item.id}')" class="text-slate-300 hover:text-red-500 transition-colors p-1"><i class="fa-solid fa-trash-can"></i></button>
                </div>
                ${inputsHTML}
            </div>
        </div>`;
    }).join('');
}
// ======================================================================
// 4. UPDATE y REMOVE
// ======================================================================
function updateCartItem(id) {
    const item = cart.find(x => x.id === id);
    if (!item) return;

    const prod = allProducts.find(p => p.id === id) || item;
    const isBolsas = (prod.category || '').toLowerCase().includes('bolsa');
    const paquetes = prod.paquetes || item.paquetes || [];
    
    let packSize = 1;
    if (paquetes.length > 0) packSize = parseInt(paquetes[0].piezas); 
    else if (isBolsas) packSize = 100; 
    else packSize = parseInt(prod.piezas) || 0;

    let totalNuevo = 0;

    if (packSize > 1) {
        const inpPack = document.getElementById(`inp-pack-${id}`);
        const inpLoose = document.getElementById(`inp-loose-${id}`);
        const cantPacks = inpPack ? parseInt(inpPack.value) || 0 : 0;
        const cantLoose = inpLoose ? parseInt(inpLoose.value) || 0 : 0;
        
        totalNuevo = (cantPacks * packSize) + cantLoose;
    } else {
        const inpSimple = document.getElementById(`inp-simple-${id}`);
        totalNuevo = inpSimple ? parseInt(inpSimple.value) || 0 : 0;
    }

    if (totalNuevo <= 0) {
        remove(id);
    } else {
        item.quantity = totalNuevo; 
        saveCart();
        renderCart(); 
    }
}

function remove(id) {
    cart = cart.filter(x => x.id !== id);
    saveCart();
    renderCart();
}

function toggleCart() {
    const m = document.getElementById('cart-modal'), b = document.getElementById('cart-backdrop'), p = document.getElementById('cart-panel');
    if(m.classList.contains('hidden')) {
        m.classList.remove('hidden'); 
        setTimeout(() => { b.classList.remove('opacity-0'); p.classList.remove('translate-x-full'); }, 10);
        if(typeof analytics !== 'undefined' && analytics) analytics.logEvent('view_cart');
        renderCart();
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
                    if(typeof analytics !== 'undefined' && analytics) analytics.logEvent('scan_qr', { product_id: pid });
                } else {
                    // Si no encuentra el producto (puede ser muy nuevo), borra la caché y obliga a recargar.
                    sessionStorage.removeItem('catalogo_een_data');
                    sessionStorage.removeItem('catalogo_een_time');
                    alert("Nuevo producto detectado. Actualizando el catálogo, espera un momento...");
                    window.location.reload();
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
        if (allProducts.find(p => p.id === pid)) { 
            add(pid); 
            if(document.getElementById('cart-modal').classList.contains('hidden')) toggleCart(); 
            showToast("Producto detectado"); 
        } else {
            // Producto no encontrado. Borramos la caché por si lo acaban de crear en la base de datos.
            sessionStorage.removeItem('catalogo_een_data');
            sessionStorage.removeItem('catalogo_een_time');
            alert("No encontrado en caché local. Actualizando catálogo, vuelve a escanear por favor.");
            window.location.reload();
        }
    }).catch(e => { alert("Error cámara"); document.getElementById('qr-scanner-modal').classList.add('hidden'); });
}

function stopQRScanner() {
    document.getElementById('qr-scanner-modal').classList.add('hidden');
    return html5QrcodeScanner ? html5QrcodeScanner.stop().then(() => { html5QrcodeScanner.clear(); html5QrcodeScanner = null; }) : Promise.resolve();
}

function getRandomPhone() {
    const phones = ['528113728493', '528118400503'];
    return phones[Math.floor(Math.random() * phones.length)];
}

// ======================================================================
// 1. MOTOR TRADUCTOR RECURSIVO
// ======================================================================
function obtenerDesgloseBase(idItem, cantidadMultiplicador, catalogoGlobal, resultado = {}) {
    const item = catalogoGlobal.find(p => p.id === idItem);
    if (!item) return resultado;

    if (item.tipo_item !== 'KIT_FLEXIBLE') {
        const cod = item.codigo_sistema || item.codigo_sistema_oficial || 'SIN-CODIGO';
        if (!resultado[cod]) {
            resultado[cod] = { nombre: item.name || item.nombre_flexible, cantidad: 0 };
        }
        resultado[cod].cantidad += cantidadMultiplicador;
    } 
    else {
        const receta = item.receta || item.receta_desglose;
        if (receta) {
            for (const [compId, compQty] of Object.entries(receta)) {
                obtenerDesgloseBase(compId, cantidadMultiplicador * compQty, catalogoGlobal, resultado);
            }
        } else {
            resultado['ERROR-RECETA'] = { nombre: `[Falta Receta] ${item.name || item.nombre_flexible}`, cantidad: cantidadMultiplicador };
        }
    }
    return resultado;
}


// ======================================================================
// 5. ENVÍO WHATSAPP
// ======================================================================
function sendWhatsApp() {
    if(cart.length === 0) return showToast("Carrito vacío");
    const name = document.getElementById('client-name') ? document.getElementById('client-name').value.trim() : "Cliente";
    let msg = `👋 Hola, soy *${name}*.\nPedido:\n\n`;
    
    if(typeof selectedDelivery !== 'undefined') {
        if(selectedDelivery === 'recoger') {
            msg += `📍 Recoger en Sucursal\n💳 Pago: ${typeof selectedPayment !== 'undefined' ? selectedPayment : 'Por definir'}\n\n`;
        } else if(selectedDelivery === 'local') {
            msg += `🚚 Envío Local\n📍 Dirección: ${document.getElementById('delivery-address') ? document.getElementById('delivery-address').value : 'N/A'}\n💳 Pago: ${typeof selectedPayment !== 'undefined' ? selectedPayment : 'Por definir'}\n\n`;
        } else if(selectedDelivery === 'foraneo') {
            msg += `✈️ Envío Foráneo\n📦 Modalidad: ${typeof isOcurre !== 'undefined' && isOcurre ? 'OCURRE' : 'DOMICILIO'}\n🚛 Fletera: ${document.getElementById('fletera-name') ? document.getElementById('fletera-name').value : 'N/A'}\n💳 Pago: ${typeof selectedPayment !== 'undefined' ? selectedPayment : 'Transferencia'}\n\n`;
        }
    }

    msg += `*🛒 LISTA DE ARTÍCULOS:*\n\n`;

    cart.forEach((item, index) => {
        const prod = allProducts.find(p => p.id === item.id) || item;
        const isBolsas = (prod.category||'').toLowerCase().includes('bolsa');
        const paquetes = prod.paquetes || item.paquetes || [];
        
        let packSize = 1;
        if (paquetes.length > 0) packSize = parseInt(paquetes[0].piezas);
        else if (isBolsas) packSize = 100;
        else packSize = parseInt(prod.piezas) || 0;

        const tipoItem = prod.tipo_item || item.tipo_item || 'PIEZA_BASE';
        const codigoOficial = prod.codigo_sistema || prod.codigo_sistema_oficial || item.codigo_sistema || 'SIN_CODIGO';
        
        const p = Math.floor(item.quantity / packSize);
        const l = item.quantity % packSize;
        let desgloseText = [];
        if(p > 0) desgloseText.push(`📦 ${p} Paq`);
        if(l > 0) desgloseText.push(`🧩 ${l} Sueltas`);
        
        msg += `*${index + 1}. ${item.name}*\n`;
        
        if (tipoItem === 'PIEZA_BASE' || tipoItem === 'KIT_OFICIAL') {
            msg += `🔹 [${codigoOficial}]\n`;
            if(packSize > 1) {
                msg += `📝 Selección: ${desgloseText.join(' | ')} | 🏷️ Total: ${item.quantity} pz\n`;
            } else {
                msg += `📦 Total: ${item.quantity} pz\n`;
            }
        } 
        else if (tipoItem === 'KIT_FLEXIBLE') {
            if(packSize > 1) {
                msg += `📝 Selección: ${desgloseText.join(' | ')} | 🏷️ Total Kits: ${item.quantity}\n`;
            } else {
                msg += `🔢 Total Kits armados: ${item.quantity}\n`;
            }
            
            msg += `   *--- DESGLOSE PARA CAPTURA ---*\n`;
            const desgloseFinal = {};
            obtenerDesgloseBase(prod.id, item.quantity, allProducts, desgloseFinal);
            
            for (const [cod, info] of Object.entries(desgloseFinal)) {
                msg += `   🔸 [${cod}] ${info.nombre}: ${info.cantidad} pz\n`;
            }
        }
        msg += `\n`; 
    });

    const phone = typeof getRandomPhone === 'function' ? getRandomPhone() : "528186933580";
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
    
    if(typeof analytics !== 'undefined' && analytics) analytics.logEvent('generate_lead', { currency: 'MXN', value: 0 });
}

function openGeneralWhatsApp() {
    const phone = getRandomPhone();
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent("Hola, tengo una duda general.")}`, '_blank');
}

function askProduct(id) { 
    const p = allProducts.find(x => x.id === id); 
    const phone = getRandomPhone();
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent("Info sobre: "+p.name)}`, '_blank');
    if(typeof analytics !== 'undefined' && analytics) analytics.logEvent('ask_product', { product_id: id });
}

// === PREFERENCIAS Y PAGOS ===
function loadPrefs() { 
    try { 
        const p = JSON.parse(localStorage.getItem('user_prefs_een')) || {}; 
        if(p.name) document.getElementById('client-name').value = p.name; 
        if(p.deliveryType) setDelivery(p.deliveryType, false); 
    } catch(e){} 
}

function savePrefs() { 
    localStorage.setItem('user_prefs_een', JSON.stringify({ 
        name: document.getElementById('client-name').value, 
        deliveryType: selectedDelivery, 
        paymentMethod: selectedPayment, 
        isOcurre: isOcurre, 
        address: document.getElementById('delivery-address').value, 
        fletera: document.getElementById('fletera-name').value 
    })); 
}

function setDelivery(t, s=true) {
    selectedDelivery = t;
    
    ['recoger','local','foraneo'].forEach(x => {
        const btn = document.getElementById(`btn-${x}`);
        const pnl = document.getElementById(`panel-${x}`);
        if(btn) btn.classList.remove('border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
        if(pnl) pnl.classList.add('hidden');
    });
    
    const actBtn = document.getElementById(`btn-${t}`);
    if(actBtn) actBtn.classList.add('border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
    
    const actPnl = document.getElementById(`panel-${t}`);
    if(actPnl) actPnl.classList.remove('hidden');
    
    const bankInfo = document.getElementById('bank-info');
    if(bankInfo) {
        if (t === 'foraneo') bankInfo.classList.remove('hidden'); 
        else bankInfo.classList.add('hidden');
    }
    if(s) savePrefs();
}

function setPayment(e, m) { 
    selectedPayment = m; 
    
    document.querySelectorAll('.pay-btn').forEach(b => {
        b.classList.remove('border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
    }); 
    
    if (e && e.currentTarget) {
        e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
    }
    
    const bankInfo = document.getElementById('bank-info');
    if(bankInfo) {
        if(m === 'Transferencia' || selectedDelivery === 'foraneo') {
            bankInfo.classList.remove('hidden');
        } else {
            bankInfo.classList.add('hidden');
        }
    }
    savePrefs(); 
}

function setPublicoGeneral() { 
    document.getElementById('client-name').value = "Público General"; 
    savePrefs(); 
}

function setOcurre(v) { 
    isOcurre = v; 
    const btnSi = document.getElementById('btn-ocurre-si');
    const btnNo = document.getElementById('btn-ocurre-no');
    
    if(btnSi && btnNo) {
        btnSi.classList.remove('bg-indigo-600', 'text-white', 'border-transparent', 'shadow-md');
        btnSi.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
        
        btnNo.classList.remove('bg-indigo-600', 'text-white', 'border-transparent', 'shadow-md');
        btnNo.classList.add('bg-white', 'text-slate-600', 'border-slate-200');

        if(v) {
            btnSi.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
            btnSi.classList.add('bg-indigo-600', 'text-white', 'border-transparent', 'shadow-md');
        } else {
            btnNo.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
            btnNo.classList.add('bg-indigo-600', 'text-white', 'border-transparent', 'shadow-md');
        }
    }
    savePrefs(); 
}

// === MOTOR DEL TOUR ===
function startTour() {
    currentTourSteps = [
        {el:'#main-nav', title:'Navegación y Búsqueda', desc:'Usa la barra superior para buscar productos rápidamente o acceder al escáner QR.'},
        {el:'#categories-bar', title:'Categorías', desc:'Filtra el catálogo por familia (Garrafas, Cubetas, Tapas, etc.) para encontrar lo que necesitas.'},
        {el:'#products-container', title:'Catálogo Interactivo', desc:'Toca cualquier imagen para verla en detalle, elige la cantidad y presiona "Agregar".'},
        {el:'#cart-fab', title:'Tu Carrito', desc:'Aquí se guardará tu pedido. ¡Tócalo en cualquier momento para revisar, editar o enviar!'}
    ];
    tourIndex = 0;
    document.getElementById('tour-overlay').style.display = 'block';
    showStep();
}

function startCartTour() {
    const cartPanel = document.getElementById('cart-panel');
    if(cartPanel.classList.contains('translate-x-full')) {
        toggleCart(); 
        setTimeout(() => initiateCartTour(), 400); 
    } else {
        initiateCartTour();
    }
}

function initiateCartTour() {
    currentTourSteps = [
        {el:'#cart-items', title:'Tus Productos', desc:'Revisa lo que agregaste. Puedes sumar paquetes completos o piezas sueltas fácilmente.'},
        {el:'#cart-config', title:'Datos y Envío', desc:'Ingresa tu nombre, elige si recoges en sucursal o necesitas envío (Local/Foráneo) y tu método de pago.'},
        {el:'#btn-send-wa', title:'Enviar Pedido', desc:'Una vez listo, presiona aquí. Se generará un mensaje automático de WhatsApp para que un asesor confirme tu compra.'}
    ];
    tourIndex = 0;
    document.getElementById('tour-overlay').style.display = 'block';
    showStep();
}

function showStep() {
    const step = currentTourSteps[tourIndex];
    const el = document.querySelector(step.el);
    const tooltip = document.getElementById('tour-tooltip');
    
    if(!el || el.offsetParent === null) return nextStep();

    document.querySelectorAll('.tour-highlight, .tour-fix-stacking').forEach(e => {
        e.classList.remove('tour-highlight', 'tour-fix-stacking');
    });

    el.classList.add('tour-highlight');

    let parent = el.parentElement;
    while(parent && parent.tagName !== 'BODY') {
        const style = window.getComputedStyle(parent);
        if(style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflowY === 'hidden' || style.zIndex !== 'auto') {
            parent.classList.add('tour-fix-stacking');
        }
        parent = parent.parentElement;
    }

    el.scrollIntoView({behavior: 'smooth', block: 'center'});

    document.getElementById('tour-title').innerText = step.title;
    document.getElementById('tour-desc').innerText = step.desc;
    
    const iconEl = document.getElementById('tour-step-icon');
    if(iconEl) iconEl.innerText = tourIndex + 1;
    
    const countEl = document.getElementById('tour-step-count');
    if(countEl) countEl.innerText = `Paso ${tourIndex + 1} de ${currentTourSteps.length}`;
    
    const prevBtn = document.getElementById('tour-prev-btn');
    if(prevBtn) prevBtn.style.display = tourIndex > 0 ? 'block' : 'none';
    
    const nextBtn = document.getElementById('tour-next-btn');
    if(nextBtn) nextBtn.innerText = tourIndex === currentTourSteps.length - 1 ? 'Finalizar' : 'Siguiente';

    setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const tooltipHeight = tooltip.offsetHeight || 200;
        const tooltipWidth = tooltip.offsetWidth || 320;

        let top = rect.bottom + 15;
        let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        let showArrowTop = true;

        if (left < 10) left = 10;
        if (left + tooltipWidth > window.innerWidth - 10) left = window.innerWidth - tooltipWidth - 10;

        if (top + tooltipHeight > window.innerHeight - 10) {
            top = rect.top - tooltipHeight - 15;
            showArrowTop = false;

            if (top < 10) {
                top = Math.max(10, (window.innerHeight / 2) - (tooltipHeight / 2));
                showArrowTop = null; 
            }
        }

        const arrow = document.getElementById('tour-arrow');
        if(arrow) {
            arrow.style.display = showArrowTop === null ? 'none' : 'block';
            if(showArrowTop) {
                arrow.style.top = '-8px';
                arrow.style.bottom = 'auto';
            } else if (showArrowTop === false) {
                arrow.style.top = 'auto';
                arrow.style.bottom = '-8px';
            }

            let arrowLeft = (rect.left + rect.width / 2) - left - 8;
            if (arrowLeft < 20) arrowLeft = 20;
            if (arrowLeft > tooltipWidth - 30) arrowLeft = tooltipWidth - 30;
            arrow.style.left = `${arrowLeft}px`;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.display = 'block';
    }, 350); 
}

function nextStep() {
    if(tourIndex < currentTourSteps.length - 1) {
        tourIndex++;
        showStep();
    } else {
        endTour();
    }
}

function prevStep() {
    if(tourIndex > 0) {
        tourIndex--;
        showStep();
    }
}

function endTour() {
    document.getElementById('tour-overlay').style.display = 'none';
    document.getElementById('tour-tooltip').style.display = 'none';
    document.querySelectorAll('.tour-highlight, .tour-fix-stacking').forEach(e => {
        e.classList.remove('tour-highlight', 'tour-fix-stacking');
    });
}

// === UTILIDADES ===
function showToast(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('opacity-0','translate-y-24'); setTimeout(()=>t.classList.add('opacity-0','translate-y-24'),2500); }
function openImage(s) { document.getElementById('lightbox-img').src=s; document.getElementById('lightbox').classList.remove('hidden'); }
function scrollToTop() { window.scrollTo({top:0, behavior:'smooth'}); }
