import React, { useMemo } from 'react';
import { useAdminContext } from '../../context/AdminContext';

export const ImportTable = ({ allItems, facturacionCatalog }) => {
  // 👇 1. Extraemos las funciones para abrir el modal desde el contexto
  const { searchTerm, sortImport, handleSortChange, setEditingProduct, setIsConfigModalOpen } = useAdminContext();

  const pendingToImport = useMemo(() => {
    const existingCodes = new Set(
      allItems
        .map(p => String(p.codigo_sistema_oficial || '').trim().toLowerCase())
        .filter(Boolean)
    );

    let result = facturacionCatalog.filter(fact => {
      const code = String(fact.codigo_sistema_oficial || fact.codigo || fact.Codigo || fact.id || '').trim().toLowerCase();
      return code && !existingCodes.has(code);
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(fact => {
        const code = String(fact.codigo_sistema_oficial || fact.codigo || fact.Codigo || fact.id || '').toLowerCase();
        const name = String(fact.descripcion_oficial || fact.Descripcion_Oficial || fact.descripcion || fact.Descripcion || fact.nombre || fact.Nombre || fact.Articulo || fact.Concepto || fact.producto || '').toLowerCase();
        return code.includes(term) || name.includes(term);
      });
    }

    result.sort((a, b) => {
      const valA = sortImport.key === 'codigo' 
        ? String(a.codigo_sistema_oficial || a.codigo || a.id || '') 
        : String(a.descripcion_oficial || a.nombre || a.descripcion || '');
        
      const valB = sortImport.key === 'codigo' 
        ? String(b.codigo_sistema_oficial || b.codigo || b.id || '') 
        : String(b.descripcion_oficial || b.nombre || b.descripcion || '');
        
      return sortImport.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    });

    return result;
  }, [allItems, facturacionCatalog, searchTerm, sortImport]);

  const SortIcon = ({ columnKey }) => {
    if (sortImport.key !== columnKey) return <i className="fas fa-sort sort-icon ml-1 text-slate-300"></i>;
    return <i className={`fas ${sortImport.desc ? 'fa-sort-down' : 'fa-sort-up'} sort-icon ml-1 text-blue-600`}></i>;
  };

  // 👇 2. FUNCIÓN DE IMPORTACIÓN
  const handleImportClick = (fact) => {
    // Extraemos los valores con los mismos fallbacks que usas en el renderizado
    const code = String(fact.codigo_sistema_oficial || fact.codigo || fact.Codigo || fact.id || ''); 
    const name = String(fact.descripcion_oficial || fact.Descripcion_Oficial || fact.descripcion || fact.Descripcion || fact.nombre || fact.Nombre || fact.Articulo || fact.Concepto || fact.producto || '');

    // Armamos la plantilla con el id en null (para que Firebase sepa que es nuevo)
    // PERO le inyectamos el id_facturacion para que AdminContext lo atrape y lo guarde
    const productTemplate = {
      id: null, 
      id_facturacion: fact.id, // El vínculo vital
      nombre_flexible: name,
      codigo_sistema_oficial: code,
      categoria: '', 
      tipo_item: 'PIEZA_BASE', 
      activo: true,
      imagen_url: ''
    };

    // Mandamos la plantilla al estado y abrimos el modal
    setEditingProduct(productTemplate);
    setIsConfigModalOpen(true);
  };

  return (
    <div className="overflow-y-auto overflow-x-auto flex-1 custom-scroll relative bg-white w-full h-full">
      <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
        <thead className="bg-slate-50/90 backdrop-blur sticky top-0 z-10 text-slate-500 text-[10px] uppercase tracking-wider font-bold shadow-sm">
          <tr>
            <th 
              className="px-6 py-4 border-b border-slate-200 bg-slate-50 w-48 cursor-pointer hover:bg-slate-100 transition-colors" 
              onClick={() => handleSortChange('import', 'codigo')}
            >
              Cód. Sistema <SortIcon columnKey="codigo" />
            </th>
            <th 
              className="px-6 py-4 border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" 
              onClick={() => handleSortChange('import', 'descripcion')}
            >
              Descripción de Facturación <SortIcon columnKey="descripcion" />
            </th>
            <th className="px-6 py-4 border-b border-slate-200 bg-slate-50 text-right w-40">
              Acción
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          
          {pendingToImport.length === 0 ? (
            <tr>
              <td colSpan="3" className="px-6 py-24 text-center text-slate-400 font-bold bg-slate-50/30">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <i className="fas fa-check text-3xl text-emerald-400"></i>
                </div> 
                <p className="text-lg text-slate-600 mb-1">¡Todo al día!</p>
                <p className="text-xs font-medium">Todos los códigos del sistema están importados en la web o no coinciden con tu búsqueda.</p>
              </td>
            </tr>
          ) : (
            pendingToImport.map(fact => {
              const code = String(fact.codigo_sistema_oficial || fact.codigo || fact.Codigo || fact.id || ''); 
              const name = String(fact.descripcion_oficial || fact.Descripcion_Oficial || fact.descripcion || fact.Descripcion || fact.nombre || fact.Nombre || fact.Articulo || fact.Concepto || fact.producto || 'Sin descripción');

              return (
                <tr key={fact.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 font-mono font-black text-slate-700 text-xs border-b border-slate-50/50">
                    {code}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800 text-sm border-b border-slate-50/50 truncate max-w-md">
                    {name}
                  </td>
                  <td className="px-6 py-4 text-right border-b border-slate-50/50">
                    {/* 👇 3. REEMPLAZAMOS EL ALERT POR LA FUNCIÓN */}
                    <button 
                      onClick={() => handleImportClick(fact)}
                      className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-5 py-2.5 rounded-xl transition-all font-bold text-xs shadow-sm flex items-center justify-end gap-2 ml-auto border border-blue-100 group-hover:shadow-md"
                    >
                      Crear Ficha <i className="fas fa-arrow-right"></i>
                    </button>
                  </td>
                </tr>
              );
            })
          )}

        </tbody>
      </table>
    </div>
  );
};