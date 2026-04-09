import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '../context/AppContext';

function QRScanner() {
  const { productos, agregarAlCarrito, toggleCart, isCartOpen } = useApp();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState(null);

  useEffect(() => {
    const handleOpenScanner = () => setIsScannerOpen(true);
    window.addEventListener('open-qr-scanner', handleOpenScanner);
    return () => window.removeEventListener('open-qr-scanner', handleOpenScanner);
  }, []);

  useEffect(() => {
    if (isScannerOpen) {
      const timer = setTimeout(() => {
        const scanner = new Html5Qrcode("reader");
        setHtml5QrCode(scanner);

        scanner.start(
          { facingMode: "environment" }, 
          { fps: 10, qrbox: { width: 250, height: 250 } }, 
          (decodedText) => handleScanSuccess(decodedText, scanner),
          (errorMessage) => {}
        ).catch((err) => {
          console.error("Error al iniciar la cámara", err);
          alert("No se pudo iniciar la cámara. Verifica los permisos.");
          closeScanner(scanner);
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isScannerOpen]);

  const handleScanSuccess = (decodedText, scanner) => {
    closeScanner(scanner);
    let productId = decodedText.includes('add=') ? decodedText.split('add=')[1].split('&')[0] : decodedText;
    const productoEncontrado = productos.find(p => p.id === productId);

    if (productoEncontrado) {
      agregarAlCarrito(productoEncontrado, 1);
      alert(`¡${productoEncontrado.name} agregado al pedido!`);
      if (!isCartOpen) toggleCart();
    } else {
      alert("Producto no encontrado en el catálogo. Intenta actualizar la página.");
    }
  };

  const closeScanner = (scannerInstance = html5QrCode) => {
    if (scannerInstance) {
      scannerInstance.stop().then(() => {
        scannerInstance.clear();
        setHtml5QrCode(null);
      }).catch(err => console.error("Error deteniendo el escáner", err));
    }
    setIsScannerOpen(false);
  };

  if (!isScannerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden relative shadow-2xl border border-white/20">
        <div className="p-5 bg-white border-b border-slate-100 flex justify-between items-center z-10 relative">
          <h3 className="font-black text-slate-800 text-lg">Escanear Producto</h3>
          <button onClick={() => closeScanner()} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
        
        <div id="reader" className="w-full bg-slate-900 min-h-[300px] flex items-center justify-center"></div>
        
        <div className="p-5 text-center bg-white flex flex-col items-center gap-2">
          <i className="fa-solid fa-qrcode text-2xl text-indigo-200"></i>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Apunta la cámara al código QR
          </p>
        </div>
      </div>
    </div>
  );
}

export default QRScanner;
