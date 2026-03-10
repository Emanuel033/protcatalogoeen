import React from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import CategoriesBar from './components/CategoriesBar'
import ProductGrid from './components/ProductGrid'
import Footer from './components/Footer'
import FloatingButtons from './components/FloatingButtons'
import CartDrawer from './components/CartDrawer'
import QRScanner from './components/QRScanner' // <--- IMPORTAMOS
import BackupTool from './components/BackupTool' // <--- IMPORTAMOS

function App() {
  return (
    <div className="bg-slate-50 font-sans text-slate-800 flex flex-col min-h-screen relative overflow-x-hidden">
      
      <Navbar />
      <Hero />
    
      <CategoriesBar />
       
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        <ProductGrid />
      </main>

      <Footer />
      <CartDrawer />
      <FloatingButtons />
      
      <QRScanner /> {/* <--- LO AGREGAMOS AQUÍ */}

    </div>
  )
}

export default App