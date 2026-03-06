window.loadData = async function(forceRefresh = false) {
    const loadingUI = document.getElementById('loadingProducts');
    loadingUI.classList.remove('hidden');
    document.getElementById('productsGrid').classList.add('hidden');

    try {
        try {
            const configDoc = await db.collection('configuracion').doc('pos_settings').get();
            if (configDoc.exists) { window.showInventoryConfig = configDoc.data().mostrar_inventario === true; }
        } catch(e) {}
        if(window.showInventoryConfig) { document.getElementById('inventoryStatusBadge').classList.remove('hidden'); }

        if (!forceRefresh) {
            const cachedData = localStorage.getItem('een_catalog_cache');
            const cacheTime = localStorage.getItem('een_catalog_cache_time');
            if (cachedData && cacheTime && (Date.now() - parseInt(cacheTime) < 43200000)) {
                window.catalogProducts = JSON.parse(cachedData);
                loadingUI.classList.add('hidden');
                document.getElementById('productsGrid').classList.remove('hidden');
                window.resetRenderLimitAndFilter();
                setTimeout(()=> document.getElementById('searchInput').focus(), 500);
                return; 
            }
        }

        if (forceRefresh) window.showToast("Descargando catálogo actualizado...", "info");

        let tempCatalog = {};

        // PASO 1: CARGAR TODO CATALOGO_FACTURACION
        const factSnap = await db.collection('catalogo_facturacion').get();
        if (factSnap.empty) throw new Error("No hay productos en catalogo_facturacion");

        factSnap.forEach(doc => {
            const data = doc.data();
            const codeRaw = data.codigo_sistema_oficial || data.codigo_oficial || data.Codigo_oficial || data.codigo || data.Codigo || data.CODIGO || data['Código'] || data['CÓDIGO'] || data.clave || data.Clave || data.CLAVE || data.sku || data.SKU || data.ItemCode || data.itemCode || doc.id;
            const code = String(codeRaw).trim();
            
            const nombreRaw = data.descripcion_oficial || data.Descripcion_oficial || data.nombre_oficial || data.nombre || data.Nombre || data.descripcion || data.Descripcion || data.DESCRIPCION || data['Descripción'] || data['DESCRIPCIÓN'] || data.concepto || data.Concepto || data.CONCEPTO || data.ItemName || data.itemName || 'Articulo S/N';
            const nombre = String(nombreRaw).trim();
            
            const p = data.precio || data.Precio || data.precio_unitario || data.Precio_unitario || data.PRECIO || data.Price || data.price || data.precio1 || data.Precio1 || 0;
            const cleanP = String(p).replace(/[^0-9.]/g, '');
            const precioParsed = parseFloat(cleanP) || 0;

            tempCatalog[doc.id] = {
                id_facturacion: doc.id,
                codigo: code,
                nombre: nombre,
                precio: precioParsed,
                imagenes: [], 
                empaques_tips: [], 
                stock: 0,
                ids_master_vinculados: [] 
            };
        });

        // PASO 2: BUSCAR APOYOS EN PRODUCTOS_MASTER
        try {
            const masterSnap = await db.collection('productos_master').where('activo', '==', true).get();
            masterSnap.forEach(doc => {
                const data = doc.data();
                const masterCodeRaw = data.codigo_sistema_oficial || data.codigo_oficial || data.codigo || data.codigo_barras || data.sku || data.SKU || '';
                const masterCode = String(masterCodeRaw).trim().toLowerCase();

                if (masterCode) {
                    for (const factId in tempCatalog) {
                        const codigoFacturacionLimpio = String(tempCatalog[factId].codigo).trim().toLowerCase();
                        
                        if (codigoFacturacionLimpio === masterCode) {
                            tempCatalog[factId].ids_master_vinculados.push(doc.id);

                            const imgUrl = data.imagen || data.url_imagen || data.foto || data.imagen_url || null;
                            if (imgUrl && !tempCatalog[factId].imagenes.includes(imgUrl)) {
                                tempCatalog[factId].imagenes.push(imgUrl);
                            }

                            const stockNum = parseFloat(data.inventario_actual || data.stock || data.existencia || 0);
                            tempCatalog[factId].stock += stockNum; 

                            const pb = parseInt(data.piezas_por_caja_original) || 1;
                            if (pb > 1 && !tempCatalog[factId].empaques_tips.includes(pb)) {
                                tempCatalog[factId].empaques_tips.push(pb);
                            }
                        }
                    }
                }
            });
        } catch(e) { console.warn("Aviso: No se pudo cargar el maestro para apoyo visual", e); }

        // PASO 3: BUSCAR PAQUETES
        const promesasPaquetes = [];
        for (const factId in tempCatalog) {
            const idsMaster = tempCatalog[factId].ids_master_vinculados;
            if (idsMaster.length > 0) {
                for (const mId of idsMaster) {
                    promesasPaquetes.push(
                        db.collection('productos_master').doc(mId).collection('paquetes').get().then(pkgs => {
                            pkgs.forEach(pDoc => {
                                const pData = pDoc.data();
                                const pz = parseInt(pData.piezas);
                                if (pz && !tempCatalog[factId].empaques_tips.includes(pz)) {
                                    tempCatalog[factId].empaques_tips.push(pz);
                                }
                            });
                        }).catch(() => {}) 
                    );
                }
            }
        }
        await Promise.all(promesasPaquetes); 

        window.catalogProducts = Object.values(tempCatalog).map(p => {
            p.empaques_tips.sort((a,b) => a - b); 
            p.imagen = p.imagenes.length > 0 ? p.imagenes[0] : null; 
            return p;
        });
        
        window.catalogProducts.sort((a,b) => String(a.nombre).localeCompare(String(b.nombre)));

        try {
            localStorage.setItem('een_catalog_cache', JSON.stringify(window.catalogProducts));
            localStorage.setItem('een_catalog_cache_time', Date.now().toString());
        } catch (e) { console.warn("No se pudo guardar caché (memoria llena)", e); }

        loadingUI.classList.add('hidden');
        document.getElementById('productsGrid').classList.remove('hidden');
        
        window.resetRenderLimitAndFilter();
        if (forceRefresh) window.showToast("Catálogo sincronizado exitosamente");
        setTimeout(()=> document.getElementById('searchInput').focus(), 500); 

    } catch (error) {
        loadingUI.innerHTML = `<i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i><span class='text-red-500 font-bold'>Error al cargar: ${error.message}</span>`;
    }
}

window.resetRenderLimitAndFilter = function() {
    window.currentRenderLimit = 100; 
    window.filterCatalog();
};

window.loadMoreProducts = function() {
    window.currentRenderLimit += 100;
    window.filterCatalog();
};

window.filterCatalog = function() {
    const term = document.getElementById('searchInput').value.toLowerCase().trim();
    const grid = document.getElementById('productsGrid'); 
    grid.innerHTML = '';
    
    const cleanTerm = term.replace(/\s+/g, ' ');

    window.filteredCatalog = window.catalogProducts.filter(p => 
        String(p.nombre).toLowerCase().replace(/\s+/g, ' ').includes(cleanTerm) || 
        String(p.codigo).toLowerCase().replace(/\s+/g, ' ').includes(cleanTerm)
    );
    
    if (window.filteredCatalog.length === 0) { 
        grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 font-bold">No se encontró ningún artículo.</div>`; 
        return; 
    }

    const displayedItems = window.filteredCatalog.slice(0, window.currentRenderLimit);

    displayedItems.forEach(p => {
        let tipsHTML = '';
        if (p.empaques_tips.length > 0) {
            tipsHTML = `<div class="flex flex-wrap gap-1 mt-1.5">`;
            p.empaques_tips.forEach(pz => { tipsHTML += `<span class="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded">📦 Caja: ${pz}</span>`; });
            tipsHTML += `</div>`;
        }

        let inventoryBadge = '';
        if (window.showInventoryConfig) {
            if (p.stock <= 5) { inventoryBadge = `<span class="text-[8px] md:text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200"><i class="fas fa-exclamation-triangle mr-1"></i>${p.stock}</span>`; } 
            else { inventoryBadge = `<span class="text-[8px] md:text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"><i class="fas fa-cubes mr-1"></i>${p.stock}</span>`; }
        }

        const safeName = p.nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let imageBlock = '';
        if (p.imagen) {
            imageBlock = `
                <div class="w-14 h-14 md:w-16 md:h-16 shrink-0 relative group rounded-xl overflow-hidden border border-slate-200" onclick="event.stopPropagation(); window.showImage('${p.imagen}', '${safeName}', '${p.codigo}')">
                    <img src="${p.imagen}" class="w-full h-full object-cover group-hover:scale-110 transition-transform cursor-zoom-in" onerror="this.src='https://placehold.co/100x100/f1f5f9/94a3b8?text=Error'">
                    <div class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-zoom-in"><i class="fas fa-search-plus text-white text-sm md:text-base"></i></div>
                </div>`;
        } else {
            imageBlock = `<div class="w-14 h-14 md:w-16 md:h-16 shrink-0 bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-300"><i class="fas fa-box text-lg md:text-xl mb-1"></i><span class="text-[7px] md:text-[8px] font-bold">S/I</span></div>`;
        }

        const card = document.createElement('div');
        card.className = "bg-white border border-slate-200 p-2.5 md:p-3 rounded-2xl shadow-sm hover:border-blue-300 hover:shadow-md transition cursor-pointer flex gap-2 md:gap-3 fade-in relative overflow-hidden";
        card.onclick = () => window.addToCart(p); // Llama a la funcion global
        
        card.innerHTML = `
            ${imageBlock}
            <div class="flex-1 flex flex-col justify-center min-w-0">
                <div class="flex justify-between items-start mb-1 gap-1">
                    <div class="flex items-center gap-1 overflow-hidden">
                        <span class="font-mono text-[9px] md:text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200 truncate max-w-[70px] md:max-w-[80px]">${p.codigo}</span>
                        ${inventoryBadge}
                    </div>
                    <span class="text-xs md:text-sm font-black text-emerald-600 shrink-0">${window.formatMoney(p.precio)}</span>
                </div>
                <h4 class="font-bold text-slate-800 text-[11px] md:text-[12px] leading-tight flex-1 pb-1 break-words whitespace-normal" title="${p.nombre}">${p.nombre}</h4>
                ${tipsHTML}
            </div>
        `;
        grid.appendChild(card);
    });

    if (window.filteredCatalog.length > window.currentRenderLimit) {
        const hiddenCount = window.filteredCatalog.length - window.currentRenderLimit;
        const loadMoreBtnContainer = document.createElement('div');
        loadMoreBtnContainer.className = "col-span-full flex justify-center mt-4 mb-8";
        loadMoreBtnContainer.innerHTML = `
            <button onclick="window.loadMoreProducts()" class="bg-white border-2 border-slate-200 hover:border-blue-400 text-slate-600 hover:text-blue-600 px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2">
                <i class="fas fa-chevron-down"></i> Cargar ${Math.min(100, hiddenCount)} productos más...
            </button>
        `;
        grid.appendChild(loadMoreBtnContainer);
    }
}
