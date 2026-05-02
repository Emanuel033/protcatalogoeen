import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import MasterCatalog from './MasterCatalog';
// import ImportManager from './ImportManager'; // Lo crearás después

export default function AdminLayout() {
    // Estado global de la vista
    const [currentTab, setCurrentTab] = useState('master');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="h-screen flex overflow-hidden bg-slate-50 text-slate-900 font-sans">
            <Sidebar 
                currentTab={currentTab} 
                setCurrentTab={setCurrentTab} 
                isCollapsed={isSidebarCollapsed} 
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            />

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <TopNav onSearch={setSearchTerm} />

                <main className="flex-1 overflow-hidden relative w-full">
                    {currentTab === 'master' && <MasterCatalog searchTerm={searchTerm} />}
                    {/* {currentTab === 'import' && <ImportManager />} */}
                </main>
            </div>
        </div>
    );
}