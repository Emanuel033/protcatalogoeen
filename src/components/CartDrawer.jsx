import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

function CartDrawer() {
  const { 
    isCartOpen, toggleCart, carrito, totalPiezas, clearCart,
    agregarAlCarrito, quitarDelCarrito, eliminarProducto,
    deliveryMethod, setDeliveryMethod, paymentMethod, setPaymentMethod,
    sendWhatsApp, sendEmail, productos // <-- Se importó sendEmail
  } = useApp();

  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [fletera, setFletera] = useState('');
  const [ocurre, setOcurre] = useState(true);

  const handleSendWhatsApp = () => {
    sendWhatsApp({ name: clientName, address, fletera, ocurre });
  };

  const handleSendEmail = () => {
    sendEmail({ name: clientName, address, fletera, ocurre });
  };

  // ... (Todo el contenido intermedio del drawer, items y formulario se queda exactamente igual) ...

  return (
    <div className={`fixed inset-0 z-50 ${isCartOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
        onClick={toggleCart}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`} 
      />
      
      <div className={`absolute right-0 top-0 h-full w-full md:w-[480px] bg-slate-50 shadow-2xl flex flex-col transform transition-transform duration-500 ease-out md:rounded-l-[2rem] overflow-hidden ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* ... (Cabecera y Lista de Productos) ... */}
        
        {/* Footer del Carrito */}
        <div className="px-6 py-5 border-t border-slate-200/50 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)] shrink-0 z-20 w-full">
          
          <div className="flex justify-between mb-4 items-end">
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Piezas</span>
            <span id="cart-total" className="text-3xl font-black text-indigo-600 leading-none tracking-tighter">
              {totalPiezas}
            </span>
          </div>
          
          {/* Contenedor de botones actualizado */}
          <div className="flex gap-2 relative w-full overflow-hidden">
            
            {/* 1. EL BOTÓN DEL ESCÁNER QR */}
            <button 
              onClick={() => window.dispatchEvent(new Event('open-qr-scanner'))} 
              className="w-12 h-12 shrink-0 bg-white text-indigo-600 rounded-2xl flex items-center justify-center border-2 border-indigo-50 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm relative p-0"
              title="Escanear QR"
            >
              <i className="fa-solid fa-qrcode text-lg"></i>
              <i className="fa-solid fa-plus absolute top-2 right-2 text-[8px] font-black"></i>
            </button>
            
            {/* 2. EL BOTÓN DE ENVIAR POR WHATSAPP */}
            <button 
              onClick={handleSendWhatsApp}
              disabled={carrito.length === 0}
              className="flex-1 min-w-0 h-12 shrink-0 bg-gradient-to-r from-green-500 to-emerald-500 disabled:from-slate-300 disabled:to-slate-400 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-2xl shadow-md transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden group p-0 px-2"
            >
              <i className="fa-brands fa-whatsapp text-lg shrink-0"></i> 
              <span className="text-sm truncate">WhatsApp</span>
            </button>

            {/* 3. NUEVO BOTÓN: ENVIAR POR CORREO */}
            <button 
              onClick={handleSendEmail}
              disabled={carrito.length === 0}
              className="flex-1 min-w-0 h-12 shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 disabled:from-slate-300 disabled:to-slate-400 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-md transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden group p-0 px-2"
            >
              <i className="fa-solid fa-envelope text-lg shrink-0"></i> 
              <span className="text-sm truncate">Correo</span>
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
