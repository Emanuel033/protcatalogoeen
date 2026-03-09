import React from 'react';

function Hero() {
  return (
    // Replicamos el fondo azul y el patrón. 
    // Nota: Luego puedes agregar tu clase 'hero-pattern' en index.css si tenías una imagen de fondo.
    <div className="bg-indigo-800 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 relative z-10">
        <h2 className="text-2xl md:text-4xl font-bold mb-2">Soluciones en Envases</h2>
        <p className="text-indigo-200 text-sm md:text-base max-w-2xl">
          Encuentra la más amplia variedad de envases industriales en Monterrey.
        </p>
      </div>
    </div>
  );
}

export default Hero;