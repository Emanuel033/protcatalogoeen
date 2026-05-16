import { useState } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { auth } from '../../../firebase'; // Ajusta la ruta a tu firebase.js
import { signOut } from 'firebase/auth';

export const Sidebar = ({ userRole, userName, pendingImportCount = 0 }) => {
  const { activeTab, handleTabChange } = useAdminContext();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Opcional: window.location.reload() o redirigir con react-router
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  // Validaciones de rol
  const isAdmin = userRole === 'admin';

  return (
    <>
      {/* SIDEBAR ESCRITORIO */}
      <aside 
        className={`hidden md:flex bg-white border-r border-slate-200 flex-col z-30 shrink-0 shadow-sm relative transition-all duration-300 ${isCollapsed ? 'w-[80px]' : 'w-[250px] lg:w-[280px]'}`}
      >
        {/* Botón de Colapsar */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="absolute -right-3.5 top-6 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-full w-7 h-7 flex items-center justify-center shadow-md z-50 transition-transform"
        >
          <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-xs`}></i>
        </button>

        {/* Logo / Header Sidebar */}
        <div className={`h-20 flex items-center border-b border-slate-100 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
          <div className={`w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`}>
            <i className="fas fa-server text-white text-[15px]"></i>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <span className="text-xl font-black tracking-tight text-slate-900 leading-none block truncate">Admin EEN</span>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">Centro de Comando</p>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 py-6 flex flex-col overflow-y-auto custom-scroll space-y-1">
          {!isCollapsed && <p className="px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Gestión Principal</p>}
          
          <button 
            onClick={() => handleTabChange('master')} 
            className={`w-full flex items-center py-3.5 transition-colors group ${activeTab === 'master' ? 'bg-blue-50/80 text-blue-700 font-bold border-r-4 border-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-bold border-r-4 border-transparent'} ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}
          >
            <div className={`shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`}><i className="fas fa-box text-lg text-center w-5"></i></div>
            {!isCollapsed && <span className="text-sm whitespace-nowrap overflow-hidden">Catálogo Maestro</span>}
          </button>
          
          {/* Restricción: Solo Admin ve Importaciones */}
          {isAdmin && (
            <>
              {!isCollapsed && <p className="px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider mt-6 mb-2">Administración</p>}
              <button 
                onClick={() => handleTabChange('import')} 
                className={`w-full flex items-center justify-between py-3.5 transition-colors relative group ${activeTab === 'import' ? 'bg-blue-50/80 text-blue-700 font-bold border-r-4 border-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-bold border-r-4 border-transparent'} ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}
              >
                <div className="flex items-center w-full justify-center md:justify-start">
                  <div className={`shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`}><i className="fas fa-cloud-download-alt text-lg text-center w-5"></i></div>
                  {!isCollapsed && <span className="text-sm whitespace-nowrap overflow-hidden">Importaciones</span>}
                </div>
                {/* Badge de Pendientes */}
                {!isCollapsed && pendingImportCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow">{pendingImportCount}</span>
                )}
                {/* Badge para cuando está colapsado (flotante) */}
                {isCollapsed && pendingImportCount > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black w-3 h-3 flex items-center justify-center rounded-full shadow"></span>
                )}
              </button>
            </>
          )}
        </nav>

        {/* Footer Sidebar (Perfil) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className={`flex items-center p-2 bg-white rounded-2xl border border-slate-200 shadow-sm ${isCollapsed ? 'justify-center' : ''}`}>
            <div className={`w-10 h-10 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center font-bold shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`}>
              <i className="fas fa-user"></i>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 truncate leading-none">{userName}</p>
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider mt-1 border border-blue-100 bg-blue-50 inline-block px-1.5 py-0.5 rounded">
                  {userRole === 'admin' ? 'ADMIN' : 'ALMACÉN'}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <button onClick={handleLogout} className="w-9 h-9 shrink-0 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition flex items-center justify-center ml-2" title="Cerrar Sesión">
                <i className="fas fa-sign-out-alt"></i>
              </button>
            )}
          </div>
          {isCollapsed && (
            <button onClick={handleLogout} className="w-full mt-2 h-9 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition flex items-center justify-center" title="Cerrar Sesión">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          )}
        </div>
      </aside>

      {/* NAVBAR MÓVIL (Glass nav de tu original) */}
      <nav className="md:hidden glass-nav fixed bottom-0 w-full z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-2">
          <button onClick={() => handleTabChange('master')} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'master' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-800'}`}>
            <i className={`fas fa-layer-group text-xl mb-1 transition-transform ${activeTab === 'master' ? '-translate-y-1 scale-110' : ''}`}></i>
            <span className="text-[10px] font-bold tracking-wide">Catálogo</span>
          </button>
          {isAdmin && (
            <button onClick={() => handleTabChange('import')} className={`flex flex-col items-center justify-center w-full h-full relative transition-colors ${activeTab === 'import' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-800'}`}>
              <i className={`fas fa-cloud-download-alt text-xl mb-1 transition-transform ${activeTab === 'import' ? '-translate-y-1 scale-110' : ''}`}></i>
              <span className="text-[10px] font-bold tracking-wide">Importar</span>
              {pendingImportCount > 0 && (
                <span className="absolute top-2 right-6 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow">{pendingImportCount}</span>
              )}
            </button>
          )}
        </div>
      </nav>
    </>
  );
};