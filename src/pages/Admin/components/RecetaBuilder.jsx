import React from 'react';

export const RecetaBuilder = ({ receta = [], onChange, allItems = [] }) => {
  
  // Función para añadir una fila vacía
  const addRow = () => {
    onChange([...receta, { id_producto: '', cantidad: 1, nombre: '' }]);
  };

  // Función para eliminar una fila
  const removeRow = (index) => {
    const newReceta = [...receta];
    newReceta.splice(index, 1);
    onChange(newReceta);
  };

  // Función para actualizar un dato (el producto elegido o su cantidad)
  const updateRow = (index, field, value) => {
    const newReceta = [...receta];
    newReceta[index][field] = value;
    
    // Si cambiamos el producto, auto-guardamos su nombre para tenerlo de referencia fácil en Firebase
    if (field === 'id_producto') {
      const prod = allItems.find(p => p.id === value);
      newReceta[index].nombre = prod ? prod.nombre_flexible : '';
    }
    
    onChange(newReceta);
  };

  // Filtramos para que en la receta solo puedas meter Piezas Base o Kits Oficiales (evitamos loops infinitos)
  const opciones = allItems.filter(p => p.tipo_item !== 'KIT_FLEXIBLE');

  return (
    <div className="w-full">
      {receta.length === 0 && (
        <p className="text-xs text-slate-400 font-bold mb-3 text-center">Este kit aún no tiene componentes.</p>
      )}

      {/* LISTA DE COMPONENTES */}
      <div className="space-y-2 mb-4 w-full">
        {receta.map((item, index) => (
          <div key={index} className="flex gap-2 items-center bg-white p-2 border border-slate-200 rounded-xl shadow-sm animate-fade-in-up">
            
            {/* SELECTOR DE PRODUCTO */}
            <select 
              value={item.id_producto} 
              onChange={(e) => updateRow(index, 'id_producto', e.target.value)}
              className="flex-1 input-modern px-3 py-2 rounded-lg text-sm border border-slate-200 outline-none focus:border-blue-500 font-medium text-slate-700 bg-slate-50"
            >
              <option value="">-- Selecciona un componente --</option>
              {opciones.map(op => (
                <option key={op.id} value={op.id}>
                  {op.nombre_flexible} {op.codigo_sistema_oficial ? `(${op.codigo_sistema_oficial})` : ''}
                </option>
              ))}
            </select>
            
            {/* INPUT DE CANTIDAD */}
            <div className="relative">
              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[10px] text-slate-400 font-bold">Cant:</span>
              <input 
                type="number" 
                min="1" 
                value={item.cantidad} 
                onChange={(e) => updateRow(index, 'cantidad', Number(e.target.value))}
                className="w-24 input-modern pl-10 pr-3 py-2 rounded-lg text-sm border border-slate-200 outline-none text-center font-black focus:border-blue-500"
              />
            </div>
            
            {/* BOTÓN ELIMINAR */}
            <button 
              type="button" 
              onClick={() => removeRow(index)}
              className="w-9 h-9 shrink-0 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors border border-red-100"
              title="Quitar componente"
            >
              <i className="fas fa-trash-alt text-xs"></i>
            </button>
          </div>
        ))}
      </div>

      {/* BOTÓN AÑADIR */}
      <div className="flex justify-center">
        <button 
          type="button" 
          onClick={addRow}
          className="text-xs bg-white border border-slate-200 text-slate-700 font-bold hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
        >
          <i className="fas fa-plus text-blue-500"></i> Añadir Componente
        </button>
      </div>
    </div>
  );
};