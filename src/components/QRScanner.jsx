import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '../context/AppContext';

function QRScanner() {
  const { productos, agregarAlCarrito, toggleCart, isCartOpen } = useApp();
  
  // Estado para saber si el modal de la cámara está abierto
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Guardamos la instancia del escáner
  const [html5QrCode, setHtml5QrCode] = useState(null);

  // Escuchamos un evento global para abrir la cámara desde el Navbar o el Carrito
  useEffect(() => {
    const handleOpenScanner = () => setIsScannerOpen(true);
    window.addEventListener('open-qr-scanner', handleOpenScanner);
    return () => window.removeEventListener('open-qr-scanner', handleOpenScanner);
  }, []);

  // Iniciamos la cámara cuando el modal se abre
  useEffect(() => {
    if (isScannerOpen) {
      // Damos un pequeño retraso para asegurar que el div "reader" ya exista en la pantalla
      const timer = setTimeout(() => {
        const scanner = new Html5Qrcode("reader");
        setHtml5QrCode(scanner);

        scanner.start(
          { facingMode: "environment" }, // Usar cámara trasera
          { fps: 10, qrbox: { width: 250, height: 250 } }, // Configuración visual
          (decodedText) => {
            // ÉXITO: Leyó un código
            handleScanSuccess(decodedText, scanner);
          },
          (errorMessage) => {
            // Ignoramos los errores de lectura constantes (es normal mientras busca el código)
          }
        ).catch((err) => {
          console.error("Error al iniciar la cámara", err);
          alert("No se pudo iniciar la cámara. Verifica los permisos.");
          closeScanner(scanner);
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isScannerOpen]);

  // Función que se ejecuta cuando lee un código válido
  const handleScanSuccess = (decodedText, scanner) => {
    // Detenemos la cámara
    closeScanner(scanner);

    // Extraemos el ID del producto (Tu lógica original de URL params o ID directo)
    let productId = decodedText.includes('add=') ? decodedText.split('add=')[1].split('&')[0] : decodedText;

    // Buscamos el producto en nuestra base de datos local
    const productoEncontrado = productos.find(p => p.id === productId);

    if (productoEncontrado) {
      // Lo agregamos al carrito
      agregarAlCarrito(productoEncontrado, 1);
      alert(`¡${productoEncontrado.name} agregado al pedido!`);
      
      // Si el carrito está cerrado, lo abrimos para que vea su producto
      if (!isCartOpen) toggleCart();
    } else {
      alert("Producto no encontrado en el catálogo. Intenta actualizar la página.");
    }
  };

  // Función para apagar la cámara y cerrar el modal
  const closeScanner = (scannerInstance = html5QrCode) => {
    if (scannerInstance) {
      scannerInstance.stop().then(() => {
        scannerInstance.clear();
        setHtml5QrCode(null);
      }).catch(err => console.error("Error deteniendo el escáner", err));
    }
    setIsScannerOpen(false);
  };

  // Si el modal está cerrado, no dibujamos nada
  if (!isScannerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden relative shadow-2xl">
        <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
          <h3 className="font-bold">Escanear Producto</h3>
          <button onClick={() => closeScanner()} className="hover:text-red-400 transition">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>
        
        {/* Aquí es donde la librería dibujará el video de la cámara */}
        <div id="reader" className="w-full bg-black min-h-[300px]"></div>
        
        <div className="p-4 text-center text-sm text-slate-500 bg-slate-50">
          Apunta la cámara al código QR del producto
        </div>
      </div>
    </div>
  );
}

export default QRScanner;