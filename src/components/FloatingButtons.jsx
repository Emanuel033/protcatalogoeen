import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext'; // 1. Importar

function FloatingButtons() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // 2. Extraer totalPiezas y toggleCart
  const { totalPiezas, toggleCart } = useApp();

  useEffect(() => {
    // ... tu código de scroll se queda igual
    const handleScroll = () => {
      if (window.scrollY > 300) setShowScrollTop(true);
      else setShowScrollTop(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <>
      <button onClick={scrollToTop} className={`fixed bottom-36 right-6 z-40 bg-slate-800 text-white w-12 h-12 flex items-center justify-center rounded-full shadow-lg p-0 transition-all duration-300 ${showScrollTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-5 pointer-events-none'}`}>
        <i className="fa-solid fa-arrow-up text-lg"></i>
      </button>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
        <button className="w-14 h-14 shrink-0 flex items-center justify-center bg-white text-green-500 rounded-full shadow-lg hover:scale-110 transition border border-green-100 p-0">
          <i className="fa-brands fa-whatsapp text-3xl"></i>
        </button>
        
        {/* 3. Conectar botón y badge */}
        <button 
          onClick={toggleCart} 
          className="w-14 h-14 shrink-0 flex items-center justify-center bg-indigo-600 text-white rounded-full shadow-lg group hover:scale-110 relative p-0"
        >
          <i className="fa-solid fa-cart-shopping text-xl"></i>
          <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-indigo-600 transition-transform ${totalPiezas > 0 ? 'scale-100' : 'scale-0'}`}>
            {totalPiezas}
          </span>
        </button>
      </div>
    </>
  );
}

export default FloatingButtons;
