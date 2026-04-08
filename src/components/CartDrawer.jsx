import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import CrossSelling from './CrossSelling'; // ✨ IMPORTAMOS EL NUEVO MOTOR INTELIGENTE

function CartDrawer() {
  const { 
    isCartOpen, toggleCart, carrito, totalPiezas, clearCart,
    agregarAlCarrito, quitarDelCarrito, eliminarProducto,
    deliveryMethod, setDeliveryMethod, paymentMethod, setPaymentMethod,
    sendWhatsApp, sendEmail, productos 
  } = useApp();

  // Estados locales para los datos del cliente
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [fletera, setFletera] = useState('');
  const [ocurre, setOcurre] = useState(true);

  const handleSendWhatsApp = () => {
    sendWhatsApp({ 
      name: clientName, 
      deliveryMethod, 
      paymentMethod, 
      address, 
      fletera, 
      ocurre 
    });
  };

  const handleSendEmail = () => {
    sendEmail({ 
      name: clientName, 
      deliveryMethod, 
      paymentMethod, 
      address, 
      fletera, 
      ocurre 
    });
  };

  return (
    <div className={`fixed inset-0 z-50 ${isCartOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
        onClick={toggleCart}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`} 
      />
      
      <div className={`absolute right-0 top-0 h-full w-full md:w-[480px] bg-slate-50 shadow-2xl flex flex-col transform transition-transform duration-500 ease-out md:rounded-l-[2rem] overflow-hidden ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Encabezado del Carrito */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <i className="fa-solid fa-bag-shopping"></i>
            </div>
            <h2 className="text-xl font-black text-slate-800">Tu Pedido</h2>
          </div>
          <button onClick={toggleCart} className="text-slate-400 hover:text-red-500 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center transition">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        {/* Lista de Productos y Configuración */}
        <div className="flex-1 overflow-y-auto bg-slate-50 relative p-4 space-y-3 custom-scroll">
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 m-4 py-20 fade-in">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300 animate-pulse">
                <i className="fa-solid fa-basket-shopping text-3xl"></i>
              </div>
              <p className="text-sm font-bold text-slate-500">Tu pedido está vacío</p>
            </div>
          ) : (
            <>
              {carrito.map((item) => {
                const prod = productos.find(p => p.id === item.id) || item;
                const isBolsas = (prod.category || '').toLowerCase().includes('bolsa');
                const paquetes = prod.paquetes || [];
                
                let packSize = 1;
                if (paquetes.length > 0) packSize = parseInt(paquetes[0].piezas); 
                else if (isBolsas) packSize = 100; 
                else packSize = parseInt(prod.piezas) || 0;

                const packsCalculados = Math.floor(item.cantidad / packSize);
                const sueltasCalculadas = item.cantidad % packSize;

                return (
                  <div key={item.id} className="flex gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm mb-3 fade-in relative transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-slate-50 p-1 flex items-center justify-center border">
                      <img src={prod.image} alt={prod.name} className="h-full w-full object-contain mix-blend-multiply" onError={(e) => e.target.src='https://via.placeholder.com/60'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{prod.name}</h4>
                        <button onClick={() => eliminarProducto(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><i className="fa-solid fa-trash-can"></i></button>
                      </div>
                      
                      {/* Controles de Cantidad */}
                      {packSize > 1 ? (
                        <div className="flex gap-2 mt-2">
                            <div className="flex-1 flex items-center gap-2 bg-slate-50 border rounded-lg px-2 py-1.5">
                                <i className="fa-solid fa-box text-indigo-500 text-sm"></i>
                                <div className="flex flex-col flex-1">
                                    <label className="text-[9px] uppercase font-bold text-slate-400 leading-none">Paquetes</label>
                                    <div className="flex items-center gap-1 mt-1">
                                      <button onClick={() => { if(packsCalculados > 0) quitarDelCarrito(item.id) }} className="px-1 text-slate-500 hover:text-indigo-600">-</button>
                                      <span className="w-full text-center font-bold text-slate-800 text-sm">{packsCalculados}</span>
                                      <button onClick={() => agregarAlCarrito(prod, packSize)} className="px-1 text-indigo-500 font-bold">+</button>
                                    </div>
                                </div>
                            </div>
                            {!isBolsas && (
                              <div className="flex-1 flex items-center gap-2 bg-slate-50 border rounded-lg px-2 py-1.5">
                                  <i className="fa-solid fa-shapes text-slate-400 text-sm"></i>
                                  <div className="flex flex-col flex-1">
                                      <label className="text-[9px] uppercase font-bold text-slate-400 leading-none">Sueltas</label>
                                      <div className="flex items-center gap-1 mt-1">
                                        <button onClick={() => quitarDelCarrito(item.id)} className="px-1 text-slate-500 hover:text-indigo-600">-</button>
                                        <span className="w-full text-center font-bold text-slate-800 text-sm">{sueltasCalculadas}</span>
                                        <button onClick={() => agregarAlCarrito(prod, 1)} className="px-1 text-indigo-500 font-bold">+</button>
                                      </div>
                                  </div>
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="flex justify-end mt-2">
                          <div className="flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-1.5 w-32">
                            <span className="text-[10px] font-bold text-slate-400">PZAS:</span>
                            <button onClick={() => quitarDelCarrito(item.id)} className="px-1 text-slate-500 font-bold">-</button>
                            <span className="w-full text-center font-bold text-slate-800">{item.cantidad}</span>
                            <button onClick={() => agregarAlCarrito(prod, 1)} className="px-1 text-indigo-500 font-bold">+</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ✨ AQUÍ ES DONDE SUCEDE LA MAGIA: LLAMAMOS AL NUEVO COMPONENTE */}
              <CrossSelling />

            </>
          )}

          {/* Formulario de Checkout */}
          {carrito.length > 0 && (
            <div className="mt-4 p-5 bg-white border border-slate-200 rounded-xl mb-6">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Datos del Cliente</label>
              <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                      <i className="fa-regular fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre completo / Negocio" className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition" />
                  </div>
                  <button onClick={() => setClientName('Público General')} className="text-xs bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 font-bold transition whitespace-nowrap">Público</button>
              </div>

              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Método de Entrega</label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                  <button onClick={() => setDeliveryMethod('recoger')} className={`rounded-xl p-3 text-xs flex flex-col items-center justify-center gap-1.5 transition-all border ${deliveryMethod === 'recoger' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white'}`}>
                      <i className="fa-solid fa-store text-xl"></i> <span className="font-bold">Sucursal</span>
                  </button>
                  <button onClick={() => setDeliveryMethod('local')} className={`rounded-xl p-3 text-xs flex flex-col items-center justify-center gap-1.5 transition-all border ${deliveryMethod === 'local' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white'}`}>
                      <i className="fa-solid fa-motorcycle text-xl"></i> <span className="font-bold">Local</span>
                  </button>
                  <button onClick={() => setDeliveryMethod('foraneo')} className={`rounded-xl p-3 text-xs flex flex-col items-center justify-center gap-1.5 transition-all border ${deliveryMethod === 'foraneo' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white'}`}>
                      <i className="fa-solid fa-truck-plane text-xl"></i> <span className="font-bold">Foráneo</span>
                  </button>
              </div>
              
              {deliveryMethod === 'local' && (
                <input type="text" placeholder="Dirección exacta..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2 border border-orange-200 bg-orange-50/30 rounded-xl text-sm mb-4 outline-none focus:border-orange-400" />
              )}
              {deliveryMethod === 'foraneo' && (
                <div className="mb-4">
                  <input type="text" placeholder="Nombre de la fletera..." value={fletera} onChange={(e) => setFletera(e.target.value)} className="w-full p-2 border border-indigo-200 bg-indigo-50/30 rounded-xl text-sm mb-2 outline-none focus:border-indigo-400" />
                  <div className="flex gap-2">
                    <button onClick={() => setOcurre(true)} className={`flex-1 py-2 rounded border text-xs font-bold ${ocurre ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}>OCURRE</button>
                    <button onClick={() => setOcurre(false)} className={`flex-1 py-2 rounded border text-xs font-bold ${!ocurre ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}>DOMICILIO</button>
                  </div>
                </div>
              )}

              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {['Transferencia', 'Tarjeta', 'Efectivo'].map(met => (
                  <button key={met} onClick={() => setPaymentMethod(met)} className={`py-2 rounded-xl text-xs font-bold border transition ${paymentMethod === met ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    {met}
                  </button>
                ))}
              </div>

              {/* DATOS BANCARIOS */}
              {(paymentMethod === 'Transferencia' || deliveryMethod === 'foraneo') && (
                <div className="mt-4 p-3 bg-slate-800 text-slate-300 rounded-xl text-xs border border-slate-700 relative overflow-hidden transition-all duration-300 opacity-100">
                  <div className="absolute right-0 top-0 p-2 opacity-10"><i className="fa-solid fa-building-columns text-4xl"></i></div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Datos Bancarios</div>
                  <div className="flex justify-between items-center mb-1"><span>BANCO:</span> <span className="text-white font-bold">BANORTE</span></div>
                  <div className="flex justify-between items-center mb-1"><span>CUENTA:</span> <span className="text-white font-mono text-sm">0184214699</span></div>
                  <div className="flex justify-between items-center"><span>CLABE:</span> <span className="text-white font-mono text-sm">072 580 001 842 146 996</span></div>
                  <div className="mt-3 pt-2 border-t border-slate-600 text-[9px] text-slate-400 italic leading-tight">
                    *En breve le mandaremos la prefactura. Favor de enviar comprobante al confirmar su pedido.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer del Carrito */}
        <div className="px-6 py-5 border-t border-slate-200/50 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)] shrink-0 z-20 w-full">
          
          <div className="flex justify-between mb-4 items-end">
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Piezas</span>
            <span id="cart-total" className="text-3xl font-black text-indigo-600 leading-none tracking-tighter">
              {totalPiezas}
            </span>
          </div>
          
          <div className="flex gap-2 relative w-full overflow-hidden">
            <button 
              onClick={() => window.dispatchEvent(new Event('open-qr-scanner'))} 
              className="w-12 h-12 shrink-0 bg-white text-indigo-600 rounded-2xl flex items-center justify-center border-2 border-indigo-50 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm relative p-0"
              title="Escanear QR"
            >
              <i className="fa-solid fa-qrcode text-lg"></i>
              <i className="fa-solid fa-plus absolute top-2 right-2 text-[8px] font-black"></i>
            </button>
            
            <button 
              onClick={handleSendWhatsApp}
              disabled={carrito.length === 0}
              className="flex-1 min-w-0 h-12 shrink-0 bg-gradient-to-r from-green-500 to-emerald-500 disabled:from-slate-300 disabled:to-slate-400 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-2xl shadow-md transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-1 relative overflow-hidden group p-0 px-1"
            >
              <i className="fa-brands fa-whatsapp text-lg shrink-0"></i> 
              <span className="text-xs lg:text-sm truncate">WhatsApp</span>
            </button>

            <button 
              onClick={handleSendEmail}
              disabled={carrito.length === 0}
              className="flex-1 min-w-0 h-12 shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 disabled:from-slate-300 disabled:to-slate-400 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-md transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-1 relative overflow-hidden group p-0 px-1"
            >
              <i className="fa-solid fa-envelope text-lg shrink-0"></i> 
              <span className="text-xs lg:text-sm truncate">Correo</span>
            </button>
          </div>
          
          <div className="text-center mt-3">
            <button onClick={clearCart} className="text-slate-400 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest py-1 transition">
              Vaciar Carrito
            </button>
          </div>
          
        </div>
        
      </div>
    </div>
  );
}

export default CartDrawer;
