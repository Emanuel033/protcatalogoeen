/**
 * Calcula el stock real de un producto.
 * Nota: Se eliminó el cálculo de 'sombra' (stock_por_fuera) porque ya 
 * se captura todo directo en sistema.
 */
export const getCalculatedStock = (itemId, allItems, visited = new Set()) => {
    if (visited.has(itemId)) return 0;
    visited.add(itemId);
    
    const item = allItems.find(x => x.id === itemId);
    if (!item) return 0;

    if (item.tipo_item !== 'KIT_FLEXIBLE') {
        // Retornamos directo el stock del sistema sin restar sombras
        let stockBase = item.stock_total_piezas || 0;
        return stockBase;
    }

    if (!item.receta_desglose || Object.keys(item.receta_desglose).length === 0) return 0;

    let maxKits = Infinity;
    for (const [compId, requiredQty] of Object.entries(item.receta_desglose)) {
        if (requiredQty <= 0) continue;
        
        // Pasamos allItems en la recursividad
        const compStock = getCalculatedStock(compId, allItems, visited);
        const possibleKits = Math.floor(compStock / requiredQty);
        
        if (possibleKits < maxKits) maxKits = possibleKits;
    }
    
    return maxKits === Infinity ? 0 : maxKits;
};

/**
 * Evalúa si a un producto le falta configuración en el sistema para funcionar en la web.
 * (Pasa idéntico a tu lógica original)
 */
export const isProductPending = (p) => {
    const tipo = p.tipo_item || 'PIEZA_BASE';
    
    if (tipo === 'PIEZA_BASE') {
        return !p.codigo_sistema_oficial || String(p.codigo_sistema_oficial).trim() === '';
    }
    
    if (tipo === 'KIT_FLEXIBLE') {
        if (!p.receta_desglose || Object.keys(p.receta_desglose).length === 0) return true;
        if (!p.hereda_empaques_de) return true; 
    }
    
    if (tipo === 'KIT_OFICIAL') {
        if (!p.codigo_sistema_oficial || String(p.codigo_sistema_oficial).trim() === '') return true;
        if (!p.hereda_empaques_de) return true;
    }
    
    return false;
};