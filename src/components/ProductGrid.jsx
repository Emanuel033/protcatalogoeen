import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import FiltrosRapidos, { REGLAS_FILTROS } from './FiltrosRapidos';
import { useApp } from '../context/AppContext';

function ProductGrid() {
  const { productos, cargando, categoriaActiva, setCategoriaActiva, searchTerm, setSearchTerm, filtroRapido, setFiltroRapido } = useApp();
  
  // --- ESTADOS PARA PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Si el usuario cambia CUALQUIER filtro o busca algo, regresamos a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [categoriaActiva, searchTerm, filtroRapido]);

  if (cargando) {
    return (
      <div className="col-span-full text-center py-12">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium">Cargando catálogo...</p>
      </div>
    );
  }

  const termino = (searchTerm || '').toLowerCase().trim();
  const catActiva = (categoriaActiva || 'Todos').toLowerCase().trim();
  
  // 1. Filtrado Base (Barra de Búsqueda y Categoría Lateral)
  let productosBase = (productos || []).filter(p => {
    const categoriaProducto = (p.category || '').toLowerCase();
    const nombreProducto = (p.name || '').toLowerCase();
    const codigoProducto = (p.codigo_sistema || '').toLowerCase();

    const coincideCategoria = catActiva === 'todos' || categoriaProducto === catActiva;
    const coincideBusqueda = termino === '' || nombreProducto.includes(termino) || codigoProducto.includes(termino);
    
    return coincideCategoria && coincideBusqueda;
  });

  // Guardamos los productos base para mandárselos a las píldoras
  const productosAntesDePildora = [...productosBase];

  // ✨ 2. FILTRADO RÁPIDO (La magia de las píldoras)
  if (filtroRapido) {
    const reglaAplicar = REGLAS_FILTROS.find(r => r.id === filtroRapido);
    
    if (reglaAplicar) {
      productosBase = productosBase.filter(p => {
        const nombreProducto = (p.name || '').toLowerCase();
        return reglaAplicar.test(nombreProducto);
      });
    }
  }

  // 3. Ordenamiento Alfabético
  const productosFiltrados = productosBase.sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  // --- LÓGICA DE PAGINACIÓN ---
  const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = productosFiltrados.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  return (
    <div className="flex flex-col space-y-4">
      
      {/* ✨ RENDERIZAMOS LAS PÍLDORAS AQUÍ ARRIBA */}
      <FiltrosRapidos productosMostrados={productosAntesDePildora} />

      {/* Si después de todos los filtros no hay nada */}
      {productosFiltrados.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 fade-in">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-5">
            <i className="fa-solid fa-magnifying-glass-minus text-3xl text-slate-300"></i>
          </div>
          <h3 className="text-xl font-black text-slate-700 mb-2 text-center">
            ¡Ups! No encontramos resultados
          </h3>
          <p className="text-sm text-slate-500 max-w-md text-center mb-8">
            {filtroRapido 
              ? "Ningún producto cumple con el filtro rápido seleccionado." 
              : `No hay productos en "${categoriaActiva}" que coincidan con tu búsqueda.`}
          </p>
          
          {/* ✨ BOTÓN SALVAVIDAS: Resetea todo desde aquí */}
          <button
            onClick={() => {
              setSearchTerm('');
              setFiltroRapido(null);
              setCategoriaActiva('Todos');
            }}
            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2"
          >
            <i className="fa-solid fa-eraser"></i> Limpiar todos los filtros
          </button>
        </div>
      ) : (
        <>
          {/* Grid de Productos */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-2">
            {currentProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>

          {/* Controles de Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8 pb-8">
              <button 
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition bg-white shadow-sm"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              
              <span className="text-sm font-bold text-slate-600 px-4">
                Página {currentPage} de {totalPages}
              </span>

              <button 
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition bg-white shadow-sm"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProductGrid;
