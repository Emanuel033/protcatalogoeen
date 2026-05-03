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
  
  // ESTADO PARA EL LIGHTBOX (IMAGEN GIGANTE)
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

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

  // 2. Lógica de Cantidades (Memoizada)
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

  // 4. Agregar Producto (Con Normalizador de Empaques e Imagen)
  const agregarProductoALista = (codigoBuscado) => {
    const cod = String(codigoBuscado).trim().toLowerCase();
    let prod = catalogoBase.find(p => String(p.codigo).toLowerCase() === cod);
    
    if (!prod) {
      // Normalizamos temporalmente para búsqueda profunda de SKUs
      prod = catalogoBase.find(p => {
        let pkgs = [];
        if (p.paquetes) pkgs = Array.isArray(p.paquetes) ? p.paquetes : Object.values(p.paquetes);
        return pkgs.some(e => String(e.sku).toLowerCase() === cod || String(e.codigo_barras).toLowerCase() === cod);
      });
    }

    if (prod && !listaConteo.find(i => i.codigo === String(prod.codigo))) {
      
      // LÓGICA BLINDADA PARA LEER LOS EMPAQUES DEL JSON
      let paquetesArray = [];
      if (prod.paquetes && Object.keys(prod.paquetes).length > 0) {
        paquetesArray = Array.isArray(prod.paquetes) ? prod.paquetes : Object.values(prod.paquetes);
      } else if (prod.empaques_tips && Object.keys(prod.empaques_tips).length > 0) {
        const tips = Array.isArray(prod.empaques_tips) ? prod.empaques_tips : Object.values(prod.empaques_tips);
        paquetesArray = tips.map(qty => ({ piezas: parseInt(qty) }));
      }
      const empaquesLimpios = paquetesArray.filter(p => p && p.piezas);

      const variantes = [
        { id: 'sueltas', pz: 1, contadas: 0 },
        ...empaquesLimpios.map((e, i) => ({ id: `emp_${i}`, pz: parseInt(e.piezas), contadas: 0 }))
      ].sort((a, b) => b.pz - a.pz);

      setListaConteo(prev => [{
        codigo: String(prod.codigo),
        nombre: prod.descripcion_oficial || prod.nombre,
        stockSistema: parseFloat(prod.stock || 0),
        imagen: prod.image || prod.imagen || null, // <-- AQUÍ ASEGURAMOS LA FOTO
        variantes,
        totalFisico: 0
      }, ...prev]);
    }
  };

  const descargarCSV = () => {
  if (listaConteo.length === 0) {
    alert(idioma === 'es' ? "La lista está vacía" : "La liste est vide");
    return;
  }

  // 1. Cabeceras del Excel
  let csv = "\uFEFF"; // BOM para que Excel lea bien los acentos
  csv += "Codigo,Producto,Stock Sistema,Total Fisico,Ajuste,Detalle Conteos\n";

  // 2. Recorrer la lista que tienes en pantalla
  listaConteo.forEach(item => {
    const ajuste = item.totalFisico - item.stockSistema;
    
    // Crear el detalle (ej: "100pz: 2 | 1pz: 5")
    const detalle = item.variantes
      .filter(v => v.contadas > 0)
      .map(v => `${v.pz}${idioma === 'es' ? 'pz' : 'pc'}: ${v.contadas}`)
      .join(" | ");

    // Limpiar comas del nombre para no romper el CSV
    const nombreLimpio = item.nombre.replace(/,/g, "");

    csv += `${item.codigo},${nombreLimpio},${item.stockSistema},${item.totalFisico},${ajuste},"${detalle}"\n`;
  });

  // 3. Crear el archivo y descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Inventario_EEN_${new Date().getTime()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-slate-50">
      
      {/* HEADER */}
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
        <button 
    onClick={descargarCSV} 
    className="bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
  >
    <i className="fas fa-file-excel text-emerald-400"></i>
    <span>CSV</span>
  </button>

  <button 
    onClick={() => setIdioma(idioma === 'es' ? 'fr' : 'es')} 
    className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl font-bold"
  >
    {idioma === 'es' ? '🇲🇽 ES' : '🇫🇷 FR'}
  </button>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full flex flex-col gap-6 custom-scroll">
        <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg">
           <EscanerManual catalogoBase={catalogoBase} onAgregarProducto={agregarProductoALista} idioma={idioma} />
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
          onZoomImagen={(img) => setImagenAmpliada(img)} // <-- ESTO CONECTA LA LISTA CON EL MODAL
        />
      </main>

      {/* MODAL CALCULADORA ESTIBA 3D */}
      <ModalCalculadora 
        isOpen={calcActiva.isOpen}
        tituloTarget={calcActiva.nombre}
        codigoItem={calcActiva.codigo} 
        varIdItem={calcActiva.varId}   
        onClose={() => setCalcActiva(prev => ({ ...prev, isOpen: false }))}
        onAplicar={(total) => cambiarCant(calcActiva.codigo, calcActiva.varId, total)}
        idioma={idioma}
      />

      {/* 👇 AQUÍ ESTÁ EL FAMOSO MODAL LIGHTBOX BIEN ACOMODADO 👇 */}
      {imagenAmpliada && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 touch-none" 
          onClick={() => setImagenAmpliada(null)}
        >
          <div className="relative max-w-md w-full flex flex-col items-center animate-fade-in" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setImagenAmpliada(null)} 
              className="absolute -top-12 right-0 w-10 h-10 bg-slate-800 border border-slate-700 rounded-full text-white shadow-lg flex items-center justify-center hover:bg-slate-700 transition"
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="bg-white p-2 rounded-2xl shadow-2xl w-full flex justify-center">
                <img 
                  src={imagenAmpliada} 
                  alt="Verificación visual" 
                  className="w-full max-h-[70vh] object-contain rounded-xl mix-blend-multiply"
                  onError={(e) => e.target.src = 'https://dummyimage.com/300x300/e2e8f0/0f172a&text=Sin+Imagen'}
                />
            </div>
            <p className="text-slate-400 font-bold text-[10px] mt-4 uppercase tracking-widest bg-slate-800 px-5 py-2.5 rounded-full border border-slate-700 cursor-pointer shadow-lg active:scale-95 transition" onClick={() => setImagenAmpliada(null)}>
              Cerrar verificación
            </p>
          </div>
        </div>
      )}
      {/* 👆 FIN DEL MODAL LIGHTBOX 👆 */}

    </div>
  );
};

export default InventarioView;