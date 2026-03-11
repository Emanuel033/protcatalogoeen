import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { useApp } from '../context/AppContext';

function ProductGrid() {
  const { productos, cargando, categoriaActiva, searchTerm } = useApp();
  
  // --- ESTADOS PARA PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Cantidad de productos por página (ajústalo si quieres)

  // Si el usuario cambia el filtro o busca algo, regresamos a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [categoriaActiva, searchTerm]);

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
  
  let productosFiltrados = (productos || []).filter(p => {
    const categoriaProducto = (p.category || '').toLowerCase();
    const nombreProducto = (p.name || '').toLowerCase();
    const codigoProducto = (p.codigo_sistema || '').toLowerCase();

    const coincideCategoria = catActiva === 'todos' || categoriaProducto === catActiva;
    const coincideBusqueda = termino === '' || nombreProducto.includes(termino) || codigoProducto.includes(termino);
    
    return coincideCategoria && coincideBusqueda;
  });

  productosFiltrados = productosFiltrados.sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  if (productosFiltrados.length === 0) {
    return (
      <div className="col-span-full text-center py-20 fade-in">
        <h3 className="text-lg font-bold text-slate-700 mb-1">Sin resultados</h3>
        <p className="text-sm text-slate-400">No encontramos "{searchTerm}" en esta categoría.</p>
      </div>
    );
  }

  // --- LÓGICA DE PAGINACIÓN ---
  const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = productosFiltrados.slice(startIndex, endIndex);

  // Función para cambiar de página y subir el scroll
  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Grid de Productos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
    </div>
  );
}

export default ProductGrid;
