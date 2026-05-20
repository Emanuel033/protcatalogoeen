import React, { useState } from 'react';
import { useAdminData } from './hooks/useAdminData';
import { AdminProvider, useAdminContext } from './context/AdminContext';
import { Sidebar } from './components/Sidebar';
// Importaremos estas tablas en el siguiente paso:
import { MasterTable } from './components/tables/MasterTable';
//import { GroupedTable } from './components/tables/GroupedTable';
import { ImportTable } from './components/tables/ImportTable';
import { BulkActionBar } from './components/BulkActionBar';
import { Topbar } from './components/Topbar';
import { ProductConfigModal } from './components/ProductConfigModal';

const CentroComandoContent = () => {
  const { userRole, userName, isLoadingAuth, authError, allItems, facturacionCatalog, isDataLoading } = useAdminData();
  const { activeTab, masterView, lightboxImg, setLightboxImg, isConfigModalOpen, setIsConfigModalOpen } = useAdminContext();
 

  // 1. Estados de Autenticación
  if (isLoadingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <i className="fas fa-spinner fa-spin text-4xl text-blue-500"></i>
      </div>
    );
  }

  if (authError || !userRole) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center">
          <i className="fas fa-shield-alt text-4xl text-red-500 mb-4"></i>
          <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-sm text-slate-500">{authError || "Inicia sesión para continuar."}</p>
        </div>
      </div>
    );
  }

  // 2. Cálculo rápido del Badge de Importaciones (para el Sidebar)
  const masterCodes = allItems.map(p => String(p.codigo_sistema_oficial || '')).filter(Boolean);
  const pendingImportCount = facturacionCatalog.filter(fact => {
    const code = String(fact.codigo_sistema_oficial || fact.codigo || fact.Codigo || fact.id || '');
    return !masterCodes.includes(code);
  }).length;

  // 3. Render del Shell (Sidebar + Area Principal)
  return (
    <div className="h-screen flex overflow-hidden relative pb-[70px] md:pb-0 bg-slate-50/50">
      
      <Sidebar 
        userRole={userRole} 
        userName={userName} 
        pendingImportCount={pendingImportCount} 
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* TOPBAR MÓVIL (Tu header original .md:hidden) */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-4 flex justify-between items-center z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200/50">
              <i className="fas fa-server text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">Admin EEN</h1>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-1">Centro de Comando</p>
            </div>
          </div>
          {/* Aquí irá el botón de Nuevo Producto más adelante */}
          {userRole === 'admin' && (
            <button className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
              <i className="fas fa-plus"></i>
            </button>
          )}
        </header>

        {/* NUEVO TOPBAR DE ESCRITORIO (Buscador y Filtros) */}
        <Topbar allItems={allItems} />

        {/* CONTENEDOR DE LA PANTALLA ACTIVA */}
        <main className="flex-1 overflow-hidden relative w-full flex flex-col">
          {isDataLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <i className="fas fa-sync fa-spin text-3xl mb-4"></i>
              <p className="text-sm font-bold">Cargando base de datos...</p>
            </div>
          ) : (
            <>
              {/* Aquí montaremos los componentes según la pestaña activa */}
              {activeTab === 'master' && (
                <div className="h-full w-full flex flex-col relative bg-white">
                  <MasterTable allItems={allItems} />
                </div>
              )}
              {activeTab === 'import' && userRole === 'admin' && (
  <div className="h-full w-full flex flex-col relative bg-white">
    <ImportTable allItems={allItems} facturacionCatalog={facturacionCatalog} />
  </div>
)}
            </>
          )}
        </main>
      </div>
      {/* COMPONENTES FLOTANTES GLOBALES */}
    <BulkActionBar />
    <ProductConfigModal 
        isOpen={isConfigModalOpen} 
        onClose={() => setIsConfigModalOpen(false)} 
        allItems={allItems}
      />
    {/* --- NUEVO: VISOR DE IMÁGENES (LIGHTBOX) --- */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out transition-opacity duration-300 animate-fade-in"
          onClick={() => setLightboxImg(null)} // Se cierra al hacer clic en cualquier lado
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <img 
              src={lightboxImg} 
              alt="Vista ampliada" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-scale-up" 
            />
            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxImg(null); }}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/20"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>
      )}

    {/* <ProductConfigModal /> */}
    </div>
  );
};



// Envolvemos el componente en el Provider para que el Contexto funcione
export default function CentroComando() {
  return (
    <AdminProvider>
      <CentroComandoContent />
    </AdminProvider>
  );
}
