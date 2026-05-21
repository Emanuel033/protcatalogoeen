import React, { useMemo } from 'react';
import Swal from 'sweetalert2'; // 🔥 IMPORTAMOS SWEETALERT
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase'; // Ajusta la ruta a tu firebase
import { useAdminContext } from '../../context/AdminContext';
import { getCalculatedStock, isProductPending } from '../../utils/businessRules';
import massQRPrintService from '../../utils/massQRPrintService';

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

  const isAllSelected = filteredAndSortedItems.length > 0 && selectedItems.length === filteredAndSortedItems.length;
  
  const handleSelectAllClick = (e) => {
    if (e.target.checked) {
      selectAll(filteredAndSortedItems.map(item => item.id));
    } else {
      selectAll([]);
    }
  };

  // =========================================================
  // 🔥 ACCIONES RÁPIDAS DE IMPRESIÓN (PRODUCTO POR PRODUCTO)
  // =========================================================

  // 1. VITRINA (Tienda)
  const handleVitrinaSingle = async (p) => {
    // A. Pedir URL
    const { value: url } = await Swal.fire({
      title: 'Imprimir QR de Tienda (Vitrina)',
      text: 'Revisa o cambia el prefijo para tu app:',
      input: 'text',
      inputValue: 'https://productoseen.web.app/?add=',
      showCancelButton: true,
      confirmButtonText: 'Generar QRs',
      cancelButtonText: 'Cancelar'
    });
    if (!url) return;

    // B. Pedir Cantidad
    const { value: qty } = await Swal.fire({
      title: 'Etiquetas por Producto',
      text: '¿Cuántas etiquetas de ESTE PRODUCTO deseas imprimir?',
      input: 'number',
      inputValue: 1,
      showCancelButton: true,
      confirmButtonText: 'Generar',
      cancelButtonText: 'Cancelar'
    });
    if (!qty || qty <= 0) return;

    // C. Armar datos y lanzar HTML
    const dataArray = [{
      id: `${url}${p.id}`,
      title: p.nombre_flexible || 'S/N',
      sub: `SKU: ${p.id}`
    }];

    const html = massQRPrintService.buildPrintHTML(dataArray, parseInt(qty), false, url, '3x10');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // 2. INVENTARIO (Sueltas)
  const handleInventarioSingle = async (p) => {
    const pType = p.tipo_item || 'PIEZA_BASE';
    if (pType !== 'PIEZA_BASE') {
      Swal.fire('Error', 'Solo las Piezas Base tienen QR de inventario interno.', 'error');
      return;
    }

    const { value: qty } = await Swal.fire({
      title: 'Etiquetas por Producto',
      text: '¿Cuántas etiquetas de ESTE PRODUCTO deseas imprimir?',
      input: 'number',
      inputValue: 1,
      showCancelButton: true,
      confirmButtonText: 'Generar',
      cancelButtonText: 'Cancelar'
    });
    if (!qty || qty <= 0) return;

    const dataArray = [{
      id: p.codigo_sistema_oficial || `INV|${p.id}`,
      title: p.nombre_flexible || 'S/N',
      sub: `Cód: ${p.codigo_sistema_oficial || p.id}`
    }];

    const html = massQRPrintService.buildPrintHTML(dataArray, parseInt(qty), false, '', '3x10');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // 3. PAQUETES (Cajas)
  const handlePaquetesSingle = async (p) => {
    const pType = p.tipo_item || 'PIEZA_BASE';
    if (pType !== 'PIEZA_BASE') {
      Swal.fire('Error', 'Solo Piezas Base tienen paquetes configurados.', 'error');
      return;
    }

    Swal.fire({ title: 'Calculando paquetes...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      // Leer subcolección de Firebase V9
      const paquetesRef = collection(db, 'productos_master', p.id, 'paquetes');
      const snap = await getDocs(paquetesRef);
      
      let packagesList = [];
      snap.forEach(doc => packagesList.push(doc.data()));

      Swal.close();

      if (packagesList.length === 0) {
        Swal.fire('Aviso', 'Este producto no tiene empaques o cajas registradas. Créalas editando la ficha.', 'info');
        return;
      }

      const { value: qty } = await Swal.fire({
        title: 'Etiquetas por Empaque',
        text: `Se encontraron ${packagesList.length} empaques registrados.\n¿Cuántas etiquetas POR EMPAQUE deseas imprimir?`,
        input: 'number',
        inputValue: 1,
        showCancelButton: true,
        confirmButtonText: 'Generar',
        cancelButtonText: 'Cancelar'
      });
      if (!qty || qty <= 0) return;

      const dataArray = packagesList.map(pkg => ({
        id: `PKG|${p.id}|${pkg.sku}|${pkg.piezas}`,
        title: p.nombre_flexible,
        sub: `SKU: ${pkg.sku} (${pkg.piezas} PZ)`
      }));

      const html = massQRPrintService.buildPrintHTML(dataArray, parseInt(qty), true, '', '3x10');
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un problema al cargar los paquetes.', 'error');
    }
  };

  const SortIcon = ({ columnKey }) => {
    if (sortDesglose.key !== columnKey) return <i className="fas fa-sort sort-icon ml-1 text-slate-300"></i>;
    return <i className={`fas ${sortDesglose.desc ? 'fa-sort-down' : 'fa-sort-up'} sort-icon ml-1 text-blue-600`}></i>;
  };

  return (
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
                      
                      {/* ✅ QR VITRINA */}
                      <button 
                        onClick={() => handleVitrinaSingle(p)}
                        className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 hover:bg-purple-100 transition-all shadow-sm flex items-center justify-center" 
                        title="QR Vitrina (Carrito Web)"
                      >
                        <i className="fas fa-store text-xs"></i>
                      </button>
                      
                      {/* ✅ QR INVENTARIO (Sueltas) */}
                      <button 
                        onClick={() => handleInventarioSingle(p)}
                        disabled={pType !== 'PIEZA_BASE'}
                        className={`w-8 h-8 rounded-lg ${pType === 'PIEZA_BASE' ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer' : 'bg-slate-50 text-slate-300 cursor-not-allowed opacity-50'} transition-all shadow-sm flex items-center justify-center`}
                        title="QR Inventario (Sueltas)"
                      >
                        <i className="fas fa-qrcode text-xs"></i>
                      </button>
                      
                      {/* ✅ QR PAQUETES */}
                      <button 
                        onClick={() => handlePaquetesSingle(p)}
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
  );
};
