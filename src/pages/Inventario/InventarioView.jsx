import React, { useState, useEffect } from 'react';

// Aquí importaremos los "pedacitos" visuales más adelante
// import HeaderInventario from './components/HeaderInventario';
// import EscanerManual from './components/EscanerManual';
// import ListaConteo from './components/ListaConteo';
// import ModalCalculadora from './components/ModalCalculadora';

const InventarioView = () => {
  // ==========================================
  // 1. ESTADOS GLOBALES DEL INVENTARIO (El Cerebro)
  // ==========================================
  const [idioma, setIdioma] = useState('es'); // 'es' o 'fr'
  const [catalogoBase, setCatalogoBase] = useState([]);
  const [estadoCatalogo, setEstadoCatalogo] = useState('Cargando base...');
  
  // Aquí vivirá la lista de todo lo que escanees en la sesión
  const [listaConteo, setListaConteo] = useState([]);
  
  // Controles para la calculadora y modales
  const [calcActiva, setCalcActiva] = useState({ isOpen: false, codigo: null, varId: null });

  // ==========================================
  // 2. EFECTOS (Cosas que pasan al abrir la pantalla)
  // ==========================================
  useEffect(() => {
    // Simulamos la carga de tu JSON generado por GitHub Actions
    const cargarCatalogo = async () => {
      try {
        const response = await fetch('/catalogo_completo.json');
        if (!response.ok) throw new Error("JSON no encontrado");
        
        const rawData = await response.json();
        const piezasBase = rawData.filter(p => p.tipo_item === 'PIEZA_BASE');
        setCatalogoBase(piezasBase);
        setEstadoCatalogo(`${piezasBase.length} piezas listas`);
      } catch (error) {
        setEstadoCatalogo('Error cargando catálogo');
        console.error(error);
      }
    };

    cargarCatalogo();
  }, []);

  // ==========================================
  // 3. LA INTERFAZ (El cascarón Tailwind)
  // ==========================================
  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-slate-900 text-slate-50 font-sans">
      
      {/* HEADER TEMPORAL */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex flex-col md:flex-row md:justify-between items-center z-20 shrink-0 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/50 shrink-0">
                <i className="fas fa-clipboard-list text-xl"></i>
            </div>
            <div>
                <h1 className="text-xl font-black tracking-tight leading-none">
                  {idioma === 'es' ? 'Inventario Continuo' : 'Inventaire Continu'}
                </h1>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                  {estadoCatalogo}
                </p>
            </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto flex-wrap">
            <button 
              onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} 
              className="bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
            >
                <span>{idioma === 'es' ? '🇲🇽 ES' : '🇫🇷 FR'}</span>
            </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL TEMPORAL */}
      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full flex flex-col gap-6 relative">
        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 text-center flex flex-col items-center justify-center h-full">
          <i className="fas fa-boxes text-6xl mb-4 text-slate-600"></i>
          <h2 className="text-2xl font-black text-white mb-2">Plataforma React Lista</h2>
          <p className="text-slate-400 max-w-md">
            El estado global está configurado. El siguiente paso es extraer el escáner de cámara y el motor de búsqueda en componentes separados para no saturar esta vista.
          </p>
        </div>
      </main>

    </div>
  );
};

export default InventarioView;