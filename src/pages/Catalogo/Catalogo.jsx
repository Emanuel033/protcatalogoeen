import React from 'react'
import Navbar from '../../components/Navbar'
import Hero from '../../components/Hero'
import CategoriesBar from '../../components/CategoriesBar'
import ProductGrid from '../../components/ProductGrid'
import Footer from '../../components/Footer'
import FloatingButtons from '../../components/FloatingButtons'
import CartDrawer from '../../components/CartDrawer'
import QRScanner from '../../components/QRScanner' 
import BackupTool from '../../components/BackupTool' 
import { useApp } from '../../context/AppContext' // <--- IMPORTAMOS EL CONTEXTO

function Catalogo() {
  // Extraemos el estado de admin
  const { esAdmin, setEsAdmin } = useApp();

  return (
    <div className="bg-slate-50 font-sans text-slate-800 flex flex-col min-h-screen relative overflow-x-hidden">
      
      <Navbar />
      <Hero />
      <CategoriesBar />
       
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Renderizamos la herramienta si es Admin */}
        {esAdmin && <BackupTool onClose={() => setEsAdmin(false)} />}
        
        <ProductGrid />
      </main>

      <Footer />
      <CartDrawer />
      <FloatingButtons />
      <QRScanner />

    </div>
  )
}

export default Catalogo
