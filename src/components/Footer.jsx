import React from 'react';

function Footer() {
  // Obtenemos el año actual automáticamente para el Copyright
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto pt-10 pb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Ubicación */}
          <div>
            <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Ubicación
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Calzada Guadalupe Victoria 105 Oriente,<br />Col. Obrerista, Monterrey, N.L.<br />C.P. 64470
            </p>
            <a href="[https://maps.app.goo.gl/tGkspDmxdFNXLjn46](https://maps.app.goo.gl/tGkspDmxdFNXLjn46)" target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
              Ver en Mapa →
            </a>
          </div>

          {/* Teléfonos */}
          <div>
            <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              Teléfonos Oficina
            </h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li><a href="tel:8183754630" className="hover:text-indigo-600 transition-colors">81 8375 4630</a></li>
              <li><a href="tel:8183728736" className="hover:text-indigo-600 transition-colors">81 8372 8736</a></li>
              <li><a href="tel:8183746703" className="hover:text-indigo-600 transition-colors">81 8374 6703</a></li>
              <li><a href="tel:8183751518" className="hover:text-indigo-600 transition-colors">81 8375 1518</a></li>
            </ul>
          </div>

          {/* WhatsApp */}
          <div>
            <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <i className="fa-brands fa-whatsapp text-green-500 text-xl"></i>
              WhatsApp
            </h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li><a href="[https://wa.me/528113728493](https://wa.me/528113728493)" target="_blank" rel="noreferrer" className="hover:text-green-600 transition-colors flex items-center gap-2"><span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold">Ventas</span> 81 1372 8493</a></li>
              <li><a href="[https://wa.me/528118400503](https://wa.me/528118400503)" target="_blank" rel="noreferrer" className="hover:text-green-600 transition-colors flex items-center gap-2"><span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold">Ventas</span> 81 1840 0503</a></li>
            </ul>
          </div>

          {/* Contacto Digital */}
          <div>
            <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Contacto Digital
            </h4>
            <div className="text-sm text-slate-600 flex flex-col gap-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Correo</span>
                <a href="mailto:ventas@laeconomicamty.com" className="block hover:text-indigo-600 transition-colors break-all">ventas@laeconomicamty.com</a>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sitio Web</span>
                <a href="http://www.econoenvasesindustriales.com" target="_blank" rel="noreferrer" className="block text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition-colors">www.econoenvasesindustriales.com</a>
              </div>
            </div>
          </div>

        </div>
        
        <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-slate-400 text-center md:text-left">&copy; {currentYear} Envases La Económica del Norte. Todos los derechos reservados.</div>
          <div className="text-xs text-slate-300 font-medium">Grupo La Económica</div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;