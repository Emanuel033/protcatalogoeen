import React from 'react';
import ProductCard from './ProductCard';
import { useApp } from '../context/AppContext';

function ProductGrid() {
  const { productos, cargando, categoriaActiva, searchTerm } = useApp();

  if (cargando) {
    return (
      <div className="col-span-full text-center py-12">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium">Cargando catálogo...</p>
      </div>
    );
  }

  // BLINDAJE CONTRA ERRORES: Evitamos el 'undefined' asegurando que siempre haya un texto fallback ('')
  const termino = (searchTerm || '').toLowerCase().trim();
  const catActiva = (categoriaActiva || 'Todos').toLowerCase().trim();
  
  // FILTRAR
  let productosFiltrados = (productos || []).filter(p => {
    const categoriaProducto = (p.category || '').toLowerCase();
    const nombreProducto = (p.name || '').toLowerCase();
    const codigoProducto = (p.codigo_sistema || '').toLowerCase();

    const coincideCategoria = catActiva === 'todos' || categoriaProducto === catActiva;
    const coincideBusqueda = termino === '' || nombreProducto.includes(termino) || codigoProducto.includes(termino);
    
    return coincideCategoria && coincideBusqueda;
  });

  // ORDENAR ALFABÉTICAMENTE (A - Z)
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {productosFiltrados.map((prod) => (
        <ProductCard key={prod.id} product={prod} />
      ))}
    </div>
  );
}

export default ProductGrid;