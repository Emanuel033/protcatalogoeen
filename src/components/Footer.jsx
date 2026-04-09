import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200/60 mt-auto pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          
          {/* Ubicación */}
          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-location-dot text-indigo-400"></i> Ubicación
            </h4>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              Calzada Guadalupe Victoria 105 Oriente,<br />Col. Obrerista, Monterrey, N.L.<br />C.P. 64470
            </p>
            <a href="https://maps.app.goo.gl/tGkspDmxdFNXLjn46" target="_blank" rel="noreferrer" className="inline-block mt-3 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wide">
              Ver en Mapa <i className="fa-solid fa-arrow-right ml-1"></i>
            </a>
          </div>

          {/* Teléfonos */}
          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-phone text-indigo-400"></i> Teléfonos Oficina
            </h4>
            <ul className="text-sm font-medium text-slate-700 space-y-3">
              <li><a href="tel:8183754630" className="hover:text-indigo-600 transition-colors">81 8375 4630</a></li>
              <li><a href="tel:8183728736" className="hover:text-indigo-600 transition-colors">81 8372 8736</a></li>
              <li><a href="tel:8183746703" className="hover:text-indigo-600 transition-colors">81 8374 6703</a></li>
              <li><a href="tel:8183751518" className="hover:text-indigo-600 transition-colors">81 8375 1518</a></li>
            </ul>
          </div>

          {/* WhatsApp */}
          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-brands fa-whatsapp text-emerald-500 text-base"></i> WhatsApp
            </h4>
            <ul className="text-sm font-medium text-slate-700 space-y-3">
              <li>
                <a href="https://wa.me/528113728493" target="_blank" rel="noreferrer" className="hover:text-emerald-600 transition-colors flex items-center gap-2.5">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-wider">Ventas</span> 
                  81 1372 8493
                </a>
              </li>
              <li>
                <a href="https://wa.me/528118400503" target="_blank" rel="noreferrer" className="hover:text-emerald-600 transition-colors flex items-center gap-2.5">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-wider">Ventas</span> 
                  81 1840 0503
                </a>
              </li>
            </ul>
          </div>

          {/* Contacto Digital */}
          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-globe text-indigo-400"></i> Contacto Digital
            </h4>
            <div className="text-sm font-medium text-slate-700 flex flex-col gap-4">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Correo Electrónico</span>
                <a href="mailto:ventas@laeconomicamty.com" className="hover:text-indigo-600 transition-colors break-all">ventas@laeconomicamty.com</a>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Sitio Web Oficial</span>
                <a href="http://www.econoenvasesindustriales.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 transition-colors">www.econoenvasesindustriales.com</a>
              </div>
            </div>
          </div>

        </div>
        
        <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[11px] font-medium text-slate-400 text-center md:text-left">
            © {currentYear} Envases La Económica del Norte. Todos los derechos reservados.
          </div>
          <div className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
            Grupo La Económica
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
