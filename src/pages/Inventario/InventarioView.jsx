import React, { useState, useEffect } from 'react';
import EscanerManual from './components/EscanerManual'; // ¡Importamos el nuevo componente!

const InventarioView = () => {
  const [idioma, setIdioma] = useState('es');
  const [catalogoBase, setCatalogoBase] = useState([]);
  const [estadoCatalogo, setEstadoCatalogo] = useState('Cargando base...');
  
  // Aquí vivirá la lista de todo lo que escanees en la sesión
  const [listaConteo, setListaConteo] = useState([]);

  useEffect(() => {
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
  // LÓGICA DE BÚSQUEDA Y AGREGADO
  // ==========================================
  const agregarProductoALista = (codigoBuscado) => {
    const codigoStr = String(codigoBuscado).trim().toLowerCase();
    if (!codigoStr) return;

    // 1. Buscamos el producto en la base de datos cargada
    let prodEncontrado = catalogoBase.find(p => String(p.codigo).toLowerCase() === codigoStr);
    
    // Si no está por código principal, buscamos en sus empaques (por SKU o código de barras)
    if (!prodEncontrado) {
      for (const p of catalogoBase) {
        const empaques = p.paquetes || p.empaques || [];
        if (empaques.some(e => String(e.sku).toLowerCase() === codigoStr || String(e.codigo_barras).toLowerCase() === codigoStr)) {
          prodEncontrado = p; 
          break;
        }
      }
    }

    if (!prodEncontrado) {
      alert("Código no registrado en base de datos."); // Cambiaremos esto por un Toast más bonito después
      return;
    }

    // 2. Verificamos si ya está en la lista para no duplicarlo
    if (listaConteo.some(item => String(item.codigo) === String(prodEncontrado.codigo))) {
      // Si ya está, idealmente haríamos un scroll hacia él. Por ahora, solo evitamos el duplicado.
      return;
    }

    // 3. Si es nuevo, le armamos sus variantes (Sueltas + Paquetes)
    // REGLA DEL USUARIO: "piezas" se refiere a piezas por paquete o bolsa[cite: 1]
    let variantesNuevas = [{ id: 'sueltas', sku: null, pz: 1, contadas: 0, isFantasma: false }];
    const empaquesExtra = prodEncontrado.paquetes || prodEncontrado.empaques || [];
    
    empaquesExtra.forEach((emp, index) => {
      variantesNuevas.push({ 
        id: `emp_${index}`, 
        sku: emp.sku || null,
        pz: parseInt(emp.piezas), 
        contadas: 0, 
        isFantasma: false
      });
    });

    // Ordenamos las variantes de mayor a menor piezas
    variantesNuevas.sort((a,b) => b.pz - a.pz);

    // 4. Lo agregamos al PRINCIPIO de la lista global de conteo
    setListaConteo(listaAnterior => [
      {
        codigo: String(prodEncontrado.codigo),
        nombre: prodEncontrado.descripcion_oficial || prodEncontrado.nombre,
        stockSistema: parseFloat(prodEncontrado.stock || 0),
        variantes: variantesNuevas,
        totalFisico: 0
      },
      ...listaAnterior // Agregamos el resto de lo que ya estaba
    ]);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-slate-900 text-slate-50 font-sans">
      
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex flex-col md:flex-row md:justify-between items-center z-20 shrink-0 gap-4">
        {/* ... (Header intacto) ... */}
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

      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full flex flex-col gap-6 relative">
        
        {/* EL BUSCADOR QUE ACABAMOS DE CREAR */}
        <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 flex flex-col gap-4 shrink-0">
           <EscanerManual 
              catalogoBase={catalogoBase} 
              onAgregarProducto={agregarProductoALista} 
           />
        </div>

        {/* FEEDBACK TEMPORAL PARA VER QUE FUNCIONA */}
        {listaConteo.length > 0 ? (
          <div className="bg-slate-800 p-4 rounded-3xl border border-emerald-500/50 shadow-lg text-emerald-400">
             <h3 className="font-bold mb-2">¡Producto agregado al Estado Global!</h3>
             <pre className="text-[10px] overflow-auto">
               {JSON.stringify(listaConteo[0], null, 2)}
             </pre>
          </div>
        ) : (
          <div id="emptyState" className="text-center py-12 text-slate-500 flex flex-col items-center">
              <i className="fas fa-boxes text-6xl mb-4 text-slate-700"></i>
              <p className="font-bold text-lg">La lista está vacía.</p>
              <p className="text-sm mt-1">Busca un producto arriba para agregarlo.</p>
          </div>
        )}

      </main>
    </div>
  );
};

export default InventarioView;