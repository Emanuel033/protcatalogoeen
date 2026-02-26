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
        loadProducts(); // Llamada a TU BASE DE DATOS REAL (Firebase RTDB)
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
// LÓGICA DE PRODUCTOS (TU CONEXIÓN REAL)
// ==========================================
// ==========================================
// LÓGICA DE PRODUCTOS (CONEXIÓN A FIRESTORE)
// ==========================================
function loadProducts() {
    const container = document.getElementById('products-grid');
    if (container) {
        container.innerHTML = '<div class="col-span-full text-center py-12"><div class="loader mx-auto mb-4"></div><p class="text-slate-500 font-medium">Cargando catálogo y paquetes...</p></div>';
    }

    // Inicializamos Firestore
    const db = firebase.firestore();

    // Leemos la nueva colección maestra, trayendo solo los activos
    db.collection('productos_master')
      .where('activo', '==', true)
      .onSnapshot(async (snapshot) => {
        
        // Usamos un array de promesas para esperar a que bajen todos los paquetes
        const promesasProductos = snapshot.docs.map(async (doc) => {
            const data = doc.data();
            
            // MAPEO DE SUPERVIVENCIA
            const producto = {
                id: doc.id,
                name: data.nombre_flexible || 'Sin nombre',
                category: data.categoria || 'General',
                image: data.imagen_url || 'https://via.placeholder.com/150',
                piezas: data.piezas_por_caja_original || 1, // Esta es la venta unitaria
                stock: data.stock_total_piezas || 0,
                tipo_item: data.tipo_item || 'PIEZA_BASE',
                codigo_sistema: data.codigo_sistema_oficial || null,
                receta: data.receta_desglose || null,
                paquetes: [] // <-- NUEVO: Arreglo vacío para guardar la subcolección
            };

            // Si es una pieza base, vamos a buscar si tiene paquetes
            if (producto.tipo_item === 'PIEZA_BASE') {
                try {
                    const paquetesSnap = await db.collection('productos_master').doc(doc.id).collection('paquetes').get();
                    if (!paquetesSnap.empty) {
                        paquetesSnap.forEach(paqDoc => {
                            producto.paquetes.push({
                                id: paqDoc.id,
                                ...paqDoc.data()
                            });
                        });
                        // Ordenamos los paquetes de menor a mayor piezas
                        producto.paquetes.sort((a, b) => a.piezas - b.piezas);
                    }
                } catch (error) {
                    console.error(`Error cargando paquetes para ${producto.id}:`, error);
                }
            }

            return producto;
        });

        // Esperamos a que TODOS los productos hayan descargado sus paquetes
        allProducts = await Promise.all(promesasProductos);

        // Extraemos los últimos IDs (para tu lógica de la etiqueta "NUEVO")
        latestProductIds = allProducts.slice(-8).map(p => p.id);
        
        // Llamamos a tus funciones originales para pintar la pantalla
        renderCategories();
        applyFilter();
        
    }, (error) => {
        console.error("Error al cargar el catálogo de Firestore:", error);
        if (container) {
            container.innerHTML = '<div class="col-span-full text-center py-12 text-red-500 font-bold"><i class="fas fa-exclamation-triangle text-3xl mb-3"></i><br>Error al cargar el catálogo. Por favor recarga la página.</div>';
        }
    });
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
    return str ? str.replace(/[&<>'"]/g, tag => ({'&': '&amp;','<': '&lt;','>': '&gt;',"'": '&#39;','"': '&quot;'}[tag])) : '';
}

function renderGrid() {
    const cont = document.getElementById('products-container');
    const controls = document.getElementById('pagination-controls');
    if(!cont) return;

    if(filteredProducts.length === 0) {
        const term = document.getElementById('searchInput')?.value || '';
        cont.innerHTML = `
            <div class="col-span-full text-center py-20 fade-in">
                <i class="fa-solid fa-box-open text-5xl text-slate-300 mb-4"></i>
                <h3 class="text-lg font-bold text-slate-700 mb-1">Sin resultados</h3>
                <p class="text-slate-500 font-medium">No encontramos productos ${term ? `para "<span class="font-bold text-slate-800">${escapeHTML(term)}</span>"` : 'en esta categoría'}.</p>
                <button onclick="clearSearch(); filterCat('Todos');" class="mt-6 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-full font-bold text-sm hover:bg-indigo-100 transition">Ver todo el catálogo</button>
            </div>`;
        if(controls) controls.classList.add('hidden');
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredProducts.slice(start, start + itemsPerPage);

    cont.innerHTML = pageItems.map((p, idx) => {
        const isNew = latestProductIds.includes(p.id);
        const paquetes = p.paquetes || [];
        const hasPack = paquetes.length > 0;
        
        // La pieza base (suele ser 1, pero respeta si pusiste otro número en el Master)
        const basePiezas = p.piezas ? parseInt(p.piezas) : 1;
        const minText = `Min: ${basePiezas} pz${basePiezas > 1 ? 's' : ''}`;
        
        // Texto dinámico si tiene paquetes configurados
        const packText = hasPack ? `<span class="text-indigo-600 font-black">Varias opciones</span>` : "";

        // Construcción dinámica del Selector
        let selectorHTML = '';
        if (hasPack) {
            selectorHTML = `<select id="sel-${p.id}" class="w-full text-xs border border-indigo-200 rounded-lg p-1.5 mb-2 bg-indigo-50 text-indigo-700 font-bold outline-none">
                <option value="${basePiezas}|BASE">Individual (${basePiezas} pz)</option>`;
            
            // Recorremos los paquetes bajados de Firestore
            paquetes.forEach(pkg => {
                // Guardamos la cantidad Y el SKU separados por un "|" (pipe)
                selectorHTML += `<option value="${pkg.piezas}|${pkg.sku}">Paquete/Bolsa (${pkg.piezas} pzas)</option>`;
            });
            selectorHTML += `</select>`;
        } else {
            // Si no tiene paquetes, solo mandamos un input oculto
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
// ==========================================
// ==========================================
// 🛒 FUNCIONES MAESTRAS DEL CARRITO (BLINDADAS)
// ==========================================

// 1. Agregar al carrito
window.add = function(id) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;

    const selectElem = document.getElementById(`sel-${id}`);
    let qtyToAdd = 1;
    let skuOficial = prod.codigo_sistema || 'S/N'; 

    if (selectElem && selectElem.value) {
        const valores = selectElem.value.split('|'); 
        qtyToAdd = parseInt(valores[0]) || 1;
        if (valores[1] && valores[1] !== 'BASE') {
            skuOficial = valores[1];
        }
    }

    const existingItem = cart.find(x => x.id === id);
    if (existingItem) {
        existingItem.quantity += qtyToAdd;
        existingItem.sku = skuOficial; 
    } else {
        cart.push({
            id: prod.id, name: prod.name, image: prod.image,
            category: prod.category, piezas: prod.piezas,
            quantity: qtyToAdd, sku: skuOficial
        });
    }
    
    saveCart();
    window.updateCartCount();
    if (typeof window.renderCart === 'function') window.renderCart();
    
    // ==========================================
    // 🎨 ANIMACIÓN INFALIBLE (API Nativa)
    // ==========================================
    try {
        // Animar burbujas
        const badges = document.querySelectorAll('#cart-count, .cart-badge, [id*="cart-count"]');
        badges.forEach(badge => {
            badge.animate([
                { transform: 'scale(1)', backgroundColor: '#ef4444' },     // Rojo original
                { transform: 'scale(1.6)', backgroundColor: '#22c55e' },   // Crece y verde
                { transform: 'scale(1)', backgroundColor: '#ef4444' }      // Vuelve a la normalidad
            ], { duration: 500, easing: 'ease-in-out' });
        });

        // Animar botón flotante
        const floatBtns = document.querySelectorAll('#scroll-top-btn, #cart-btn, [id*="cart-btn"]');
        floatBtns.forEach(btn => {
            btn.animate([
                { transform: 'scale(1)', backgroundColor: '' },
                { transform: 'scale(1.15)', backgroundColor: '#22c55e' },
                { transform: 'scale(1)', backgroundColor: '' }
            ], { duration: 300, easing: 'ease-out' });
        });
    } catch(e) { console.warn("Animación no soportada", e); }

    if (typeof showToast === 'function') showToast('¡Agregado al carrito!');
};

// 2. Eliminar del carrito
window.removeItem = function(id) { 
    cart = cart.filter(x => x.id !== id);
    saveCart();
    window.updateCartCount();
    window.renderCart(); 
};
window.remove = window.removeItem; // Respaldo por si algún botón viejo usa "remove"

// 3. Actualizar cantidades en vivo (SIN parpadear el texto)
window.updateCartItem = function(id) {
    const item = cart.find(x => x.id === id);
    if(!item) return;
    const prod = allProducts.find(p => p.id === id) || item; 
    
    const isBolsas = (prod.category || '').toLowerCase().includes('bolsa');
    const paquetes = prod.paquetes || []; 
    
    let packSize = 1;
    if (paquetes.length > 0) packSize = parseInt(paquetes[0].piezas);
    else if (isBolsas) packSize = 100;
    else packSize = parseInt(prod.piezas) || 0;
    
    if (packSize > 1) {
        const elPack = document.getElementById(`inp-pack-${id}`);
        const elLoose = document.getElementById(`inp-loose-${id}`);
        const packs = elPack ? (parseInt(elPack.value) || 0) : 0;
        const loose = elLoose && !isBolsas ? (parseInt(elLoose.value) || 0) : 0;
        item.quantity = (packs * packSize) + loose;
    } else {
        const elSimple = document.getElementById(`inp-simple-${id}`);
        item.quantity = elSimple ? (parseInt(elSimple.value) || 1) : 1;
    }
    
    if (item.quantity <= 0) {
        window.removeItem(id); // Si es 0, sí borramos la fila entera
    } else {
        saveCart();
        window.updateCartCount(); 
        // ⚡ NOTA: NO llamamos renderCart() aquí para no borrarte el cursor mientras tecleas.
    }
};

// 4. Vaciar Carrito
window.clearCart = function() {
    if (cart.length === 0) return;
    if (confirm('¿Estás seguro de que deseas vaciar el carrito por completo?')) {
        cart = []; 
        saveCart(); 
        window.updateCartCount(); 
        window.renderCart(); 
        if (typeof showToast === 'function') showToast('Carrito vaciado exitosamente');
    }
};

// 5. Actualizar la burbuja roja
window.updateCartCount = function() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('#cart-count, .cart-badge').forEach(el => {
        el.innerText = count;
        if(count > 0) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
};

// 6. Dibujar el interior del carrito
window.renderCart = function() {
    const itemsCont = document.getElementById('cart-items');
    if (!itemsCont) return;

    if (cart.length === 0) {
        itemsCont.innerHTML = `
        <div class="text-center py-10">
            <i class="fa-solid fa-cart-shopping text-4xl text-slate-200 mb-3"></i>
            <h3 class="text-lg font-bold text-slate-800">Carrito vacío</h3>
            <p class="text-xs text-slate-500 mt-1">Agrega productos del catálogo para comenzar</p>
        </div>`;
        const configPanel = document.getElementById('cart-config');
        if (configPanel) configPanel.classList.add('hidden');
        return;
    }

    const configPanel = document.getElementById('cart-config');
    if (configPanel) configPanel.classList.remove('hidden');

    itemsCont.innerHTML = cart.map((item, idx) => {
        const prod = allProducts.find(p => p.id === item.id) || item;
        
        const isBolsas = (prod.category || '').toLowerCase().includes('bolsa');
        const paquetes = prod.paquetes || [];
        
        let packSize = 1;
        if (paquetes.length > 0) packSize = parseInt(paquetes[0].piezas); 
        else if (isBolsas) packSize = 100; 
        else packSize = parseInt(prod.piezas) || 0;
        
        // Cambiamos onchange por oninput para cálculo 100% instantáneo
        let inputsHTML = '';
        if (packSize > 1) {
            inputsHTML = `
            <div class="flex gap-2 mt-2">
                <div class="flex-1 flex items-center gap-2 bg-slate-50 border rounded-lg px-2 py-1.5">
                    <i class="fa-solid fa-box text-indigo-500 text-sm"></i>
                    <div class="flex flex-col flex-1">
                        <label class="text-[9px] uppercase font-bold text-slate-400 leading-none">Paquetes</label>
                        <input type="number" id="inp-pack-${item.id}" value="${Math.floor(item.quantity/packSize)}" min="0" oninput="window.updateCartItem('${item.id}')" class="w-full bg-transparent font-bold text-slate-800 text-sm outline-none">
                    </div>
                </div>
                ${!isBolsas ? `<div class="flex-1 flex items-center gap-2 bg-slate-50 border rounded-lg px-2 py-1.5"><i class="fa-solid fa-shapes text-slate-400 text-sm"></i><div class="flex flex-col flex-1"><label class="text-[9px] uppercase font-bold text-slate-400 leading-none">Pzas Sueltas</label><input type="number" id="inp-loose-${item.id}" value="${item.quantity%packSize}" min="0" oninput="window.updateCartItem('${item.id}')" class="w-full bg-transparent font-bold text-slate-800 text-sm outline-none"></div></div>` : ''}
            </div>`;
        } else {
            inputsHTML = `<div class="flex justify-end mt-2"><div class="flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-1.5 w-32"><span class="text-[10px] font-bold text-slate-400">PZAS:</span><input type="number" id="inp-simple-${item.id}" value="${item.quantity}" min="1" oninput="window.updateCartItem('${item.id}')" class="w-full bg-transparent font-bold text-slate-800 text-center outline-none"></div></div>`;
        }

        return `
        <div class="flex gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm mb-3 relative transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div class="h-16 w-16 shrink-0 rounded-lg bg-slate-50 p-1 flex items-center justify-center border">
                <img src="${item.image}" class="h-full w-full object-contain mix-blend-multiply" onerror="this.src='https://via.placeholder.com/60'">
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start gap-2">
                    <h4 class="text-xs font-bold text-slate-800 leading-snug line-clamp-2">${typeof escapeHTML !== 'undefined' ? escapeHTML(item.name) : item.name}</h4>
                    <button onclick="window.removeItem('${item.id}')" class="text-slate-300 hover:text-red-500 transition-colors p-1"><i class="fa-solid fa-trash-can"></i></button>
                </div>
                ${inputsHTML}
            </div>
        </div>`;
    }).join('');
};
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

function getRandomPhone() {
    const phones = ['528113728493', '528118400503'];
    return phones[Math.floor(Math.random() * phones.length)];
}

function sendWhatsApp() {
    if(cart.length === 0) return showToast("Carrito vacío");
    const name = document.getElementById('client-name').value.trim() || "Cliente";
    let msg = `👋 Hola, soy *${name}*.\nPedido:\n\n`;
    
    if(selectedDelivery === 'recoger') {
        msg += `📍 Recoger en Sucursal\n💳 Pago: ${selectedPayment||'Por definir'}\n`;
    } else if(selectedDelivery === 'local') {
        msg += `🚚 Envío Local\n📍 Dirección: ${document.getElementById('delivery-address').value}\n💳 Pago: ${selectedPayment||'Por definir'}\n`;
    } else if(selectedDelivery === 'foraneo') {
        msg += `✈️ Envío Foráneo\n📦 Modalidad: ${isOcurre ? 'OCURRE' : 'DOMICILIO'}\n🚛 Fletera: ${document.getElementById('fletera-name').value}\n💳 Pago: ${selectedPayment||'Transferencia'}\n`;
    }

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
