import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

function FloatingButtons() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { totalPiezas, toggleCart } = useApp();

  useEffect(() => {
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
      <button 
        onClick={scrollToTop} 
        className={`fixed bottom-36 right-6 z-40 bg-white/90 backdrop-blur-md text-slate-600 border border-slate-200 w-12 h-12 flex items-center justify-center rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-0 transition-all duration-300 hover:bg-slate-50 hover:text-indigo-600 ${showScrollTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-5 pointer-events-none'}`}
      >
        <i className="fa-solid fa-arrow-up text-lg"></i>
      </button>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
        {/* WhatsApp Premium */}
        <a 
          href="https://wa.me/528113728493" 
          target="_blank" 
          rel="noreferrer"
          className="w-14 h-14 shrink-0 flex items-center justify-center bg-white/90 backdrop-blur-md text-emerald-500 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-110 hover:bg-emerald-50 transition-all border border-emerald-100/50 p-0"
        >
          <i className="fa-brands fa-whatsapp text-3xl"></i>
        </a>
        
        {/* Carrito Premium */}
        <button 
          onClick={toggleCart} 
          className="w-14 h-14 shrink-0 flex items-center justify-center bg-slate-900/95 backdrop-blur-md text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] group hover:bg-indigo-600 hover:scale-110 transition-all relative p-0 border border-slate-700"
        >
          <i className="fa-solid fa-cart-shopping text-xl"></i>
          <span className={`absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md border-2 border-slate-900 transition-transform duration-300 ${totalPiezas > 0 ? 'scale-100' : 'scale-0'}`}>
            {totalPiezas}
          </span>
        </button>
      </div>
    </>
  );
}

export default FloatingButtons;
