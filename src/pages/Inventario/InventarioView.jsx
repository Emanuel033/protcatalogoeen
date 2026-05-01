import React, { useState, useEffect, useCallback } from 'react';
import EscanerManual from './components/EscanerManual';
import ListaConteo from './components/ListaConteo';
import ModalCalculadora from './components/ModalCalculadora';
import useDictadoVoz from './hooks/useDictadoVoz';

const InventarioView = () => {
  const [idioma, setIdioma] = useState('es');
  const [catalogoBase, setCatalogoBase] = useState([]);
  const [estadoCatalogo, setEstadoCatalogo] = useState('Cargando...');
  const [listaConteo, setListaConteo] = useState([]);
  const [calcActiva, setCalcActiva] = useState({ isOpen: false, codigo: null, varId: null, nombre: '' });

  // 1. Carga de Catálogo
  useEffect(() => {
    fetch('/catalogo_completo.json')
      .then(res => res.json())
      .then(data => {
        const piezas = data.filter(p => p.tipo_item === 'PIEZA_BASE');
        setCatalogoBase(piezas);
        setEstadoCatalogo(`${piezas.length} piezas listas`);
      })
      .catch(() => setEstadoCatalogo('Error de carga'));
  }, []);

  // 2. Lógica de Cantidades (Memoizada para evitar re-renders lentos)
  const manualCant = useCallback((codigo, varId, valor) => {
    const pz = parseInt(valor, 10) || 0;
    setListaConteo(prev => prev.map(prod => {
      if (prod.codigo !== codigo) return prod;
      const nuevasVariantes = prod.variantes.map(v => 
        v.id === varId ? { ...v, contadas: Math.max(0, pz) } : v
      );
      const nuevoTotal = nuevasVariantes.reduce((sum, v) => sum + (v.pz * v.contadas), 0);
      return { ...prod, variantes: nuevasVariantes, totalFisico: nuevoTotal };
    }));
  }, []);

  const cambiarCant = (codigo, varId, delta) => {
    const prod = listaConteo.find(p => p.codigo === codigo);
    const variante = prod?.variantes.find(v => v.id === varId);
    if (variante) manualCant(codigo, varId, variante.contadas + delta);
  };

  // 3. Motor de Voz Jarvis
  const { iniciarDictado, estaEscuchando } = useDictadoVoz(idioma, (codigo, varId, cantidad) => {
    manualCant(codigo, varId, cantidad);
  });

  // 4. Agregar Producto (Cumpliendo reglas de negocio)
  const agregarProductoALista = (codigoBuscado) => {
    const cod = String(codigoBuscado).trim().toLowerCase();
    let prod = catalogoBase.find(p => String(p.codigo).toLowerCase() === cod);
    
    if (!prod) {
      // Búsqueda en empaques/SKUs
      prod = catalogoBase.find(p => (p.paquetes || p.empaques || []).some(e => 
        String(e.sku).toLowerCase() === cod || String(e.codigo_barras).toLowerCase() === cod
      ));
    }

    if (prod && !listaConteo.find(i => i.codigo === String(prod.codigo))) {
      const empaques = prod.paquetes || prod.empaques || [];
      // Aplicamos definición: piezas = items por paquete/bolsa
      const variantes = [
        { id: 'sueltas', pz: 1, contadas: 0 },
        ...empaques.map((e, i) => ({ id: `emp_${i}`, pz: parseInt(e.piezas), contadas: 0 }))
      ].sort((a, b) => b.pz - a.pz);

      setListaConteo(prev => [{
        codigo: String(prod.codigo),
        nombre: prod.descripcion_oficial || prod.nombre,
        stockSistema: parseFloat(prod.stock || 0),
        variantes,
        totalFisico: 0
      }, ...prev]);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-slate-50">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/50">
            <i className={`fas ${estaEscuchando ? 'fa-microphone animate-pulse text-red-400' : 'fa-clipboard-list text-white'}`}></i>
          </div>
          <div>
            <h1 className="text-xl font-black">{idioma === 'es' ? 'Inventario' : 'Inventaire'}</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{estadoCatalogo}</p>
          </div>
        </div>
        <button onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl font-bold">
          {idioma === 'es' ? '🇲🇽 ES' : '🇫🇷 FR'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full flex flex-col gap-6 custom-scroll">
        <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg">
           <EscanerManual catalogoBase={catalogoBase} onAgregarProducto={agregarProductoALista} />
        </div>

        <ListaConteo 
          listaConteo={listaConteo} 
          idioma={idioma}
          onCambiarCant={cambiarCant}
          onManualCant={manualCant}
          onEliminar={(cod) => setListaConteo(prev => prev.filter(p => p.codigo !== cod))}
          onAgregarEmpaque={(cod, pz) => {
            setListaConteo(prev => prev.map(p => p.codigo === cod ? 
              { ...p, variantes: [...p.variantes, { id: `f_${Date.now()}`, pz: parseInt(pz), contadas: 0, isFantasma: true }].sort((a,b) => b.pz - a.pz) } : p
            ));
          }}
          onAbrirCalculadora={(codigo, varId) => {
            const p = listaConteo.find(x => x.codigo === codigo);
            setCalcActiva({ isOpen: true, codigo, varId, nombre: p?.nombre });
          }}
          onIniciarDictado={(codigo, varId, btn, letra) => iniciarDictado(codigo, varId, letra)}
        />
      </main>

      <ModalCalculadora 
        isOpen={calcActiva.isOpen}
        tituloTarget={calcActiva.nombre}
        onClose={() => setCalcActiva(prev => ({ ...prev, isOpen: false }))}
        onAplicar={(total) => cambiarCant(calcActiva.codigo, calcActiva.varId, total)}
      />
    </div>
  );
};

export default InventarioView;