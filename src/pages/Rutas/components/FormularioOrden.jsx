import React, { useState } from 'react';
import { useLogistica } from '../context/LogisticaContext';

const FormularioOrden = ({ isOpen, onClose, ordenAEditar = null }) => {
  const { clientes } = useLogistica();
  
  // Estados básicos del formulario
  const [folioPedido, setFolioPedido] = useState(ordenAEditar?.folio_pedido || '');
  const [clienteNombre, setClienteNombre] = useState(ordenAEditar?.cliente_nombre || '');
  const [metodoEnvio, setMetodoEnvio] = useState(ordenAEditar?.tipo_envio || 'bodega_cliente');
  const [docs, setDocs] = useState(ordenAEditar?.documentacion || { factura: true, certificados: false, orden_compra: false, envio_ciego: false });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-slate-50 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[98vh] sm:max-h-[90vh]">
        
        {/* Header del Modal */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex justify-between items-center shrink-0 shadow-md z-20">
          <h3 className="text-base sm:text-lg font-black">
            <i className={`fas ${ordenAEditar ? 'fa-edit text-amber-400' : 'fa-box-open text-blue-400'} mr-2`}></i> 
            {ordenAEditar ? 'Editar Orden' : 'Nueva Orden de Entrega'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        {/* Cuerpo del Formulario a 2 Columnas */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Columna Izquierda: Identificadores y Cliente */}
            <div className="space-y-4">
              
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                  <i className="fas fa-hashtag mr-1"></i> Identificadores
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Folio de Pedido</label>
                    <input type="text" value={folioPedido} onChange={e => setFolioPedido(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2.5 focus:border-blue-500 outline-none text-sm font-bold text-slate-800 bg-slate-50" placeholder="Ej. PED-1025" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Folio de Factura</label>
                    <input type="text" className="w-full border border-slate-300 rounded-xl p-2.5 focus:border-emerald-500 outline-none text-sm font-bold text-emerald-800 bg-emerald-50" placeholder="Ej. FAC-A992" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                  <i className="fas fa-user-tag mr-1"></i> Información del Cliente
                </h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Cód. SAP</label>
                    <input type="text" className="w-full border border-slate-300 rounded-xl p-2.5 focus:border-blue-500 outline-none text-sm font-mono font-bold text-slate-800 bg-slate-50" placeholder="C001" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Razón Social / Nombre</label>
                    <input type="text" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2.5 focus:border-blue-500 outline-none text-sm font-bold text-slate-800 bg-slate-50" placeholder="Escribe para buscar..." />
                  </div>
                </div>
              </div>

              {/* Documentos */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                  <i className="fas fa-file-contract mr-1"></i> Documentación a Entregar
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="cursor-pointer flex items-center gap-2 p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50 transition">
                    <input type="checkbox" checked={docs.factura} onChange={e => setDocs({...docs, factura: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-[10px] font-bold text-slate-600"><i className="fas fa-file-invoice"></i> Factura</span>
                  </label>
                  <label className="cursor-pointer flex items-center gap-2 p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-amber-50 transition">
                    <input type="checkbox" checked={docs.certificados} onChange={e => setDocs({...docs, certificados: e.target.checked})} className="rounded text-amber-600 focus:ring-amber-500" />
                    <span className="text-[10px] font-bold text-slate-600"><i className="fas fa-certificate"></i> Certs.</span>
                  </label>
                  <label className="cursor-pointer flex items-center gap-2 p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-200 transition sm:col-span-3">
                    <input type="checkbox" checked={docs.envio_ciego} onChange={e => setDocs({...docs, envio_ciego: e.target.checked})} className="rounded text-slate-800 focus:ring-slate-800" />
                    <span className="text-[10px] font-bold text-slate-600"><i className="fas fa-user-secret"></i> Envío Ciego (Sin Logos)</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Columna Derecha: Destino Físico y Mapa */}
            <div className="space-y-4 flex flex-col h-full">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 shrink-0">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <i className="fas fa-route mr-1"></i> Destino Físico
                  </h4>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-red-50 px-2 py-1 rounded-lg border border-red-100 hover:bg-red-100 transition">
                    <input type="checkbox" className="w-3.5 h-3.5 text-red-500 rounded border-red-300" />
                    <span className="text-[10px] font-black text-red-600 uppercase">Urgente</span>
                  </label>
                </div>
                
                <div className="mb-3">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Método de Envío</label>
                  <select value={metodoEnvio} onChange={e => setMetodoEnvio(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2.5 focus:border-blue-500 outline-none text-sm font-bold text-slate-800 bg-slate-50 cursor-pointer">
                    <option value="bodega_cliente">Reparto Local (Directo a Cliente)</option>
                    <option value="fletera_domicilio">Fletera Foránea (A Domicilio)</option>
                    <option value="fletera_ocurre">Fletera Foránea (Ocurre)</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Dirección Física Exacta</label>
                  <textarea rows="2" className="w-full border border-slate-300 rounded-xl p-2 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800 bg-slate-50 resize-none" placeholder="Calle, Número, Colonia..."></textarea>
                </div>
              </div>

              {/* Contenedor del Minimapa de Leaflet (Se integrará en el siguiente paso) */}
              <div className="bg-slate-200 p-2 rounded-2xl shadow-inner border border-slate-300 flex-1 flex flex-col items-center justify-center min-h-[180px]">
                <i className="fas fa-map-marked-alt text-4xl text-slate-400 mb-2"></i>
                <span className="text-xs font-bold text-slate-500">El mapa se cargará aquí</span>
              </div>
            </div>

          </div>
        </div>
        
        {/* Footer del Formulario */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0 flex gap-3 z-20">
          <button onClick={onClose} className="flex-1 bg-slate-100 border border-slate-200 text-slate-600 font-bold py-3 md:py-3.5 rounded-xl hover:bg-slate-200 transition text-sm">
            Cancelar
          </button>
          <button className="flex-[2] bg-blue-600 text-white font-black py-3 md:py-3.5 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition active:scale-95 text-sm flex items-center justify-center gap-2">
            <i className="fas fa-save"></i> Guardar Logística
          </button>
        </div>

      </div>
    </div>
  );
};

export default FormularioOrden;