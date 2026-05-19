import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAdminContext } from '../context/AdminContext';
import { RecetaBuilder } from './RecetaBuilder';
import { PackagesManager } from './PackagesManager';
import { db } from '../../../firebase';
// 👇 AQUÍ ESTÁ EL SECRETO: Importamos las funciones de Firebase V9 Modular
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'; 

export const ProductConfigModal = ({ isOpen, onClose, allItems = []}) => {
  const { saveProduct, editingProduct } = useAdminContext();

  const { 
    register, 
    handleSubmit, 
    watch,
    reset,
    setValue, 
    formState: { errors } 
  } = useForm({
    defaultValues: {
      nombre_flexible: '',
      imagen_url: '',
      categoria: '',
      tipo_item: 'PIEZA_BASE',
      codigo_sistema_oficial: '',
      activo: true,
      hereda_empaques_de: ''
    }
  });

  // 1. CUANDO SE ABRE EL MODAL
  useEffect(() => {
    if (editingProduct) {
      let recetaFormateada = [];
      if (editingProduct.receta_desglose) {
        recetaFormateada = Object.keys(editingProduct.receta_desglose).map(compId => ({
          id_producto: compId,
          cantidad: editingProduct.receta_desglose[compId]
        }));
      }

      reset({
        ...editingProduct,
        receta_desglose: recetaFormateada
      });
    } else {
      reset({
        nombre_flexible: '',
        imagen_url: '',
        categoria: '',
        tipo_item: 'PIEZA_BASE',
        codigo_sistema_oficial: '',
        activo: true,
        receta_desglose: []
      });
    }
  }, [editingProduct, reset]);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const currentImageUrl = watch('imagen_url');
  const currentTipoItem = watch('tipo_item');
  const currentReceta = watch('receta_desglose') || [];
  const currentBaseSku = watch('codigo_sistema_oficial');
  const heredaDeId = watch('hereda_empaques_de');
  
  const [heredaSearch, setHeredaSearch] = useState('');
  const [showHeredaList, setShowHeredaList] = useState(false);
  const [subcollectionPackages, setSubcollectionPackages] = useState([]);

  // 👇 2. ESCUCHA DE PAQUETES (AHORA EN V9 MODULAR) 👇
  useEffect(() => {
    if (!editingProduct?.id) {
      setSubcollectionPackages([]);
      return;
    }

    // Así se llama a una subcolección en Firebase V9
    const paquetesRef = collection(db, 'productos_master', editingProduct.id, 'paquetes');
    
    const unsubscribe = onSnapshot(paquetesRef, (snap) => {
      const pkgs = [];
      snap.forEach(docSnap => pkgs.push({ id: docSnap.id, ...docSnap.data() }));
      pkgs.sort((a, b) => a.piezas - b.piezas);
      setSubcollectionPackages(pkgs);
    }, (error) => console.error("Error cargando paquetes:", error));

    return () => unsubscribe();
  }, [editingProduct?.id]); 

  // 👇 3. AGREGAR PAQUETES (AHORA EN V9 MODULAR) 👇
  const handleAddPackageToFirebase = async (qty, sku) => {
    if (!editingProduct?.id) return;
    try {
      const paquetesRef = collection(db, 'productos_master', editingProduct.id, 'paquetes');
      await addDoc(paquetesRef, {
        piezas: qty,
        sku: sku,
        fecha_creacion: new Date()
      });
      
      const productRef = doc(db, 'productos_master', editingProduct.id);
      await updateDoc(productRef, {
        ultima_actualizacion: new Date() 
      });
    } catch (e) {
      console.error("Error al añadir empaque:", e);
    }
  };

  // 👇 4. BORRAR PAQUETES (AHORA EN V9 MODULAR) 👇
  const handleDeletePackageFromFirebase = async (pkgId) => {
    if (!window.confirm("¿Eliminar esta presentación?")) return;
    try {
      const packageRef = doc(db, 'productos_master', editingProduct.id, 'paquetes', pkgId);
      await deleteDoc(packageRef);
      
      const productRef = doc(db, 'productos_master', editingProduct.id);
      await updateDoc(productRef, {
        ultima_actualizacion: new Date()
      });
    } catch (e) {
      console.error("Error al eliminar empaque:", e);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      const URL_VERCEL_IMGBB = "https://api-proxy-een.vercel.app/api/upload"; 

      const response = await fetch(URL_VERCEL_IMGBB, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64String })
      });
      
      const data = await response.json();

      if (response.ok) {
        setValue('imagen_url', data.url, { shouldValidate: true, shouldDirty: true });
        console.log("Imagen subida con bóveda segura");
      } else {
        alert("Error de la API: " + (data.error || 'Desconocido'));
      }
    } catch (error) { 
      console.error(error);
      alert("Error de conexión al subir la imagen");
    } finally { 
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data) => {
    let recetaParaFirebase = null;
    
    if (data.tipo_item === 'KIT_FLEXIBLE') {
      recetaParaFirebase = {};
      const recetaActual = data.receta_desglose || [];
      
      recetaActual.forEach(item => {
        if (item.id_producto && item.cantidad > 0) {
          recetaParaFirebase[item.id_producto] = item.cantidad;
        }
      });

      if (Object.keys(recetaParaFirebase).length === 0) {
        alert("Los Kits Web necesitan al menos 1 componente en su receta.");
        return;
      }
    }

    const dataToUpdate = {
      nombre_flexible: data.nombre_flexible,
      imagen_url: data.imagen_url || '',
      categoria: data.categoria || '',
      codigo_sistema_oficial: data.codigo_sistema_oficial || '',
      tipo_item: data.tipo_item,
      receta_desglose: recetaParaFirebase,
      hereda_empaques_de: data.hereda_empaques_de || null,
      activo: data.activo
    };

    await saveProduct(dataToUpdate);
  };

  const itemsSeguros = allItems || [];
  const filteredHeredar = itemsSeguros.filter(p => {
    if (!p) return false;
    if (p.id === editingProduct?.id) return false; 
    
    const searchLower = String(heredaSearch || '').toLowerCase();
    const nombre = String(p.nombre_flexible || '').toLowerCase();
    const codigo = String(p.codigo_sistema_oficial || '').toLowerCase();
    
    return nombre.includes(searchLower) || codigo.includes(searchLower);
  }).slice(0, 5);

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
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
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
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex gap-2">
                      <input 
                        type="url" 
                        placeholder="Pega una URL o sube una foto..."
                        className="w-full input-modern px-4 py-3 rounded-xl text-slate-600 text-sm border border-slate-200 outline-none focus:border-blue-500"
                        {...register('imagen_url')}
                        disabled={isUploading}
                      />
                      
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                      />

                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current.click()} 
                        disabled={isUploading}
                        className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border shrink-0 ${isUploading ? 'bg-indigo-50/50 text-indigo-400 border-indigo-100 cursor-not-allowed' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200'}`}
                      >
                        <i className="fas fa-upload"></i> <span className="hidden sm:inline">Subir</span>
                      </button>
                    </div>

                    {isUploading && (
                      <p className="text-[10px] text-indigo-500 font-bold animate-pulse mt-1">
                        <i className="fas fa-spinner fa-spin mr-1"></i> Subiendo a servidor seguro...
                      </p>
                    )}

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

              {currentTipoItem === 'KIT_FLEXIBLE' && (
                <div className="mt-6 pt-6 border-t border-slate-100 animate-fade-in-up w-full">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Receta Estructural (Árbol)</label>
                  <p className="text-[10px] text-slate-500 font-medium mb-4">Su existencia web se calculará automáticamente en base al stock de los componentes listados aquí.</p>
                  
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center min-h-[100px] w-full">
                     <RecetaBuilder 
                       receta={currentReceta} 
                       onChange={(nuevaReceta) => setValue('receta_desglose', nuevaReceta, { shouldDirty: true, shouldValidate: true })}
                       allItems={allItems}
                       currentProductId={editingProduct?.id}
                     />
                  </div>
                </div>
              )}

              {currentTipoItem !== 'PIEZA_BASE' && (
                <div className="mt-6 pt-6 border-t border-slate-100 animate-fade-in-up relative">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <i className="fas fa-link text-blue-500 mr-1"></i> Heredar Empaques / Cajas de:
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={heredaSearch}
                      onFocus={() => setShowHeredaList(true)}
                      onChange={(e) => setHeredaSearch(e.target.value)}
                      placeholder={heredaDeId ? "Heredando de un producto vinculado..." : "Busca un producto para compartir sus cajas..."}
                      className="w-full input-modern px-4 py-3 rounded-xl font-bold text-sm text-slate-800 border border-slate-200 outline-none focus:border-blue-500" 
                    />
                    {heredaDeId && (
                      <button 
                        type="button"
                        onClick={() => { setValue('hereda_empaques_de', ''); setHeredaSearch(''); }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 text-red-500 text-xs font-bold"
                      >
                        Quitar vínculo
                      </button>
                    )}
                    <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    
                    {showHeredaList && heredaSearch && (
                      <ul className="absolute z-[90] w-full bg-white border border-slate-200 shadow-2xl rounded-xl mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {filteredHeredar.map(p => (
                          <li 
                            key={p.id}
                            onClick={() => {
                              setValue('hereda_empaques_de', p.id);
                              setHeredaSearch(String(p.nombre_flexible || p.codigo_sistema_oficial || 'Sin nombre'));
                              setShowHeredaList(false);
                            }}
                            className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                          >
                            <span className="text-xs font-bold text-slate-700">{p.nombre_flexible || 'Sin nombre'}</span>
                            <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">{p.codigo_sistema_oficial || 'Sin código'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* SECCIÓN PAQUETES PROPIOS */}
            {currentTipoItem === 'PIEZA_BASE' && (
              <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <i className="fas fa-boxes text-xs"></i>
                  </div> 
                  Presentaciones (Bolsas/Cajas) Propias
                </h3>
                
                <PackagesManager 
                  packages={subcollectionPackages}
                  baseSku={currentBaseSku}
                  onAddPackage={handleAddPackageToFirebase}
                  onDeletePackage={handleDeletePackageFromFirebase}
                  isNewProduct={!editingProduct?.id}
                />
              </div>
            )}

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
