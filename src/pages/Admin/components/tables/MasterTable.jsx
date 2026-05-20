import React, { useMemo, useState } from 'react';
import { useAdminContext } from '../../context/AdminContext';
import { getCalculatedStock, isProductPending } from '../../utils/businessRules';
import { printMassiveQRs } from '../../utils/qrPrintService';
import { printAllQRs, printAllPackagesQRs } from '../../utils/massQRPrintService';

export const MasterTable = ({ allItems }) => {
  const { 
    searchTerm, 
    filterType, 
    showOnlyPending, 
    sortDesglose, 
    handleSortChange,
    selectedItems,
    toggleSelection,
    selectAll,
    toggleProductStatus,
    deleteProduct,
    cloneProduct,
    setLightboxImg,
    setIsConfigModalOpen,
    setEditingProduct
  } = useAdminContext();

  // ✅ ESTADO LOCAL para Toast y Modal Vitrina
  const [toast, setToast] = useState(null);
  const [vitrinaUrl, setVitrinaUrl] = useState('https://mi-tienda.com/?add=');
  const [showVitrinaModal, setShowVitrinaModal] = useState(false);

  // ✅ FUNCIONES: showToast y customPrompt (Requeridas por massQRPrintService)
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  const customPrompt = (msg, defaultVal = '') => {
    return new Promise(resolve => {
      const value = prompt(msg, defaultVal);
      resolve(value);
    });
  };

  // 1. FILTRADO REACTIVO
  const filteredAndSortedItems = useMemo(() => {
    let result = allItems.filter(p => {
      const flexName = String(p.nombre_flexible || '').toLowerCase();
      const sysCode = String(p.codigo_sistema_oficial || '').toLowerCase();
      const cat = String(p.categoria || '').toLowerCase();
      const term = searchTerm.toLowerCase().trim();

      const matchSearch = term === '' || flexName.includes(term) || sysCode.includes(term) || cat.includes(term);
      if (!matchSearch) return false;
      if (showOnlyPending && !isProductPending(p)) return false;

      const pType = p.tipo_item || 'PIEZA_BASE';
      if (filterType !== 'ALL' && pType !== filterType) return false;
      
      return true;
    });

    // 2. ORDENAMIENTO
    result.sort((a, b) => {
      let valA, valB;
      
      if (sortDesglose.key === 'nombre_flexible') { 
        valA = a.nombre_flexible || ''; valB = b.nombre_flexible || ''; 
      } else if (sortDesglose.key === 'categoria') { 
        valA = a.categoria || ''; valB = b.categoria || ''; 
      } else if (sortDesglose.key === 'stock') { 
        valA = getCalculatedStock(a.id, allItems); valB = getCalculatedStock(b.id, allItems); 
      } else if (sortDesglose.key === 'codigo_sistema_oficial') { 
        valA = a.codigo_sistema_oficial || ''; valB = b.codigo_sistema_oficial || ''; 
      } else {
        const dateA = a.fecha_creacion?.seconds ? a.fecha_creacion.seconds : 0;
        const dateB = b.fecha_creacion?.seconds ? b.fecha_creacion.seconds : 0;
        return sortDesglose.desc ? dateB - dateA : dateA - dateB;
      }

      if (typeof valA === 'string') {
        return sortDesglose.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      } else {
        return sortDesglose.desc ? valB - valA : valA - valB;
      }
    });

    return result;
  }, [allItems, searchTerm, filterType, showOnlyPending, sortDesglose]);

  // Checkbox maestro
  const isAllSelected = filteredAndSortedItems.length > 0 && selectedItems.length === filteredAndSortedItems.length;
  
  const handleSelectAllClick = (e) => {
    if (e.target.checked) {
      selectAll(filteredAndSortedItems.map(item => item.id));
    } else {
      selectAll([]);
    }
  };

  // ✅ MANEJADORES PARA IMPRESIÓN DE QRs
  const handlePrintInventarioQRs = async () => {
    const filtered = filteredAndSortedItems.filter(p => !p.tipo_item || p.tipo_item === 'PIEZA_BASE');
    if (filtered.length === 0) {
      showToast('Solo Piezas Base tienen QR de inventario', 'error');
      return;
    }
    
    await printAllQRs(
      'inventario',
      allItems,
      isProductPending,
      { searchTerm, filterType, showOnlyPending },
      '',
      showToast,
      customPrompt
    );
  };

  const handlePrintVitrinaQRs = async () => {
    // Abrimos modal para elegir URL
    setShowVitrinaModal(true);
  };

  const confirmPrintVitrina = async () => {
    const filtered = filteredAndSortedItems;
    if (filtered.length === 0) {
      showToast('No hay productos para imprimir', 'error');
      return;
    }

    await printAllQRs(
      'vitrina',
      allItems,
      isProductPending,
      { searchTerm, filterType, showOnlyPending },
      vitrinaUrl,
      showToast,
      customPrompt
    );
    setShowVitrinaModal(false);
  };

  const handlePrintPackageQRs = async (p) => {
    const pType = p.tipo_item || 'PIEZA_BASE';
    if (pType !== 'PIEZA_BASE') {
      showToast('Solo Piezas Base tienen paquetes', 'error');
      return;
    }

    await printAllPackagesQRs(
      allItems,
      isProductPending,
      { searchTerm, filterType, showOnlyPending },
      showToast,
      customPrompt
    );
  };

  // Icon Component para Sort
  const SortIcon = ({ columnKey }) => {
    if (sortDesglose.key !== columnKey) return <i className="fas fa-sort sort-icon ml-1 text-slate-300"></i>;
    return <i className={`fas ${sortDesglose.desc ? 'fa-sort-down' : 'fa-sort-up'} sort-icon ml-1 text-blue-600`}></i>;
  };

  return (
    <>
      <div className="overflow-y-auto overflow-x-auto flex-1 custom-scroll relative bg-white">
        <table className="w-full text-left text-sm whitespace-nowrap min-w-[950px] border-collapse">
          <thead className="bg-slate-50/90 backdrop-blur sticky top-0 z-30 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
            <tr>
              <th className="px-3 py-3 w-10 text-center border-b border-slate-200 bg-slate-50">
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={handleSelectAllClick} 
                  className="cb-modern focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortChange('desglose', 'nombre_flexible')}>
                Producto / Variante <SortIcon columnKey="nombre_flexible" />
              </th>
              <th className="px-3 py-3 border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortChange('desglose', 'categoria')}>
                Categoría <SortIcon columnKey="categoria" />
              </th>
              <th className="px-3 py-3 text-center border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortChange('desglose', 'stock')}>
                Stock Real <SortIcon columnKey="stock" />
              </th>
              <th className="px-3 py-3 border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortChange('desglose', 'codigo_sistema_oficial')}>
                Cód. Sistema Oficial <SortIcon columnKey="codigo_sistema_oficial" />
              </th>
              <th className="px-3 py-3 text-right border-b border-slate-200 bg-slate-50 sticky right-0 z-[30] shadow-[-8px_0_15px_-5px_rgba(0,0,0,0.05)]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-16 text-center text-slate-400 font-bold">
                  <div className="text-4xl mb-3">📭</div> 
                  No se encontraron productos con estos filtros.
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map(p => {
                const pType = p.tipo_item || 'PIEZA_BASE';
                const pending = isProductPending(p);
                const isActivo = p.activo !== false;
                const realStock = getCalculatedStock(p.id, allItems);
                const isSelected = selectedItems.includes(p.id);

                let codTxt = p.codigo_sistema_oficial || '';
                if (pending) {
                  if (!codTxt && pType === 'PIEZA_BASE') codTxt = <span className="text-slate-300 italic text-xs">S/N</span>;
                  else if (!codTxt) codTxt = <span className="text-slate-400 italic text-[10px]">Stock Receta</span>;
                } else if (pType === 'KIT_FLEXIBLE') {
                  if (!codTxt) codTxt = <span className="text-slate-400 italic text-[10px]">Stock Receta</span>;
                }

                const activeRowBg = !isActivo ? 'opacity-75 bg-slate-50/50' : 'hover:bg-slate-50/50';
                const activeStickyBg = !isActivo ? 'bg-slate-50/90' : 'bg-white group-hover:bg-slate-50';
                
                return (
                  <tr key={p.id} className={`transition-colors group ${activeRowBg} ${isSelected ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-3 py-3 text-center border-b border-slate-100">
                      <input 
                        type="checkbox" 
                        className="row-cb cb-modern focus:ring-blue-500 cursor-pointer" 
                        checked={isSelected}
                        onChange={() => toggleSelection(p.id)}
                      />
                    </td>
                    <td className="px-3 py-3 flex items-center gap-4 border-b border-slate-100 min-w-[280px]">
                      <img 
                        src={p.imagen_url || 'https://dummyimage.com/200x200/e2e8f0/0f172a&text=FOTO'} 
                        alt="Img"
                        onClick={() => setLightboxImg(p.imagen_url || 'https://dummyimage.com/200x200/e2e8f0/0f172a&text=FOTO')} 
                        className={`w-10 h-10 object-cover rounded-xl border border-slate-200 bg-white shrink-0 cursor-zoom-in hover:scale-105 transition-transform ${!isActivo ? 'grayscale' : ''}`} 
                      />
                      <div className="min-w-0 pr-2">
                        <p 
                          onClick={() => {
                            setEditingProduct(p);
                            setIsConfigModalOpen(true);
                          }}
                          className={`font-black text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors cursor-pointer ${!isActivo ? 'line-through decoration-slate-300' : ''}`}
                        >
                          {p.nombre_flexible || 'S/N'}
                        </p>
                        
                        {/* Badges */}
                        {pending ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide mt-1.5 inline-flex items-center gap-1">
                            <i className="fas fa-exclamation-circle"></i> Pendiente
                          </span>
                        ) : pType === 'KIT_FLEXIBLE' ? (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide mt-1.5 inline-flex items-center gap-1">
                            <i className="fas fa-network-wired"></i> Kit Web
                          </span>
                        ) : pType === 'KIT_OFICIAL' ? (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide mt-1.5 inline-flex items-center gap-1">
                            <i className="fas fa-boxes"></i> Kit Oficial
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide mt-1.5 inline-flex items-center gap-1">
                            <i className="fas fa-check-circle"></i> Pieza Base
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 border-b border-slate-100">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">{p.categoria || 'N/A'}</span>
                    </td>
                    <td className="px-3 py-3 text-center border-b border-slate-100">
                      <span className={`inline-block bg-slate-50 border border-slate-100 px-2 py-1 rounded-xl font-black ${realStock > 5 ? 'text-blue-600' : 'text-red-500'}`}>
                        {realStock}
                      </span>
                    </td>
                    <td className="px-3 py-3 border-b border-slate-100">
                      <div className="font-mono text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md inline-block border border-slate-100">{codTxt}</div>
                    </td>
                    
                    {/* BOTONES DE ACCIÓN */}
                    <td className={`px-3 py-3 text-right border-b border-slate-100 sticky right-0 ${activeStickyBg} transition-colors shadow-[-8px_0_15px_-5px_rgba(0,0,0,0.05)] z-10 w-[240px]`}>
                      <div className="flex justify-end items-center gap-1.5 flex-wrap w-max ml-auto opacity-80 group-hover:opacity-100 transition-opacity">
                        
                        {/* Ocultar/Mostrar */}
                        <button 
                          onClick={() => toggleProductStatus(p.id, isActivo)} 
                          className={`w-8 h-8 rounded-lg ${isActivo ? 'bg-blue-50 hover:bg-blue-100 border border-blue-100' : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'} transition-all shadow-sm flex items-center justify-center`}
                          title={isActivo ? 'Ocultar de web' : 'Mostrar en web'}
                        >
                          <i className={`fas ${isActivo ? 'fa-eye text-blue-500' : 'fa-eye-slash text-slate-400'} text-xs`}></i>
                        </button>
                        
                        {/* Clonar */}
                        <button 
                          onClick={() => cloneProduct(p)} 
                          className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 transition-all shadow-sm flex items-center justify-center" 
                          title="Clonar Producto"
                        >
                          <i className="fas fa-copy text-xs"></i>
                        </button>
                        
                        <div className="w-px h-5 bg-slate-200 mx-0.5"></div>
                        
                        {/* ✅ QR VITRINA - Abre Modal */}
                        <button 
                          onClick={handlePrintVitrinaQRs}
                          className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 hover:bg-purple-100 transition-all shadow-sm flex items-center justify-center" 
                          title="QR Vitrina (Carrito Web)"
                        >
                          <i className="fas fa-store text-xs"></i>
                        </button>
                        
                        {/* ✅ QR INVENTARIO (Sueltas) */}
                        <button 
                          onClick={handlePrintInventarioQRs}
                          disabled={pType !== 'PIEZA_BASE'}
                          className={`w-8 h-8 rounded-lg ${pType === 'PIEZA_BASE' ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer' : 'bg-slate-50 text-slate-300 cursor-not-allowed opacity-50'} transition-all shadow-sm flex items-center justify-center`}
                          title="QR Inventario (Sueltas)"
                        >
                          <i className="fas fa-qrcode text-xs"></i>
                        </button>
                        
                        {/* ✅ QR PAQUETES */}
                        <button 
                          onClick={() => handlePrintPackageQRs(p)}
                          disabled={pType !== 'PIEZA_BASE'}
                          className={`w-8 h-8 rounded-lg ${pType === 'PIEZA_BASE' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 text-slate-300 cursor-not-allowed opacity-50'} transition-all shadow-sm flex items-center justify-center`}
                          title="QR Paquetes / Cajas"
                        >
                          <i className="fas fa-box-open text-xs"></i>
                        </button>
                        
                        <div className="w-px h-5 bg-slate-200 mx-0.5"></div>
                        
                        {/* Editar */}
                        <button 
                          onClick={() => {
                            setEditingProduct(p);
                            setIsConfigModalOpen(true);
                          }} 
                          className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm flex items-center justify-center" 
                          title="Editar / Configurar"
                        >
                          <i className="fas fa-pen text-xs"></i>
                        </button>
                        
                        {/* Eliminar */}
                        <button 
                          onClick={() => deleteProduct(p.id)} 
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all shadow-sm flex items-center justify-center border border-red-100" 
                          title="Eliminar Producto"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ MODAL PARA CONFIGURAR URL VITRINA */}
      {showVitrinaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" style={{ opacity: 1 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <i className="fas fa-store text-lg"></i>
                </div>
                <div>
                  <h2 className="font-black text-slate-900">QRs Vitrina</h2>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Configurar URL base para carrito</p>
                </div>
              </div>
              <button 
                onClick={() => setShowVitrinaModal(false)} 
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 flex items-center justify-center transition"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            <div className="p-6">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-3">
                URL Base de Vitrina
              </label>
              <input
                type="text"
                value={vitrinaUrl}
                onChange={(e) => setVitrinaUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                placeholder="https://mi-tienda.com/?add="
              />
              <p className="text-[9px] text-slate-500 mt-2 italic">
                El ID del producto se agregará automáticamente al final de esta URL
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setShowVitrinaModal(false)} 
                className="flex-1 py-3 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmPrintVitrina} 
                className="flex-[2] py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 text-sm transition-all"
              >
                Imprimir QRs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-3 ${
          toast.type === 'error' ? 'bg-red-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-green-500'
        }`}>
          <i className={`fas ${
            toast.type === 'error' ? 'fa-exclamation-circle' : 
            toast.type === 'info' ? 'fa-info-circle' : 
            'fa-check-circle'
          }`}></i>
          {toast.msg}
        </div>
      )}
    </>
  );
};
