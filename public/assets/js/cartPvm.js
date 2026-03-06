window.addToCart = function(product) {
    console.log("Intentando agregar al carrito:", product); // Depuración
    const existing = window.cart.find(x => x.id_facturacion === product.id_facturacion);
    if (existing) {
        existing.qty += 1; 
    } else {
        // Aseguramos que el precio sea estrictamente numérico al entrar
        const precioSeguro = parseFloat(product.precio) || 0;
        window.cart.push({ ...product, precio: precioSeguro, qty: 1 });
    }
    window.renderCart(); 
    try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play(); } catch(e){}
}

window.updateCartQty = function(index, change) {
    if (window.cart[index]) { 
        window.cart[index].qty += change; 
        if (window.cart[index].qty <= 0) window.cart.splice(index, 1); 
        window.renderCart(); 
    }
}

window.clearCart = function() {
    if(window.cart.length === 0) return; 
    window.showConfirm("Limpiar Ticket", "¿Estás seguro de que deseas eliminar todos los productos del ticket actual?", () => {
        window.cart = []; 
        window.renderCart(); 
        document.getElementById('searchInput').focus();
    });
}

window.renderCart = function() {
    const container = document.getElementById('cartItems'); 
    const btnPreparar = document.getElementById('btnPrepararCobro');
    
    if (window.cart.length === 0) {
        container.innerHTML = `<div class="text-center py-10 md:py-20 text-slate-300 font-medium text-xs md:text-sm flex flex-col items-center"><i class="fas fa-shopping-basket text-3xl md:text-4xl mb-3 opacity-50"></i>Ticket vacío.</div>`;
        document.getElementById('cartSubtotal').innerText = "$0.00";
        document.getElementById('cartIva').innerText = "$0.00";
        document.getElementById('cartTotal').innerText = "$0.00"; 
        btnPreparar.disabled = true; 
        btnPreparar.classList.add('opacity-50', 'cursor-not-allowed'); 
        return;
    }

    btnPreparar.disabled = false; 
    btnPreparar.classList.remove('opacity-50', 'cursor-not-allowed');
    container.innerHTML = ''; 
    
    let subtotalCentavos = 0;

    window.cart.forEach((item, index) => {
        // Blindaje matemático
        const precioSeguro = parseFloat(item.precio) || 0;
        const qtySegura = parseInt(item.qty) || 1;
        
        const itemSubtotalCentavos = window.toCentavos(precioSeguro) * qtySegura; 
        subtotalCentavos += itemSubtotalCentavos;
        
        container.innerHTML += `
            <div class="bg-slate-50 border border-slate-100 p-2 md:p-3 rounded-xl flex flex-col relative animate-[fadeIn_0.2s_ease-out]">
                <div class="flex justify-between items-start mb-2">
                    <div class="pr-6"><h5 class="text-[11px] md:text-xs font-bold text-slate-800 leading-tight break-words whitespace-normal">${item.nombre}</h5><span class="text-[8px] md:text-[9px] font-mono text-slate-400">${item.codigo}</span></div>
                    <button onclick="window.updateCartQty(${index}, -${qtySegura})" class="absolute top-1.5 md:top-2 right-1.5 md:right-2 text-slate-300 hover:text-red-500"><i class="fas fa-times text-sm"></i></button>
                </div>
                <div class="flex justify-between items-end mt-auto">
                    <div class="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                        <button onclick="window.updateCartQty(${index}, -1)" class="w-6 h-6 md:w-7 md:h-7 text-slate-500 hover:text-red-500 font-bold text-sm transition-colors">-</button>
                        <input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" spellcheck="false" value="${qtySegura}" 
                               oninput="this.value = this.value.replace(/[^0-9]/g, ''); window.manualCartQtyVisual(${index}, this.value, this)" 
                               onblur="window.manualCartQtyBlur(${index}, this.value)" 
                               class="w-10 md:w-12 text-center font-black text-xs md:text-sm text-slate-800 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none p-1 mx-1 transition-all">
                        <button onclick="window.updateCartQty(${index}, 1)" class="w-6 h-6 md:w-7 md:h-7 text-slate-500 hover:text-blue-500 font-bold text-sm transition-colors">+</button>
                    </div>
                    <div class="text-right">
                        <div class="text-[8px] md:text-[9px] text-slate-400 font-bold">${window.formatMoney(precioSeguro)} c/u</div>
                        <div class="item-subtotal text-xs md:text-sm font-black text-slate-800">${window.formatMoney(window.toPesos(itemSubtotalCentavos))}</div>
                    </div>
                </div>
            </div>`;
    });
    
    const ivaCentavos = Math.round(subtotalCentavos * 0.16);
    const totalCentavos = subtotalCentavos + ivaCentavos;
    
    document.getElementById('cartSubtotal').innerText = window.formatMoney(window.toPesos(subtotalCentavos));
    document.getElementById('cartIva').innerText = window.formatMoney(window.toPesos(ivaCentavos));
    document.getElementById('cartTotal').innerText = window.formatMoney(window.toPesos(totalCentavos));
}

window.manualCartQtyVisual = function(index, val, el) {
    let num = parseInt(val);
    if (isNaN(num) || num < 0) return; 
    window.cart[index].qty = num;
    
    const precioSeguro = parseFloat(window.cart[index].precio) || 0;
    const itemSubtotalCentavos = window.toCentavos(precioSeguro) * num;
    const itemRow = el.closest('div.bg-slate-50');
    itemRow.querySelector('.item-subtotal').innerText = window.formatMoney(window.toPesos(itemSubtotalCentavos));

    let subtotalCentavos = 0;
    window.cart.forEach(x => {
        const p = parseFloat(x.precio) || 0;
        const q = parseInt(x.qty) || 1;
        subtotalCentavos += (window.toCentavos(p) * q);
    });
    
    const ivaCentavos = Math.round(subtotalCentavos * 0.16);
    const totalCentavos = subtotalCentavos + ivaCentavos;
    
    document.getElementById('cartSubtotal').innerText = window.formatMoney(window.toPesos(subtotalCentavos));
    document.getElementById('cartIva').innerText = window.formatMoney(window.toPesos(ivaCentavos));
    document.getElementById('cartTotal').innerText = window.formatMoney(window.toPesos(totalCentavos));
};

window.manualCartQtyBlur = function(index, val) {
    let num = parseInt(val);
    if(isNaN(num) || num < 1) num = 1; 
    window.cart[index].qty = num;
    window.renderCart(); 
};

window.openCheckoutModal = function() {
    if (window.cart.length === 0) return;
    let subtotalCentavos = 0;
    window.cart.forEach(item => { 
        const p = parseFloat(item.precio) || 0;
        const q = parseInt(item.qty) || 1;
        subtotalCentavos += window.toCentavos(p) * q; 
    });
    
    const ivaCentavos = Math.round(subtotalCentavos * 0.16);
    const totalCentavos = subtotalCentavos + ivaCentavos;
    
    window.currentTotalToPay = window.toPesos(totalCentavos); 
    
    document.getElementById('checkoutSubtotalDisplay').innerText = window.formatMoney(window.toPesos(subtotalCentavos));
    document.getElementById('checkoutIvaDisplay').innerText = window.formatMoney(window.toPesos(ivaCentavos));
    document.getElementById('checkoutTotalDisplay').innerText = window.formatMoney(window.currentTotalToPay);
    document.getElementById('inputEfectivoRecibido').value = '';
    document.getElementById('checkoutCambioDisplay').innerText = "$0.00";
    document.getElementById('checkoutCambioDisplay').className = "text-3xl md:text-4xl font-black text-slate-300";
    
    const modal = document.getElementById('checkoutModal'); const box = document.getElementById('checkoutBox');
    modal.classList.remove('hidden');
    setTimeout(() => { box.classList.remove('scale-95'); document.getElementById('inputEfectivoRecibido').focus(); }, 10);
}

window.closeCheckoutModal = function() {
    const modal = document.getElementById('checkoutModal'); const box = document.getElementById('checkoutBox');
    box.classList.add('scale-95'); setTimeout(() => modal.classList.add('hidden'), 200);
}

window.calculateChange = function() {
    const recibidoPesos = parseFloat(document.getElementById('inputEfectivoRecibido').value) || 0;
    const display = document.getElementById('checkoutCambioDisplay');
    if (recibidoPesos === 0) { display.innerText = "$0.00"; display.className = "text-3xl md:text-4xl font-black text-slate-300"; return; }
    
    const recibidoCentavos = window.toCentavos(recibidoPesos);
    const aPagarCentavos = window.toCentavos(window.currentTotalToPay);
    const cambioCentavos = recibidoCentavos - aPagarCentavos;
    
    display.innerText = window.formatMoney(window.toPesos(cambioCentavos));
    if (cambioCentavos < 0) { display.className = "text-3xl md:text-4xl font-black text-red-500"; } 
    else { display.className = "text-3xl md:text-4xl font-black text-blue-600"; }
}

window.setQuickPay = function(amount) {
    const input = document.getElementById('inputEfectivoRecibido');
    if (amount === 'exact') { input.value = Math.round(window.currentTotalToPay); } 
    else { input.value = amount; }
    window.calculateChange(); 
    document.getElementById('btnConfirmarVentaFinal').focus();
};

window.processSale = async function() {
    if (window.cart.length === 0) return;
    const btnFinal = document.getElementById('btnConfirmarVentaFinal'); 
    if (btnFinal.disabled) return; 

    if (!navigator.onLine) {
        window.showToast("Estás sin conexión a internet.", "error");
        return;
    }

    const inputRecibido = document.getElementById('inputEfectivoRecibido').value;
    let recibido = parseFloat(inputRecibido) || 0;
    let total = Number(window.currentTotalToPay) || 0;

    if (recibido > 0 && recibido < total) { window.showToast("El dinero recibido es menor al total", "error"); return; }

    btnFinal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...'; 
    btnFinal.disabled = true;

    const articulosLimpios = window.cart.map(i => {
        let p = parseFloat(i.precio) || 0;
        let q = parseInt(i.qty) || 1;
        return { 
            codigo: String(i.codigo || 'S/C'), 
            nombre: String(i.nombre || 'Art.'), 
            precio_unitario: p, 
            cantidad: q, 
            subtotal: p * q
        };
    });

    let cambio = recibido > 0 ? (recibido - total) : 0;
    let folio = "MOST-TEMP";

    try {
        const counterRef = db.collection('configuracion').doc('consecutivos');
        const newSaleRef = db.collection('ventas_mostrador').doc(); 

        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(counterRef); 
            let newSeq = 1;
            if (doc.exists && doc.data().venta_mostrador) { newSeq = doc.data().venta_mostrador + 1; }
            folio = "MOST-" + String(newSeq).padStart(5, '0');

            const saleData = {
                folio: folio, 
                fecha: firebase.firestore.FieldValue.serverTimestamp(), 
                total: total,
                efectivo_recibido: recibido > 0 ? recibido : total, 
                cambio_entregado: cambio,
                articulos: articulosLimpios,
                vendedor: window.cajeroActual || "Mostrador General", 
                estado: "COMPLETADA"
            };

            transaction.set(counterRef, { venta_mostrador: newSeq }, { merge: true }); 
            transaction.set(newSaleRef, saleData); 
        });
        
        const printData = {
            folio: folio, fecha: new Date(), total: total, efectivo_recibido: recibido > 0 ? recibido : total,
            cambio_entregado: cambio, articulos: articulosLimpios, vendedor: window.cajeroActual || "Mostrador General" 
        };

        window.closeCheckoutModal(); 
        window.showToast(`Venta registrada: ${folio}`);
        window.cart = []; 
        window.renderCart(); 

        if(document.getElementById('view-historial').classList.contains('flex') && typeof window.loadHistory === 'function') window.loadHistory();
        if(document.getElementById('view-corte').classList.contains('flex') && typeof window.loadTodaySales === 'function') window.loadTodaySales();

        window.printTicketHTML(printData);
        setTimeout(() => document.getElementById('searchInput').focus(), 500);

    } catch (error) { 
        console.error("Error crítico de Firebase:", error); 
        window.showToast("Ocurrió un error: " + error.message, "error"); 
    } finally {
        btnFinal.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar'; 
        btnFinal.disabled = false;
    }
}

window.printTicketHTML = function(venta) {
    // La impresión no requirió ajustes lógicos
    const printArea = document.getElementById('print-ticket');
    let fechaObj = new Date();
    if (venta.fecha && typeof venta.fecha.toDate === 'function') fechaObj = venta.fecha.toDate();
    const fechaStr = fechaObj.toLocaleDateString('es-MX'); 
    const horaStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const total = Number(venta.total) || 0; 
    const subtotal = total / 1.16; 
    const iva = total - subtotal;
    const copies = [ { title: 'COPIA 1 - ALMACÉN', signType: 'warehouse' }, { title: 'COPIA 2 - FIRMA', signType: 'client' }, { title: 'COPIA 3 - CLIENTE', signType: 'none' } ];
    
    let html = '';
    copies.forEach((copy) => {
        html += `<div class="ticket-copy"><div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; font-family: 'Courier New', Courier, monospace;"><div style="width: 65%; display: flex; gap: 8px; align-items: flex-start;"><img src="https://i.ibb.co/dJr7BzL5/logoeen.png" style="height: 45px; width: auto; max-width: 80px; object-fit: contain; margin-top: 2px;"><div><h2 style="margin:0; font-size: 12px; font-weight: 900; line-height: 1.1;">ENVASES LA ECONÓMICA DEL NORTE</h2><p style="margin:4px 0 0 0; font-size: 9px; line-height: 1.2;">Calzada Guadalupe Victoria 105 Oriente,<br>Col. Obrerista, Monterrey, N.L. C.P. 64470</p></div></div><div style="width: 35%; text-align: right;"><h3 style="margin:0 0 5px 0; font-size: 11px; font-weight: bold; padding: 4px; border: 2px solid #000; display: inline-block;">${copy.title}</h3><p style="margin:2px 0; font-size: 11px; font-weight: bold;">VENTA MOSTRADOR</p><p style="margin:2px 0; font-size: 10px; font-weight: bold;">Folio: ${venta.folio}</p><p style="margin:2px 0; font-size: 10px;">${fechaStr} - ${horaStr}</p><p style="margin:2px 0; font-size: 9px; font-weight: bold;">Cajero: ${venta.vendedor || 'General'}</p></div></div><table style="width: 100%; font-size: 11px; margin-bottom: 5px; font-family: 'Courier New', Courier, monospace; border-collapse: collapse;"><tr><th style="text-align:left; border-bottom: 1px solid #000; padding-bottom: 4px; width: 12%;">Cant</th><th style="text-align:left; border-bottom: 1px solid #000; padding-bottom: 4px; width: 48%;">Cód / Descripción</th><th style="text-align:right; border-bottom: 1px solid #000; padding-bottom: 4px; width: 20%;">P.U.</th><th style="text-align:right; border-bottom: 1px solid #000; padding-bottom: 4px; width: 20%;">Total</th></tr>`;
        (venta.articulos || []).forEach(item => { html += `<tr><td style="vertical-align: top; padding-top: 4px; font-weight: bold;">${item.cantidad}x</td><td style="vertical-align: top; padding-top: 4px; padding-right: 4px;"><b>${item.codigo}</b><br>${item.nombre}</td><td style="vertical-align: top; padding-top: 4px; text-align:right;">${window.formatMoney(item.precio_unitario)}</td><td style="vertical-align: top; padding-top: 4px; text-align:right; font-weight:bold;">${window.formatMoney(item.subtotal)}</td></tr>`; });
        let infoPago = ''; if(venta.efectivo_recibido) { infoPago = `<div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; margin-top: 4px; padding-top: 4px; color: #555;"><span style="font-size: 10px;">Efectivo Recibido:</span> <span style="font-size: 10px;">${window.formatMoney(venta.efectivo_recibido)}</span></div><div style="display: flex; justify-content: space-between; color: #555;"><span style="font-size: 10px;">Cambio Entregado:</span> <span style="font-size: 10px;">${window.formatMoney(venta.cambio_entregado || 0)}</span></div>`; }
        html += `</table><div style="border-top: 1px solid #000; padding-top: 8px; font-family: 'Courier New', Courier, monospace; font-size: 11px; display: flex; justify-content: flex-end;"><div style="text-align: right; width: 200px;"><div style="display: flex; justify-content: space-between;"><span style="color: #666;">Subtotal:</span> <span>${window.formatMoney(subtotal)}</span></div><div style="display: flex; justify-content: space-between;"><span style="color: #666;">IVA (16%):</span> <span>${window.formatMoney(iva)}</span></div><div style="display: flex; justify-content: space-between; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; font-weight: 900; font-size: 13px;"><span>TOTAL:</span> <span>${window.formatMoney(venta.total)}</span></div>${infoPago}</div></div>`;
        if (copy.signType === 'client') { html += `<div style="margin-top: 30px; margin-bottom: 10px; text-align: center; width: 100%; font-family: 'Courier New', Courier, monospace;"><div style="border-top: 1px solid #000; width: 70%; margin: 0 auto; padding-top: 8px; font-weight: bold; font-size: 11px;">Nombre y Firma de Recibido / Conformidad</div></div>`; } else if (copy.signType === 'warehouse') { html += `<div style="margin-top: 30px; margin-bottom: 10px; display: flex; justify-content: space-between; width: 100%; font-family: 'Courier New', Courier, monospace;"><div style="text-align: center; width: 45%;"><div style="border-top: 1px solid #000; padding-top: 8px; font-weight: bold; font-size: 11px;">Surtió</div></div><div style="text-align: center; width: 45%;"><div style="border-top: 1px solid #000; padding-top: 8px; font-weight: bold; font-size: 11px;">Revisó</div></div></div>`; } else { html += `<div style="margin-top: 10px;"></div>`; }
        html += `<div style="margin-top: 10px; text-align: center; font-family: 'Courier New', Courier, monospace; font-size: 9px; line-height: 1.4; border-top: 1px dashed #000; padding-top: 10px; color: #111;"><div style="font-weight: bold; font-size: 10px;">TELÉFONOS OFICINA</div><div>81 8375 4630 &bull; 81 8372 8736 &bull; 81 8374 6703 &bull; 81 8375 1518</div><div style="font-weight: bold; font-size: 10px; margin-top: 5px;">WHATSAPP VENTAS</div><div>81 1372 8493 &bull; 81 1840 0503</div><div style="margin-top: 5px;"><b>Correo:</b> ventas@laeconomicamty.com</div><div style="margin-top: 12px; font-weight: bold; font-size: 11px;">¡GRACIAS POR SU PREFERENCIA!</div></div></div>`;
    });
    
    printArea.innerHTML = html; 
    requestAnimationFrame(() => { requestAnimationFrame(() => { try { window.print(); } catch(e) {} }); });
}
