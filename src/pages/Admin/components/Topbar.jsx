import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf'; // 📦 Importación para generar el PDF
import { useAdminContext } from '../context/AdminContext';
import { printMassiveQRs } from '../utils/qrPrintService';
import { getCalculatedStock } from '../utils/businessRules'; // ⚙️ Reutilizamos tu regla de negocio de stock

// Configuración global para notificaciones Toast con SweetAlert2
const Toast = Swal.mixin({
  toast: true,
  position: 'bottom-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// IMPORTANTE: Asegúrate de recibir `allItems` como prop desde CentroComando
export const Topbar = ({ allItems = [] }) => { 
  const { 
    searchTerm, setSearchTerm, 
    filterType, setFilterType, 
    showOnlyPending, setShowOnlyPending,
    setIsConfigModalOpen,
    selectedItems 
  } = useAdminContext();

  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

  const viewMenuRef = useRef(null);
  const toolsMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target)) setIsViewMenuOpen(false);
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target)) setIsToolsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrintSelected = (type) => {
    if (selectedItems.length === 0) {
      Swal.fire('Atención', 'Por favor, selecciona al menos un producto usando las casillas de la tabla.', 'warning');
      return;
    }
    const itemsToPrint = allItems.filter(item => selectedItems.includes(item.id));
    printMassiveQRs(itemsToPrint, type);
    setIsToolsMenuOpen(false);
  };

  // =========================================================
  // 🔥 MIGRACIÓN DE FUNCIONES (HTML PURO -> REACT)
  // =========================================================

  // 1. DESPLEGAR EN VERCEL / GITHUB
  const handleDeployWeb = async () => {
    setIsToolsMenuOpen(false);
    
    const result = await Swal.fire({
      title: '¿Actualizar el catálogo en vivo?',
      text: 'Esto enviará la orden a GitHub para compilar la nueva versión y tardará un par de minutos en reflejarse.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, publicar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Despertando bóveda...',
      text: 'Contactando a GitHub',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const respuesta = await fetch('https://api-proxy-een.vercel.app/api/deploy', { method: 'POST' });

      if (respuesta.ok) {
        Swal.fire('¡Orden enviada!', 'En breve la web estará actualizada.', 'success');
      } else {
        const errData = await respuesta.json();
        Swal.fire('Error', 'Fallo al contactar a la Bóveda. Error: ' + errData.error, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error de conexión al intentar publicar.', 'error');
    }
  };

  // 2. GENERAR CSV PARA META (FACEBOOK)
  const handleCSVMeta = () => {
    setIsToolsMenuOpen(false);
    if (!allItems || allItems.length === 0) {
      Swal.fire('Aviso', 'No hay productos cargados en el sistema.', 'info');
      return;
    }

    Toast.fire({ icon: 'info', title: 'Leyendo JSON para Facebook...' });

    let csvContent = "id,title,description,availability,condition,price,link,image_link,brand\n";

    allItems.forEach(item => {
      // 1. FILTRO: Excluir los que digan "Sin Master"
      const stringData = JSON.stringify(item).toLowerCase();
      if (stringData.includes('sin master')) return; 

      const id = item.codigo || item.codigo_sistema_oficial || item.id;
      const title = `"${(item.nombre || item.nombre_flexible || 'Producto').replace(/"/g, '""')}"`;
      const description = item.descripcion_oficial ? `"${item.descripcion_oficial.replace(/"/g, '""')}"` : title;
      
      // Calculamos stock con tu función ya importada
      const stockReal = getCalculatedStock(item.id, allItems);
      const availability = stockReal > 0 ? "in stock" : "out of stock";
      const condition = "new";
      
      // 2. OCULTAR PRECIOS
      const price = "0.00 MXN"; 
      
      const link = `https://productoseen.web.app?q=${encodeURIComponent(String(item.category || item.categoria || '').toLowerCase())}`;
      const image_link = item.imagen || item.imagen_url || item.image || "https://dummyimage.com/600x600/fff/000.jpg&text=No+Image";
      const brand = "Envases La Economica del Norte";

      csvContent += `${id},${title},${description},${availability},${condition},${price},${link},${image_link},${brand}\n`;
    });

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const linkTag = document.createElement("a");
    linkTag.setAttribute("href", url);
    linkTag.setAttribute("download", `Catalogo_Facebook_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(linkTag);
    linkTag.click();
    document.body.removeChild(linkTag);
    
    Toast.fire({ icon: 'success', title: 'CSV descargado (Sin precios)' });
  };

  // 3. GENERAR BASE DE CONOCIMIENTO (PDF PARA IA)
  const handlePDFWhatsApp = () => {
    setIsToolsMenuOpen(false);
    if (!allItems || allItems.length === 0) {
      Swal.fire('Aviso', 'No hay productos para analizar.', 'info');
      return;
    }

    Swal.fire({
      title: 'Maquetando PDF...',
      text: 'Preparando base de conocimiento para la IA',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const doc = new jsPDF();
      
      // Encabezado
      doc.setFontSize(14);
      doc.text("Base de Conocimiento y Reglas Comerciales (IA)", 105, 15, { align: "center" });
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("INSTRUCCIONES Y REGLAS DE NEGOCIO ESTRICTAS (MEMORIZAR):", 15, 25);
      doc.setFont(undefined, 'normal');
      doc.text("• PRECIOS: NUNCA menciones precios. Solo cantidades y empaques.", 15, 30);
      doc.text("• BOLSAS: Se venden ÚNICAMENTE en múltiplos de 100 piezas.", 15, 35);
      doc.text("• TAMBOS DE LAMINA Y TÓTEMS: Venta EXCLUSIVA bajo pedido con 50% de anticipo.", 15, 40);
      doc.text("• DEMÁS PRODUCTOS: Venta suelta (desde 1 pieza) o por paquete cerrado.", 15, 45);
      
      doc.setLineWidth(0.5);
      doc.line(15, 48, 195, 48);
      
      let y = 55;

      allItems.forEach(item => {
        if (y > 270) { doc.addPage(); y = 20; }
        
        const nameLower = String(item.nombre || item.nombre_flexible || item.name || '').toLowerCase();
        const catLower = String(item.category || item.categoria || '').toLowerCase();
        
        let piezasStr = "Venta desde 1 pieza (suelta) o por paquete/caja.";
        
        // REGLAS
        if (nameLower.includes('bolsa') || catLower.includes('bolsa')) {
          piezasStr = "Venta ÚNICA en múltiplos de 100 piezas.";
        } else if (nameLower.includes('tambo de lamina') || nameLower.includes('totem') || nameLower.includes('tótem')) {
          piezasStr = "Se vende ÚNICAMENTE POR PEDIDO (Requiere 50% de anticipo).";
        } else if (item.paquetes && item.paquetes.length > 0) {
          const empaques = item.paquetes.map(p => p.piezas).sort((a,b) => a - b);
          piezasStr = `Venta desde 1 pz o en paquetes cerrados de: ${empaques.join(', ')} piezas.`;
        } else if (item.empaques_tips && item.empaques_tips.length > 0) {
          piezasStr = `Venta desde 1 pz o en paquetes cerrados de: ${item.empaques_tips.sort((a,b) => a - b).join(', ')} piezas.`;
        }

        doc.setFont(undefined, 'bold');
        doc.text(`Producto: ${item.nombre || item.nombre_flexible || item.name || 'S/N'}`, 15, y);
        y += 5;
        
        doc.setFont(undefined, 'normal');
        doc.text(`Categoría: ${item.category || item.categoria || 'General'} | Código: ${item.codigo || item.codigo_sistema_oficial || 'S/N'}`, 15, y);
        y += 5;
        
        doc.text(`Condiciones de venta: ${piezasStr}`, 15, y);
        y += 9;
      });

      doc.save(`Base_Conocimiento_IA_${new Date().toISOString().split('T')[0]}.pdf`);
      Swal.close();
      Toast.fire({ icon: 'success', title: 'PDF generado exitosamente' });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Error al generar el PDF', 'error');
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 z-40 relative">
      
      {/* 1. BUSCADOR GLOBAL */}
      <div className="relative w-full md:w-96 shrink-0">
        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs"></i>
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar código, producto o variante..." 
          className="w-full pl-8 pr-4 py-1.5 rounded-md bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 text-sm font-medium transition-all outline-none shadow-inner"
        />
      </div>

      {/* 2. HERRAMIENTAS Y FILTROS */}
      <div className="hidden md:flex items-center gap-1.5">
        
        {/* Dropdown: Vistas y Filtros */}
        <div className="relative" ref={viewMenuRef}>
          <button 
            onClick={() => { setIsViewMenuOpen(!isViewMenuOpen); setIsToolsMenuOpen(false); }}
            className={`px-3 py-1.5 rounded-md text-sm font-bold text-slate-600 flex items-center gap-2 transition-colors ${isViewMenuOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100'}`}
          >
            <i className="fas fa-filter text-slate-400 text-xs"></i> Vista <i className={`fas fa-chevron-down text-[9px] opacity-50 transition-transform ${isViewMenuOpen ? 'rotate-180' : ''}`}></i>
          </button>
          
          {isViewMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl w-56 p-2 z-50 animate-fade-in-up">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2 pt-1">Filtrar por Tipo</p>
              
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 font-bold text-xs text-slate-700 outline-none mb-2 cursor-pointer appearance-none"
              >
                <option value="ALL">📦 Todos los artículos</option>
                <option value="PIEZA_BASE">🧊 Piezas Base (Productos)</option>
                <option value="KIT_OFICIAL">📦 Kits Oficiales (Paquetes)</option>
                <option value="KIT_FLEXIBLE">🌐 Kits Web (Paquetes Web)</option>
              </select>
              
              <div className="h-px bg-slate-100 my-1"></div>
              
              <label className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={showOnlyPending}
                  onChange={(e) => setShowOnlyPending(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">Mostrar solo Faltantes</span>
              </label>
            </div>
          )}
        </div>

        {/* Dropdown: Herramientas */}
        <div className="relative" ref={toolsMenuRef}>
          <button 
            onClick={() => { setIsToolsMenuOpen(!isToolsMenuOpen); setIsViewMenuOpen(false); }}
            className={`px-3 py-1.5 rounded-md text-sm font-bold text-slate-600 flex items-center gap-2 transition-colors ${isToolsMenuOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100'}`}
          >
            <i className="fas fa-wrench text-slate-400 text-xs"></i> Herramientas <i className={`fas fa-chevron-down text-[9px] opacity-50 transition-transform ${isToolsMenuOpen ? 'rotate-180' : ''}`}></i>
          </button>
          
          {isToolsMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl w-52 p-1.5 z-50 animate-fade-in-up">
              
              <button onClick={() => alert('Exportar Excel Faltantes (Próximamente)')} className="w-full text-left px-3 py-2 hover:bg-orange-50 hover:text-orange-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fas fa-file-excel w-4 text-center text-orange-500"></i> Exportar Faltantes
              </button>
              
              <button 
                onClick={() => handlePrintSelected('VITRINA')} 
                className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-qrcode w-4 text-center text-slate-400"></i> Imprimir QRs (Vitrina) <span className="ml-auto bg-slate-200 text-[9px] px-1.5 rounded">{selectedItems.length}</span>
              </button>

              <button 
                onClick={() => handlePrintSelected('ALMACEN')} 
                className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-box w-4 text-center text-slate-400"></i> Imprimir QRs (Almacén) <span className="ml-auto bg-slate-200 text-[9px] px-1.5 rounded">{selectedItems.length}</span>
              </button>
              
              <div className="h-px bg-slate-100 my-1"></div>
              
              {/* ✅ BOTONES DE MIGRACIÓN CONECTADOS */}
              <button onClick={handleDeployWeb} className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fas fa-rocket w-4 text-center text-blue-500"></i> Compilar y Publicar Web
              </button>
              
              <div className="h-px bg-slate-100 my-1"></div>
              
              <button onClick={handleCSVMeta} className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fab fa-facebook w-4 text-center text-blue-600"></i> Descargar CSV Meta
              </button>
              
              <button onClick={handlePDFWhatsApp} className="w-full text-left px-3 py-2 hover:bg-green-50 hover:text-green-700 rounded-md text-xs font-bold text-slate-700 transition-colors flex items-center gap-2">
                <i className="fab fa-whatsapp w-4 text-center text-green-500"></i> Descargar PDF para IA
              </button>

            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-2"></div>

        {/* Botón Nuevo */}
        <button 
          onClick={() => setIsConfigModalOpen(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md font-bold text-sm transition shadow-sm flex items-center gap-2 active:scale-95"
        >
          <i className="fas fa-plus text-xs"></i> Nuevo
        </button>
        
      </div>
    </div>
  );
};