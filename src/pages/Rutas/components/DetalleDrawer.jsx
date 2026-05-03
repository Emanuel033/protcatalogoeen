import React, { useState, useEffect } from 'react';
//import { ReactSortable } from "react-sortablejs";

const DetalleDrawer = ({ pedidoSeleccionado, onClose }) => {
  // Estado local para manejar el orden de las paradas (Arrastrar y Soltar)
  const [paradasRuta, setParadasRuta] = useState([]);

  useEffect(() => {
    // Si el pedido tiene un lote o es un camión con varios pedidos, aquí cargarías esa lista.
    // Por ahora simulamos la parada de la planta y el destino del pedido actual.
    if (pedidoSeleccionado) {
      setParadasRuta([
        { id: 'planta', nombre: 'Planta EEN', tipo: 'origen' },
        { id: pedidoSeleccionado.id, nombre: pedidoSeleccionado.cliente_nombre, tipo: 'destino', data: pedidoSeleccionado }
      ]);
    }
  }, [pedidoSeleccionado]);

  const isOpen = Boolean(pedidoSeleccionado);
  if (!isOpen) return null;

  const docs = pedidoSeleccionado?.documentacion || {};

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 z-[35] transition-opacity lg:hidden" onClick={onClose}></div>

      <div className={`fixed bottom-0 lg:top-4 lg:bottom-4 right-0 lg:right-4 w-full lg:w-[380px] h-[75vh] lg:h-[calc(100vh-2rem)] bg-white/95 backdrop-blur-xl lg:rounded-3xl rounded-t-3xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[40] flex flex-col overflow-hidden border border-white/60 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-[120%]'}`}>
        
        {/* Header (Igual a tu HTML) */}
        <div className="bg-slate-900 p-4 shrink-0 relative shadow-md">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition bg-white/10 w-7 h-7 rounded-full flex items-center justify-center">
            <i className="fas fa-times text-xs"></i>
          </button>
          
          <div className="flex justify-between items-start mb-1 pr-8">
            <div className="flex gap-1.5 items-center">
              {pedidoSeleccionado.folio_pedido && (
                <span className="text-[9px] font-mono font-bold text-blue-200 bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                  PED: {pedidoSeleccionado.folio_pedido}
                </span>
              )}
              <button className="text-amber-400 hover:text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-1 ml-1">
                <i className="fas fa-edit"></i> Editar
              </button>
            </div>
          </div>
          
          <h3 className="text-lg font-black text-white leading-tight mt-1 truncate">
            {pedidoSeleccionado.cliente_nombre}
            {pedidoSeleccionado.urgente && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase align-middle ml-2"><i className="fas fa-fire-alt"></i> Urgente</span>}
          </h3>
        </div>

        {/* Contenido (Scroll) */}
        <div className="p-3 overflow-y-auto custom-scroll flex-1 space-y-3 bg-slate-50/50 pb-32">
          
          {/* Info de Entrega */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
            <h4 className="font-black text-[11px] text-slate-800 flex items-center gap-1.5 mb-3">
              <i className="fas fa-map-marked-alt text-blue-500"></i> Info de Entrega
            </h4>
            
            <div className="bg-slate-50 p-2 rounded-lg mb-2 border border-slate-100">
              <span className="font-bold text-xs text-slate-800">{pedidoSeleccionado.destino_alias || 'Destino Físico'}</span>
              <p className="text-[10px] text-slate-600 font-medium leading-snug flex items-start gap-1 mt-1">
                <i className="fas fa-map-marker-alt text-red-500 mt-0.5"></i> {pedidoSeleccionado.direccion}
              </p>
            </div>

            {/* Alerta de CONTPAQi */}
            {pedidoSeleccionado.requiere_cobro && (
              <div className="mt-2 bg-red-50 border border-red-200 p-2.5 rounded-lg flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center animate-pulse">
                    <i className="fas fa-exclamation-triangle text-xs"></i>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-red-700 uppercase tracking-wide">Aviso de Cobranza</span>
                    <span className="text-[8px] text-red-600 font-medium">Adeudo reportado de CONTPAQi</span>
                  </div>
                </div>
                <span className="text-sm font-black text-red-800">
                  ${Number(pedidoSeleccionado.saldo_pendiente || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                </span>
              </div>
            )}

            {/* Documentos */}
            <div className="mt-3 pt-2 border-t border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Entregar con:</p>
              <div className="flex flex-wrap gap-1.5">
                {docs.factura && <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-1 rounded-md border border-blue-200"><i className="fas fa-file-invoice mr-1"></i>Factura</span>}
                {docs.certificados && <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-1 rounded-md border border-amber-200"><i className="fas fa-certificate mr-1"></i>Certificados</span>}
                {docs.envio_ciego && <span className="bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-md border border-slate-700 shadow-sm"><i className="fas fa-user-secret mr-1"></i>Envío Ciego</span>}
                {(!docs.factura && !docs.certificados && !docs.envio_ciego) && <span className="text-[9px] text-slate-400 font-bold">Sin requisitos especiales</span>}
              </div>
            </div>
          </div>

          {/* Secuencia de Ruta con ReactSortable */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm p-3">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-black text-[11px] text-indigo-900 flex items-center gap-1.5">
                <i className="fas fa-route text-indigo-500"></i> Trayecto Estimado
              </h4>
              <button className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold hover:bg-indigo-200 transition">
                <i className="fas fa-magic"></i> Optimizar
              </button>
            </div>

            {/* COMENTA REACT SORTABLE TEMPORALMENTE */}
            {/* <ReactSortable 
              list={paradasRuta} 
              setList={setParadasRuta}
              animation={150}
              handle=".drag-handle"
              ghostClass="opacity-40"
              className="relative"
            > */}
            
            {/* USA ESTE DIV MIENTRAS ESTÁS EN GITHUB */}
            <div className="relative">
              {paradasRuta.map((parada, index) => (
                <div key={parada.id} className="flex items-center gap-1.5 py-1.5 relative border-l-2 border-slate-200 ml-2.5 pl-3 bg-indigo-50">
                  {parada.tipo === 'destino' && (
                    <div className="drag-handle w-4 h-full flex items-center justify-center text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing">
                      <i className="fas fa-grip-vertical"></i>
                    </div>
                  )}
                  <div className={`w-4 h-4 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm shrink-0 ${parada.tipo === 'origen' ? 'bg-slate-900 absolute -left-[11px]' : 'bg-blue-600'}`}>
                    {parada.tipo === 'origen' ? <i className="fas fa-industry"></i> : index}
                  </div>
                  <span className="truncate text-[10px] font-bold text-slate-700">{parada.nombre}</span>
                </div>
              ))}
            </div>
            {/* </ReactSortable> */}
          </div>

        </div>
      </div>
    </>
  );
};

export default DetalleDrawer;