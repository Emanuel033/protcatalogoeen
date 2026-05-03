import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useLogistica } from '../context/LogisticaContext';

const ModalBitacora = ({ isOpen, onClose }) => {
  const { choferes } = useLogistica();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // ESTADOS PARA EL ORDENAMIENTO
  const [sortConfig, setSortConfig] = useState({ key: 'fecha_actualizacion', direction: 'desc' });

  useEffect(() => {
    if (isOpen) cargarBitacora();
  }, [isOpen]);

  const cargarBitacora = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'rutas_logistica'), orderBy('fecha_actualizacion', 'desc'), limit(150));
      const snap = await getDocs(q);
      setHistorial(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (timestamp) => {
    if (!timestamp) return '--';
    return timestamp.toDate().toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // FUNCIÓN PARA ORDENAR
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // LÓGICA DE FILTRADO Y ORDENAMIENTO
  const datosProcesados = React.useMemo(() => {
    let filtrados = historial.filter(v => 
      (v.folio_pedido && v.folio_pedido.toLowerCase().includes(busqueda.toLowerCase())) || 
      (v.folio_factura && v.folio_factura.toLowerCase().includes(busqueda.toLowerCase())) ||
      (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()))
    );

    return filtrados.sort((a, b) => {
      let valA = a[sortConfig.key] || '';
      let valB = b[sortConfig.key] || '';
      
      // Si son fechas, convertimos para comparar
      if (valA?.toDate) valA = valA.toDate().getTime();
      if (valB?.toDate) valB = valB.toDate().getTime();

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [historial, busqueda, sortConfig]);

  // FUNCIÓN PARA EXPORTAR A EXCEL (CSV)
  const exportToCSV = () => {
    const cabeceras = ['Fecha Creacion', 'Folio Pedido', 'Folio Factura', 'Cliente', 'Direccion', 'Estado', 'Operador'];
    const filas = datosProcesados.map(v => [
      formatearFecha(v.fecha_creacion),
      v.folio_pedido || 'S/N',
      v.folio_factura || 'S/N',
      `"${v.cliente_nombre || ''}"`,
      `"${v.direccion || ''}"`,
      v.estado.toUpperCase(),
      choferes.find(c => c.id === v.chofer_asignado)?.nombre || 'Sin asignar'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [cabeceras.join(","), ...filas.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bitacora_Logistica_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="fas fa-sort text-slate-300 ml-1"></i>;
    return sortConfig.direction === 'asc' ? <i className="fas fa-sort-up text-indigo-500 ml-1"></i> : <i className="fas fa-sort-down text-indigo-500 ml-1"></i>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[120] flex items-center justify-center p-2 sm:p-6 backdrop-blur-md transition-opacity">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        
        <div className="bg-indigo-900 p-5 text-white flex justify-between items-center shrink-0">
          <h3 className="text-lg font-black flex items-center gap-2">
            <i className="fas fa-book text-indigo-300"></i> Bitácora de Logística (Últimos Movimientos)
          </h3>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-3 justify-between items-center shrink-0">
          <div className="relative w-full sm:w-64">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
            <input type="text" placeholder="Buscar folio, cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 font-bold w-full bg-white" />
          </div>
          <button onClick={exportToCSV} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-2">
            <i className="fas fa-file-excel"></i> Exportar a Excel
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll bg-white">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase sticky top-0 z-10 shadow-sm cursor-pointer select-none">
              <tr>
                <th onClick={() => handleSort('fecha_creacion')} className="px-4 py-3 hover:bg-slate-100 transition">Fechas y Lote {getSortIcon('fecha_creacion')}</th>
                <th onClick={() => handleSort('folio_pedido')} className="px-4 py-3 hover:bg-slate-100 transition">Folios {getSortIcon('folio_pedido')}</th>
                <th onClick={() => handleSort('cliente_nombre')} className="px-4 py-3 hover:bg-slate-100 transition">Cliente / Destino {getSortIcon('cliente_nombre')}</th>
                <th onClick={() => handleSort('tipo_envio')} className="px-4 py-3 hover:bg-slate-100 transition">Modalidad {getSortIcon('tipo_envio')}</th>
                <th onClick={() => handleSort('chofer_asignado')} className="px-4 py-3 hover:bg-slate-100 transition">Operador {getSortIcon('chofer_asignado')}</th>
                <th onClick={() => handleSort('estado')} className="px-4 py-3 hover:bg-slate-100 transition text-center">Estado {getSortIcon('estado')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-10 text-slate-400 font-bold"><i className="fas fa-spinner fa-spin mr-2"></i> Cargando historial...</td></tr>
              ) : (
                datosProcesados.map(v => {
                  const nombreChofer = choferes.find(c => c.id === v.chofer_asignado)?.nombre || 'S/N';
                  let stBadge = '';
                  if(v.estado === 'pendiente') stBadge = '<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[9px] font-black">PENDIENTE</span>';
                  else if(v.estado === 'camino') stBadge = '<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[9px] font-black">EN RUTA</span>';
                  else if(v.estado === 'entregado') stBadge = '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[9px] font-black">ENTREGADO</span>';
                  else stBadge = '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-[9px] font-black">FALLA</span>';

                  let tipoTxt = v.tipo_envio === 'fletera_domicilio' ? 'Fletera (Dom)' : v.tipo_envio === 'fletera_ocurre' ? 'Fletera (Ocu)' : 'Local';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="text-[10px] text-slate-500 font-bold mb-0.5">Cap: {formatearFecha(v.fecha_creacion)}</div>
                        <div className="text-[10px] text-blue-600 font-bold mb-0.5"><i className="fas fa-truck text-[9px]"></i> Sal: {formatearFecha(v.fecha_salida)}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">
                        <div>{v.folio_pedido ? 'PED: '+v.folio_pedido : ''}</div>
                        <div className="text-emerald-600">{v.folio_factura ? 'FAC: '+v.folio_factura : ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-xs text-slate-800">{v.cliente_nombre}</div>
                        <div className="text-[9px] text-slate-500 truncate max-w-[200px]" title={v.direccion}>{v.direccion}</div>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-600">{tipoTxt}</td>
                      <td className="px-4 py-3 text-[10px] font-bold text-blue-600"><i className="fas fa-user-circle"></i> {nombreChofer}</td>
                      <td className="px-4 py-3 text-center" dangerouslySetInnerHTML={{__html: stBadge}}></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModalBitacora;