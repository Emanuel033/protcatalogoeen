import React, { useState, useEffect } from 'react';
import EscanerManual from './components/EscanerManual';
import ListaConteo from './components/ListaConteo'; // Importamos las tarjetas

const InventarioView = () => {
  const [idioma, setIdioma] = useState('es');
  const [catalogoBase, setCatalogoBase] = useState([]);
  const [estadoCatalogo, setEstadoCatalogo] = useState('Cargando base...');
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
      }
    };
    cargarCatalogo();
  }, []);

  const agregarProductoALista = (codigoBuscado) => {
    const codigoStr = String(codigoBuscado).trim().toLowerCase();
    if (!codigoStr) return;

    let prodEncontrado = catalogoBase.find(p => String(p.codigo).toLowerCase() === codigoStr);
    if (!prodEncontrado) {
      for (const p of catalogoBase) {
        const empaques = p.paquetes || p.empaques || [];
        if (empaques.some(e => String(e.sku).toLowerCase() === codigoStr || String(e.codigo_barras).toLowerCase() === codigoStr)) {
          prodEncontrado = p; break;
        }
      }
    }

    if (!prodEncontrado) return alert("Código no registrado en base de datos.");
    if (listaConteo.some(item => String(item.codigo) === String(prodEncontrado.codigo))) return;

    let variantesNuevas = [{ id: 'sueltas', sku: null, pz: 1, contadas: 0, isFantasma: false }];
    const empaquesExtra = prodEncontrado.paquetes || prodEncontrado.empaques || [];
    empaquesExtra.forEach((emp, index) => {
      variantesNuevas.push({ id: `emp_${index}`, sku: emp.sku || null, pz: parseInt(emp.piezas), contadas: 0, isFantasma: false });
    });
    variantesNuevas.sort((a,b) => b.pz - a.pz);

    setListaConteo(prev => [{
      codigo: String(prodEncontrado.codigo),
      nombre: prodEncontrado.descripcion_oficial || prodEncontrado.nombre,
      stockSistema: parseFloat(prodEncontrado.stock || 0),
      variantes: variantesNuevas,
      totalFisico: 0
    }, ...prev]);
  };

  // ==========================================
  // FUNCIONES DE CONTROL DE INVENTARIO
  // ==========================================
  
  // Recalcula el total multiplicando piezas por cantidad contada
  const recalcularTotal = (variantes) => {
    return variantes.reduce((sum, v) => sum + (v.pz * v.contadas), 0);
  };

  const cambiarCant = (codigo, varId, delta) => {
    setListaConteo(prev => prev.map(prod => {
      if (prod.codigo !== codigo) return prod;
      const nuevasVariantes = prod.variantes.map(v => {
        if (v.id !== varId) return v;
        return { ...v, contadas: Math.max(0, v.contadas + delta) };
      });
      return { ...prod, variantes: nuevasVariantes, totalFisico: recalcularTotal(nuevasVariantes) };
    }));
  };

  const manualCant = (codigo, varId, valor) => {
    const valParsed = parseInt(valor, 10) || 0;
    setListaConteo(prev => prev.map(prod => {
      if (prod.codigo !== codigo) return prod;
      const nuevasVariantes = prod.variantes.map(v => {
        if (v.id !== varId) return v;
        return { ...v, contadas: Math.max(0, valParsed) };
      });
      return { ...prod, variantes: nuevasVariantes, totalFisico: recalcularTotal(nuevasVariantes) };
    }));
  };

  const eliminarDeLista = (codigo) => {
    setListaConteo(prev => prev.filter(p => p.codigo !== codigo));
  };

  const agregarEmpaqueNuevo = (codigo, pzInput) => {
    const pz = parseInt(pzInput, 10);
    if (isNaN(pz) || pz <= 1) return alert("Mínimo 2 piezas"); // El usuario definió que "piezas" son por paquete

    setListaConteo(prev => prev.map(prod => {
      if (prod.codigo !== codigo) return prod;
      const nuevasVariantes = [...prod.variantes, { id: 'fantasma_' + Date.now(), sku: null, pz: pz, contadas: 0, isFantasma: true }];
      nuevasVariantes.sort((a,b) => b.pz - a.pz);
      return { ...prod, variantes: nuevasVariantes };
    }));
  };

  // Funciones vacías por ahora, las llenamos en el siguiente sprint veloz
  const abrirCalculadora = (codigo, varId) => alert(`Calculadora para ${codigo} en construcción`);
  const iniciarDictado = (codigo, varId, btn, letra) => alert(`Dictado [${letra}] en construcción`);

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-slate-900 text-slate-50 font-sans">
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
            <button onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                <span>{idioma === 'es' ? '🇲🇽 ES' : '🇫🇷 FR'}</span>
            </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full flex flex-col gap-6 relative custom-scroll">
        <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 flex flex-col gap-4 shrink-0 shadow-lg">
           <EscanerManual catalogoBase={catalogoBase} onAgregarProducto={agregarProductoALista} />
        </div>

        {/* AQUÍ INYECTAMOS LAS TARJETAS MÁGICAS */}
        <ListaConteo 
          listaConteo={listaConteo} 
          idioma={idioma}
          onCambiarCant={cambiarCant}
          onManualCant={manualCant}
          onEliminar={eliminarDeLista}
          onAgregarEmpaque={agregarEmpaqueNuevo}
          onAbrirCalculadora={abrirCalculadora}
          onIniciarDictado={iniciarDictado}
        />
      </main>
    </div>
  );
};

export default InventarioView;