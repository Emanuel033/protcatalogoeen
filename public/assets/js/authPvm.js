window.verificarLogin = function() {
    if (!window.cajeroActual) {
        document.getElementById('loginModal').classList.remove('hidden');
        setTimeout(() => document.getElementById('loginModal').classList.remove('opacity-0'), 10);
    } else {
        document.getElementById('loginModal').classList.add('opacity-0');
        setTimeout(() => document.getElementById('loginModal').classList.add('hidden'), 300);
        document.getElementById('cajero-activo-txt').innerText = window.cajeroActual;
    }
}

window.cargarUsuariosPOS = function() {
    db.collection('usuarios_pos').onSnapshot(snap => {
        const select = document.getElementById('select-usuario-pos');
        select.innerHTML = '<option value="">-- Selecciona tu nombre --</option>';
        window.usuariosCargados = {};
        snap.forEach(doc => {
            const data = doc.data();
            window.usuariosCargados[data.nombre] = data.pin || null;
            select.innerHTML += `<option value="${data.nombre}">${data.nombre}</option>`;
        });
    });
}

window.togglePinField = function() {
    const select = document.getElementById('select-usuario-pos');
    const pinContainer = document.getElementById('pin-container');
    const pinInput = document.getElementById('input-pin-pos');
    
    if (select.value && window.usuariosCargados[select.value]) {
        pinContainer.classList.remove('hidden');
        setTimeout(() => pinInput.focus(), 100);
    } else {
        pinContainer.classList.add('hidden');
        pinInput.value = '';
    }
};

window.iniciarTurnoPOS = function() {
    const select = document.getElementById('select-usuario-pos');
    const pinInput = document.getElementById('input-pin-pos');
    
    if(!select.value) return window.showToast("Debes seleccionar tu nombre", "error");
    
    const expectedPin = window.usuariosCargados[select.value];
    if (expectedPin) {
        if (pinInput.value !== String(expectedPin)) {
            pinInput.value = ''; 
            pinInput.focus();
            return window.showToast("PIN incorrecto", "error");
        }
    }
    
    window.cajeroActual = select.value;
    localStorage.setItem('een_pos_nombre', window.cajeroActual);
    pinInput.value = ''; 
    window.verificarLogin();
};

window.cerrarTurnoPOS = function() {
    const executeCierre = () => {
        localStorage.removeItem('een_pos_nombre');
        window.cajeroActual = null;
        window.cart = [];
        if(typeof window.renderCart === 'function') window.renderCart();
        window.verificarLogin();
    };

    if (window.cart.length > 0) {
        window.showConfirm("Cerrar Turno", "Tienes ventas en curso. ¿Estás seguro de cerrar turno y perderlas?", executeCierre);
    } else {
        executeCierre();
    }
};
