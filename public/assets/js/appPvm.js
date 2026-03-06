// ==========================================
// 1. VARIABLES GLOBALES (Compartidas)
// ==========================================
window.cajeroActual = localStorage.getItem('een_pos_nombre') || null;
window.usuariosCargados = {}; 
window.catalogProducts = []; 
window.filteredCatalog = []; 
window.cart = []; 
window.historySales = []; 
window.reporteFacturasEfectivo = []; 
window.reporteFacturasTodas = []; 
window.reporteMostrador = [];        
window.showInventoryConfig = false;
window.currentRenderLimit = 100; 
window.currentTotalToPay = 0;

// ==========================================
// 2. UTILIDADES FINANCIERAS SEGURAS
// ==========================================
window.formatMoney = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
window.toCentavos = (cantidad) => Math.round((parseFloat(cantidad) || 0) * 100);
window.toPesos = (centavos) => centavos / 100;

// ==========================================
// 3. UTILIDADES DE INTERFAZ (UI)
// ==========================================
window.showToast = function(msg, type = 'success') {
    const t = document.getElementById('toast'); t.innerText = msg;
    t.className = `fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl transition-opacity z-[100] font-bold text-sm text-center ${type === 'error' ? 'bg-red-600 text-white' : (type === 'info' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white')}`;
    t.classList.remove('opacity-0'); setTimeout(() => t.classList.add('opacity-0'), 3000);
}

window.showImage = function(url, title, code) {
    document.getElementById('enlargedImg').src = url; document.getElementById('enlargedTitle').innerText = title;
    document.getElementById('enlargedCode').innerText = "CÓDIGO: " + code;
    document.getElementById('imageModal').classList.remove('hidden'); document.getElementById('imageModal').classList.add('flex');
}

window.closeImageModal = function() {
    document.getElementById('imageModal').classList.add('hidden'); document.getElementById('imageModal').classList.remove('flex');
    document.getElementById('enlargedImg').src = "";
}

window.showPrompt = function(title, message, onConfirmCallback) {
    document.getElementById('genericPromptTitle').innerText = title; document.getElementById('genericPromptText').innerText = message;
    const input = document.getElementById('genericPromptInput'); input.value = '';
    const modal = document.getElementById('genericPromptModal'); const box = document.getElementById('genericPromptBox');
    document.getElementById('btnGenericPromptCancel').onclick = () => { box.classList.add('scale-95'); setTimeout(() => modal.classList.add('hidden'), 200); };
    document.getElementById('btnGenericPromptConfirm').onclick = () => {
        const val = input.value.trim(); if(!val) return window.showToast('El motivo es obligatorio', 'error');
        box.classList.add('scale-95'); setTimeout(() => modal.classList.add('hidden'), 200); onConfirmCallback(val);
    };
    modal.classList.remove('hidden'); setTimeout(() => { box.classList.remove('scale-95'); input.focus(); }, 10);
}

window.showConfirm = function(title, message, onAccept) {
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmText').innerText = message;
    const modal = document.getElementById('confirmModal');
    const box = document.getElementById('confirmBox');

    document.getElementById('btnConfirmCancel').onclick = () => {
        box.classList.add('scale-95'); setTimeout(() => modal.classList.add('hidden'), 200);
    };
    document.getElementById('btnConfirmAccept').onclick = () => {
        box.classList.add('scale-95'); setTimeout(() => modal.classList.add('hidden'), 200);
        onAccept();
    };
    modal.classList.remove('hidden'); setTimeout(() => box.classList.remove('scale-95'), 10);
};

window.switchTab = function(tabId) {
    ['pos', 'historial', 'corte'].forEach(t => {
        document.getElementById(`view-${t}`).classList.add('hidden'); document.getElementById(`view-${t}`).classList.remove('flex');
        const btn = document.getElementById(`tab-btn-${t}`);
        if (t === tabId) btn.className = "flex flex-col items-center justify-center py-4 rounded-2xl bg-blue-600 text-white transition-colors shadow-inner";
        else btn.className = "flex flex-col items-center justify-center py-4 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors";
    });
    const view = document.getElementById(`view-${tabId}`);
    view.classList.remove('hidden'); view.classList.add('flex');
    
    // Llamadas a funciones que estarán en otros archivos
    if(tabId === 'historial' && typeof window.loadHistory === 'function') window.loadHistory();
    if(tabId === 'corte' && typeof window.loadTodaySales === 'function') window.loadTodaySales();
}

// ==========================================
// 4. ATAJOS DE TECLADO GLOBALES
// ==========================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'F2') { e.preventDefault(); document.getElementById('searchInput').focus(); }
    if (e.key === 'F9') { e.preventDefault(); if(window.cart.length > 0 && document.getElementById('checkoutModal').classList.contains('hidden')) window.openCheckoutModal(); }
    if (e.key === 'Enter') { if (!document.getElementById('checkoutModal').classList.contains('hidden')) { e.preventDefault(); window.processSale(); } }
    if (e.key === 'Escape') {
        if(typeof window.closeCheckoutModal === 'function') window.closeCheckoutModal(); 
        window.closeImageModal();
        const genericModal = document.getElementById('genericPromptModal');
        if(!genericModal.classList.contains('hidden')) document.getElementById('btnGenericPromptCancel').click();
    }
});

// ==========================================
// 5. INICIALIZACIÓN AL CARGAR LA PÁGINA
// ==========================================
window.onload = () => { 
    if(typeof window.verificarLogin === 'function') window.verificarLogin(); 
    if(typeof window.cargarUsuariosPOS === 'function') window.cargarUsuariosPOS(); 
    if(typeof window.loadData === 'function') window.loadData(); 
    if(typeof window.initCorteUI === 'function') window.initCorteUI(); 
};
