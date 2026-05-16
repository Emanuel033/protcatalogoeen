import React, { useMemo } from 'react';
import { useAdminContext } from '../../context/AdminContext';

export const GroupedTable = ({ allItems, facturacionCatalog }) => {
  const { searchTerm, sortAgrupado, handleSortChange } = useAdminContext();

  // 1. AGRUPAMIENTO, FILTRADO Y ORDENAMIENTO (Reconstrucción de getGroupedInventory)
  const groupedAndSortedData = useMemo(() => {
    const groups = {};
    const term = searchTerm.toLowerCase().trim();

    // A. Agrupar productos por código de sistema
    allItems.forEach(p => {
      const code = String(p.codigo_sistema_oficial || '').trim();
      if (!code) return; // Ignoramos productos sin código oficial para esta vista

      if (!groups[code]) {
        // Buscamos la descripción oficial en el catálogo de facturación
        const fact = facturacionCatalog.find(f => String(f.codigo_sistema_oficial || f.codigo || f.Codigo || f.id) === code);
        
        groups[code] = {
          codigo: code,
          descripcion_oficial: fact ? (fact.descripcion_oficial || fact.Descripcion_Oficial || fact.nombre || fact.Descripcion || 'Sin descripción') : 'Sin descripción oficial',
          variantes: [],
          stock_total: p.stock_total_piezas || 0, // Tomamos el stock físico del sistema
          matchText: `${code} `.toLowerCase() // Texto base para el buscador
        };
      }

      // Agregamos el nombre flexible (la variante web) a la lista
      if (p.nombre_flexible) {
        groups[code].variantes.push(p.nombre_flexible);
        groups[code].matchText += `${p.nombre_flexible} `.toLowerCase();
      }
    });

    // B. Convertir a Array y Filtrar por Búsqueda
    let results = Object.values(groups).map(g => {
      // Completamos el texto de búsqueda con la descripción oficial
      g.matchText += `${g.descripcion_oficial}`.toLowerCase();
      return g;
    });

    if (term) {
      results = results.filter(g => g.matchText.includes(term));
    }

    // C. Ordenamiento
    results.sort((a, b) => {
      let valA = a[sortAgrupado.key];
      let valB = b[sortAgrupado.key];

      if (typeof valA === 'string') {
        return sortAgrupado.desc ? String(valB).localeCompare(String(valA)) : String(valA).localeCompare(String(valB));
      }
      return sortAgrupado.desc ? (valB - valA) : (valA - valB);
    });

    return results;
  }, [allItems, facturacionCatalog, searchTerm, sortAgrupado]);

  // Helper para renderizar los iconos de ordenamiento
  const SortIcon = ({ columnKey }) => {
    if (sortAgrupado.key !== columnKey) return <i className="fas fa-sort sort-icon ml-1 text-slate-300"></i>;
    return <i className={`fas ${sortAgrupado.desc ? 'fa-sort-down' : 'fa-sort-up'} sort-icon ml-1 text-blue-600`}></i>;
  };

  return (
    <div className="overflow-y-auto overflow-x-auto flex-1 custom-scroll bg-white w-full h-full relative">
      <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
        <thead className="bg-slate-50/90 backdrop-blur sticky top-0 z-10 text-slate-500 text-[10px] uppercase tracking-wider font-bold shadow-sm">
          <tr>
            <th 
              className="px-6 py-3 border-b border-slate-200 bg-slate-50 w-40 cursor-pointer hover:bg-slate-100 transition-colors" 
              onClick={() => handleSortChange('agrupado', 'codigo')}
            >
              Cód. Sistema <SortIcon columnKey="codigo" />
            </th>
            <th 
              className="px-6 py-3 border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" 
              onClick={() => handleSortChange('agrupado', 'descripcion_oficial')}
            >
              Descripción Principal / Ligados en Web <SortIcon columnKey="descripcion_oficial" />
            </th>
            <th 
              className="px-6 py-3 text-center border-b border-slate-200 bg-slate-50 w-48 cursor-pointer hover:bg-slate-100 transition-colors" 
              onClick={() => handleSortChange('agrupado', 'stock_total')}
            >
              Total Consolidado <SortIcon columnKey="stock_total" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          
          {groupedAndSortedData.length === 0 ? (
            <tr>
              <td colSpan="3" className="px-6 py-16 text-center text-slate-400 font-bold">
                <div className="text-4xl mb-3">📄</div> 
                No hay coincidencias o no hay códigos registrados.
              </td>
            </tr>
          ) : (
            groupedAndSortedData.map(g => (
              <tr key={g.codigo} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-5 border-b border-slate-100">
                  <div className="font-mono font-black text-slate-800 text-sm bg-slate-100 px-3 py-1.5 rounded-lg inline-block border border-slate-200">
                    {g.codigo}
                  </div>
                </td>
                <td className="px-6 py-5 border-b border-slate-100">
                  <p className="font-bold text-slate-900 text-sm mb-1">{g.descripcion_oficial}</p>
                  <p 
                    className="text-[10px] text-slate-500 font-semibold truncate max-w-sm md:max-w-xl bg-slate-50 px-2 py-1 rounded inline-block" 
                    title={g.variantes.join(', ')}
                  >
                    <i className="fas fa-link text-blue-400 mr-1"></i> Formatos web ligados: {g.variantes.join(', ')}
                  </p>
                </td>
                <td className="px-6 py-5 text-center border-b border-slate-100">
                  <span className="inline-block bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl font-black text-lg shadow-inner min-w-[80px]">
                    {g.stock_total}
                  </span>
                </td>
              </tr>
            ))
          )}

        </tbody>
      </table>
    </div>
  );
};