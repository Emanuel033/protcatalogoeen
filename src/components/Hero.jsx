import React from 'react';

function Hero() {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden border-b border-indigo-500/20">
      {/* Efecto de brillo/patrón muy sutil de fondo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-60"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-16 relative z-10 flex flex-col items-center text-center md:items-start md:text-left">
        <span className="text-indigo-400 font-bold tracking-widest text-[10px] uppercase mb-2">
          Catálogo Digital
        </span>
        <h2 className="text-3xl md:text-5xl font-black mb-3 tracking-tight text-white drop-shadow-sm">
          Soluciones en Envases
        </h2>
        <p className="text-slate-300 text-sm md:text-base max-w-xl font-medium leading-relaxed">
          Encuentra la más amplia variedad de envases plásticos, metálicos y accesorios en Monterrey.
        </p>
      </div>
    </div>
  );
}

export default Hero;
