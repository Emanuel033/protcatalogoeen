import React from 'react';

export default function Sidebar({ currentTab, setCurrentTab, isCollapsed, toggleSidebar }) {
    return (
        <aside className={`${isCollapsed ? 'w-[80px]' : 'w-[250px]'} hidden md:flex bg-white border-r border-slate-200 flex-col transition-all duration-300 relative`}>
            <button onClick={toggleSidebar} className="absolute -right-3.5 top-6 bg-white border border-slate-200 rounded-full w-7 h-7 flex items-center justify-center shadow-md z-50">
                <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-xs`}></i>
            </button>

            <nav className="flex-1 py-6 flex flex-col overflow-y-auto space-y-1">
                <button 
                    onClick={() => setCurrentTab('master')} 
                    className={`w-full flex items-center px-6 py-3.5 font-bold ${currentTab === 'master' ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <i className="fas fa-box w-5"></i>
                    {!isCollapsed && <span className="ml-3 text-sm">Catálogo Maestro</span>}
                </button>

                <button 
                    onClick={() => setCurrentTab('import')} 
                    className={`w-full flex items-center px-6 py-3.5 font-bold ${currentTab === 'import' ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <i className="fas fa-cloud-download-alt w-5"></i>
                    {!isCollapsed && <span className="ml-3 text-sm">Importaciones</span>}
                </button>
            </nav>
        </aside>
    );
}