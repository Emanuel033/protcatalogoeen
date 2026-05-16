import React, { useState } from 'react';
import { useAdminContext } from '../context/AdminContext';

export const BulkActionBar = () => {
  const { selectedItems, clearSelection } = useAdminContext();
  
  // Estados nativos para el Modal Masivo (Sin librerías externas)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newTipo, setNewTipo] = useState('');

  // Si no hay nada seleccionado, no renderizamos absolutamente nada
  if (selectedItems.length === 0) return null;

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Limpiamos los campos para la próxima vez
    setNewCategory('');
    setNewTipo('');
  };

  const handleApplyChanges = () => {
    // Aquí es donde haremos la actualización en lote en Firebase después
    console.log(`Aplicando cambios a ${selectedItems.length} elementos:`, {
      nuevaCategoria: newCategory || '(Sin cambios)',
      nuevoTipo: newTipo || '(Sin cambios)',
      itemsAfectados: selectedItems
    });
    
    // Cerramos, limpiamos campos y deseleccionamos todo
    handleCloseModal();
    clearSelection();
    alert('Cambios masivos aplicados (Ver consola para detalles)');
  };

  return (
    <>
      {/* 1. BARRA FLOTANTE INFERIOR */}
      <div className="fixed bottom-20 md:bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-full shadow-2xl z-[60] flex items-center gap-5 border border-slate-700 animate-fade-in-up">
        
        <span className="text-sm font-bold flex items-center gap-2">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-black shadow-inner">
            {selectedItems.length}
          </span> 
          sel.
        </span>
        
        <div className="h-5 w-px bg-slate-700"></div>
        
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="text-sm font-bold text-blue-400 hover:text-blue-300 transition flex items-center gap-2"
        >
          <i className="fas fa-magic"></i> Editar en Lote
        </button>
        
        <button 
          onClick={clearSelection} 
          className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition" 
          title="Cancelar Selección"
        >
          <i className="fas fa-times"></i>
        </button>

      </div>

      {/* 2. MODAL DE EDICIÓN MASIVA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 transition-opacity duration-300 pb-20 md:pb-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-slate-100 animate-slide-up">
            
            {/* Header del Modal */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <i className="fas fa-layer-group text-lg"></i>
                </div>
                <div>
                  <h2 className="font-black text-slate-900 leading-tight">Edición en Lote</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <span>{selectedItems.length}</span> elementos
                  </p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 flex items-center justify-center transition">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {/* Formulario */}
            <div className="p-6 space-y-5">
              <p className="text-[11px] font-medium text-slate-500 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                Deja en blanco lo que NO quieras cambiar.
              </p>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nueva Categoría
                </label>
                <input 
                  type="text" 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full input-modern px-4 py-3 rounded-xl font-bold text-slate-900 uppercase text-sm border border-slate-200 outline-none focus:border-blue-500" 
                  placeholder="Ej: TAPAS" 
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Comportamiento en Sistema
                </label>
                <div className="relative">
                  <select 
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value)}
                    className="w-full input-modern px-4 py-3 rounded-xl text-slate-800 font-bold text-sm appearance-none border border-slate-200 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">-- No modificar --</option>
                    <option value="PIEZA_BASE">Pieza Base Suelta</option>
                    <option value="KIT_OFICIAL">Kit Oficial (Armado Excel)</option>
                    <option value="KIT_FLEXIBLE">Kit Web (Receta en Árbol)</option>
                  </select>
                  <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 text-xs pointer-events-none"></i>
                </div>
              </div>
            </div>
            
            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={handleCloseModal} className="flex-1 py-3 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-xl transition">
                Cancelar
              </button>
              <button onClick={handleApplyChanges} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 text-sm transition-all">
                Aplicar Cambios
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
};