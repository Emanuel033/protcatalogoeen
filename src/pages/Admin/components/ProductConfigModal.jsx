import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAdminContext } from '../context/AdminContext';
export const ProductConfigModal = ({ isOpen, onClose }) => {
  const { 
    register, 
    handleSubmit, 
    watch,
    reset, 
    formState: { errors } 
  } = useForm({
    defaultValues: initialData || {
      nombre_flexible: '',
      imagen_url: '',
      categoria: '',
      tipo_item: 'PIEZA_BASE',
      codigo_sistema_oficial: '',
      activo: true,
      // hereda_empaques_de: '' // Lo agregaremos luego
    }
  });

  useEffect(() => {
    if (editingProduct) {
      // Si hay un producto, lo cargamos
      reset(editingProduct);
    } else {
      // Si no, lo vaciamos para uno "Nuevo"
      reset({
        nombre_flexible: '',
        imagen_url: '',
        categoria: '',
        tipo_item: 'PIEZA_BASE',
        codigo_sistema_oficial: '',
        activo: true,
      });
    }
  }, [editingProduct, reset]);

  const currentImageUrl = watch('imagen_url');
  const currentTipoItem = watch('tipo_item');
  const isActivo = watch('activo');

  const onSubmit = async (data) => {
    await saveProduct(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 md:p-6">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-100 animate-slide-up">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <i className="fas fa-box text-lg"></i>
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">
                {initialData ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 flex items-center justify-center transition">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scroll bg-slate-50/30 space-y-4">
          <form id="productForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* SECCIÓN 1: DATOS BÁSICOS */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                
                <div className="md:col-span-2 relative">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Nombre Comercial <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    className={`w-full input-modern px-4 py-3 rounded-xl font-bold text-slate-900 text-sm border outline-none transition-colors ${errors.nombre_flexible ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-blue-500'}`}
                    {...register('nombre_flexible', { required: 'Requerido' })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Imagen del Producto</label>
                  <div className="flex gap-4 items-center">
                    <img 
                      src={currentImageUrl || 'https://dummyimage.com/200x200/e2e8f0/0f172a&text=FOTO'} 
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                      alt="Preview"
                    />
                    <div className="flex-1 flex gap-2">
                      <input 
                        type="url" 
                        placeholder="Pega una URL..."
                        className="w-full input-modern px-4 py-3 rounded-xl text-slate-600 text-sm border border-slate-200 outline-none focus:border-blue-500"
                        {...register('imagen_url')}
                      />
                      <button type="button" onClick={() => alert('ImgBB en construcción')} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-indigo-200 shrink-0">
                        <i className="fas fa-upload"></i> <span className="hidden sm:inline">Subir</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría</label>
                  <input type="text" className="w-full input-modern px-4 py-3 rounded-xl text-slate-800 uppercase font-bold text-sm border border-slate-200 outline-none focus:border-blue-500" {...register('categoria')} />
                </div>

              </div>
            </div>

            {/* SECCIÓN 2: COMPORTAMIENTO EN SISTEMA */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-5 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center"><i className="fas fa-microchip text-xs"></i></div> 
                Comportamiento en Sistema
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Artículo</label>
                  <div className="relative">
                    <select 
                      className="w-full input-modern px-4 py-3 rounded-xl text-indigo-700 bg-indigo-50/50 font-bold text-sm appearance-none border border-indigo-100 outline-none focus:border-indigo-300"
                      {...register('tipo_item')}
                    >
                      <option value="PIEZA_BASE">🧊 Pieza Base (Inventariable)</option>
                      <option value="KIT_OFICIAL">📦 Kit Oficial (Armado en Sistema)</option>
                      <option value="KIT_FLEXIBLE">🌐 Kit Web (Receta Árbol / Suma Stock)</option>
                    </select>
                    <i className="fas fa-chevron-down absolute right-4 top-4 text-indigo-400 text-xs pointer-events-none"></i>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Cód. Facturación {currentTipoItem === 'PIEZA_BASE' && <span className="text-red-500">*</span>}
                  </label>
                  <input 
                    type="text" 
                    placeholder="Busca o escribe el código..."
                    className={`w-full input-modern px-4 py-3 rounded-xl font-mono uppercase text-slate-900 font-black text-sm border outline-none transition-colors ${errors.codigo_sistema_oficial ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-blue-500'}`}
                    {...register('codigo_sistema_oficial', { 
                      required: currentTipoItem === 'PIEZA_BASE' ? 'Obligatorio para Piezas Base' : false 
                    })}
                  />
                  {errors.codigo_sistema_oficial && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.codigo_sistema_oficial.message}</p>}
                </div>
              </div>

              {/* RENDERIZADO CONDICIONAL DE RECETAS */}
              {currentTipoItem === 'KIT_FLEXIBLE' && (
                <div className="mt-6 pt-6 border-t border-slate-100 animate-fade-in-up">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Receta Estructural (Árbol)</label>
                  <p className="text-[10px] text-slate-500 font-medium mb-4">Su existencia web se calculará automáticamente en base al stock de los componentes listados aquí.</p>
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center min-h-[100px]">
                     {/* TODO: Montar el componente <RecetaBuilder /> aquí */}
                     <p className="text-xs text-slate-400 font-bold mb-3">Zona de armado de kits en construcción...</p>
                     <button type="button" className="text-xs bg-white border border-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl shadow-sm"><i className="fas fa-plus mr-2"></i> Añadir Componente</button>
                  </div>
                </div>
              )}

              {/* RENDERIZADO CONDICIONAL DE HERENCIA */}
              {currentTipoItem !== 'PIEZA_BASE' && (
                <div className="mt-6 pt-6 border-t border-slate-100 animate-fade-in-up relative">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <i className="fas fa-link text-blue-500 mr-1"></i> Heredar Empaques / Cajas de:
                  </label>
                  <p className="text-[10px] text-slate-500 font-medium mb-3">Busca y elige el producto maestro para compartir sus presentaciones de cajas.</p>
                  <input type="text" placeholder="Escribe para buscar un producto maestro..." className="w-full input-modern px-4 py-3 rounded-xl font-bold text-sm text-slate-800 border border-slate-200 outline-none" />
                </div>
              )}

            </div>

            {/* SECCIÓN 3: PAQUETES PROPIOS (Solo si no está heredando o si es Pieza Base) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-5 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-500 flex items-center justify-center"><i className="fas fa-boxes text-xs"></i></div> 
                Presentaciones (Bolsas/Cajas) Propias
              </h3>
              
              <div className="bg-slate-900 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-end mb-6 shadow-lg shadow-slate-900/10">
                <div className="w-full md:w-32">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Piezas</label>
                  <input type="number" min="2" className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl text-sm text-center font-black focus:border-blue-500 outline-none transition-colors" />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">SKU Físico de Caja</label>
                  <div className="flex">
                    <input type="text" className="w-full bg-slate-800 border border-r-0 border-slate-700 text-white px-4 py-3 rounded-l-xl text-sm font-mono focus:border-blue-500 outline-none transition-colors" />
                    <button type="button" className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-r-xl font-bold text-[10px] uppercase tracking-wider transition">Auto</button>
                  </div>
                </div>
                <button type="button" className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-black text-sm transition h-[46px]">Añadir</button>
              </div>

              {/* TODO: Montar el componente <PackagesTable /> aquí */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 text-center py-8">
                  <p className="text-xs text-slate-400 font-bold">Guarda el producto primero para gestionar sus cajas.</p>
              </div>
            </div>

            {/* SECCIÓN 4: VISIBILIDAD */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800">Visibilidad en Tienda</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Controla si este producto es visible o está oculto en tu catálogo web.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" {...register('activo')} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

          </form>
        </div>

        {/* FOOTER - BOTONES DE GUARDAR */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 z-10">
          <button type="button" onClick={onClose} className="px-6 py-3.5 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-xl transition">
            Cancelar
          </button>
          <button type="submit" form="productForm" className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-500/30 text-sm transition-all flex items-center gap-2">
            <i className="fas fa-check"></i> Guardar Ficha
          </button>
        </div>

      </div>
    </div>
  );
};