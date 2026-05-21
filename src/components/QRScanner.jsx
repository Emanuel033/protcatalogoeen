import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Swal from 'sweetalert2'; // ✨ Le damos un toque moderno a los avisos
import { useApp } from '../context/AppContext';

function QRScanner() {
  const { productos, agregarAlCarrito, setIsCartOpen } = useApp();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState(null);

  // Escuchar el evento que manda el botón del CartDrawer para abrir la cámara
  useEffect(() => {
    const handleOpenScanner = () => setIsScannerOpen(true);
    window.addEventListener('open-qr-scanner', handleOpenScanner);
    return () => window.removeEventListener('open-qr-scanner', handleOpenScanner);
  }, []);

  useEffect(() => {
    if (isScannerOpen) {
      const qrCode = new Html5Qrcode("reader");
      setHtml5QrCode(qrCode);

      qrCode.start(
        { facingMode: "environment" }, // Usa la cámara trasera del celular
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // =======================================================
          // ✨ AQUÍ ESTÁ LA MAGIA QUE CONVIERTE LA URL EN UN ID
          // =======================================================
          let productId = decodedText.trim();
          
          // Si el código escaneado trae la URL de vitrina, le cortamos esa parte y nos quedamos solo con el ID
          if (decodedText.includes('?add=')) {
            productId = decodedText.split('?add=')[1];
          }

          // Buscamos el producto por su ID o por su código oficial
          const producto = productos.find(p => p.id === productId || p.codigo_sistema_oficial === productId);
          
          if (producto) {
            // Si lo encuentra, detenemos la cámara
            qrCode.stop().then(() => {
              setIsScannerOpen(false);
              
              // Lo agregamos a la bolsa y la abrimos
              agregarAlCarrito(producto, 1);
              setIsCartOpen(true); 
              
              // Le avisamos al cliente con un Toast bonito
              Swal.fire({
                title: '¡Agregado!',
                text: `${producto.nombre_flexible || producto.name} se añadió a tu pedido.`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
              });
            });
          } else {
            // Si el código no existe en la base de datos, pausamos la cámara un segundo para mostrar el error sin spamear
            qrCode.pause(true);
            Swal.fire({
              title: 'Error', 
              text: 'Producto no encontrado o fuera de stock.', 
              icon: 'error',
              confirmButtonColor: '#4f46e5'
            }).then(() => qrCode.resume());
          }
        },
        (errorMessage) => {
          // Ignoramos los errores de cuando la cámara no está enfocando un QR
        }
      ).catch(err => {
        console.error("Error al iniciar cámara:", err);
        Swal.fire('Atención', 'Asegúrate de darle permisos de cámara al navegador.', 'warning');
        setIsScannerOpen(false);
      });
    } else {
      // Apagar la cámara si se cierra el modal
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    }

    return () => {
      // Limpieza de seguridad al desmontar
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isScannerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si no está abierto, no renderizamos nada
  if (!isScannerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-opacity animate-fade-in">
      <div className="bg-white p-5 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <i className="fa-solid fa-qrcode text-lg"></i>
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg leading-tight">Escanear</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Apunta al código</p>
            </div>
          </div>
          <button onClick={() => setIsScannerOpen(false)} className="w-8 h-8 bg-slate-100 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
        
        {/* Contenedor del video de la cámara */}
        <div className="w-full rounded-2xl overflow-hidden shadow-inner bg-black border-4 border-slate-50 relative aspect-square">
          <div id="reader" className="w-full h-full object-cover"></div>
        </div>
        
        <p className="text-center text-xs text-slate-500 mt-5 font-medium px-4">
          Ubica el código QR dentro del recuadro para agregarlo automáticamente.
        </p>
      </div>
    </div>
  );
}

export default QRScanner;
