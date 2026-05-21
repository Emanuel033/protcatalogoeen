import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Swal from 'sweetalert2';

// Este componente recibe:
// 1. productos: El arreglo de tu catálogo actual
// 2. onScanSuccess: La función que suma las cantidades a tu lista de conteo
// 3. onClose: Para cerrar la cámara
function QRScannerInventario({ productos, onScanSuccess, onClose }) {
  const [html5QrCode, setHtml5QrCode] = useState(null);

  useEffect(() => {
    const qrCode = new Html5Qrcode("reader-inventario");
    setHtml5QrCode(qrCode);

    qrCode.start(
      { facingMode: "environment" }, // Cámara trasera
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        
        // ==============================================================
        // 🧠 LÓGICA DE PARSEO: ¿Es Suelta, Paquete o Vitrina?
        // ==============================================================
        let idProducto = decodedText.trim();
        let cantidadASumar = 1;
        let tipoEscaneo = 'SUELTA';

        // 1. Si es un PAQUETE (Formato: PKG|ID|SKU|PIEZAS)
        if (decodedText.startsWith('PKG|')) {
          const partes = decodedText.split('|');
          idProducto = partes[1]; // El ID de Firebase
          cantidadASumar = parseInt(partes[3], 10) || 1; // La cantidad de piezas de la caja
          tipoEscaneo = 'PAQUETE';
        } 
        // 2. Si es QR de INVENTARIO interno (Formato: INV|ID)
        else if (decodedText.startsWith('INV|')) {
          const partes = decodedText.split('|');
          idProducto = partes[1];
        }
        // 3. Si por error escanean uno de VITRINA (Trae la URL)
        else if (decodedText.includes('?add=')) {
          idProducto = decodedText.split('?add=')[1];
        }

        // ==============================================================
        // 🔍 BÚSQUEDA EN LA LISTA ACTUAL DEL INVENTARIO
        // ==============================================================
        const productoEncontrado = productos.find(
          p => p.id === idProducto || p.codigo_sistema_oficial === idProducto
        );

        if (productoEncontrado) {
          // Pausamos medio segundo para no escanear el mismo QR 10 veces por accidente
          qrCode.pause(true);
          
          // Ejecutamos tu función para sumar al conteo
          onScanSuccess(productoEncontrado, cantidadASumar, tipoEscaneo);

          // Aviso visual rápido y no intrusivo
          Swal.fire({
            title: `+${cantidadASumar} Añadido`,
            text: `${productoEncontrado.nombre_flexible || 'Producto'}`,
            icon: 'success',
            toast: true,
            position: 'top-end',
            timer: 1000,
            showConfirmButton: false
          }).then(() => {
            // Reanudamos la cámara automáticamente para el siguiente producto
            qrCode.resume();
          });

        } else {
          qrCode.pause(true);
          Swal.fire({
            title: 'No encontrado',
            text: 'Este código no coincide con ningún producto cargado.',
            icon: 'error',
            confirmButtonText: 'Continuar'
          }).then(() => qrCode.resume());
        }
      },
      (errorMessage) => { /* Silenciar errores de enfoque de cámara */ }
    ).catch(err => {
      console.error("Error al iniciar cámara:", err);
      Swal.fire('Error', 'No se pudo iniciar la cámara. Revisa los permisos.', 'error');
      onClose();
    });

    return () => {
      if (qrCode.isScanning) {
        qrCode.stop().catch(console.error);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl relative">
        
        {/* Header del Escáner */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <div>
            <h3 className="font-black text-lg leading-none">Modo Escáner</h3>
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1">
              Inventario en Tiempo Real
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 bg-indigo-500/50 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        {/* Cámara */}
        <div className="w-full bg-black relative aspect-square">
          <div id="reader-inventario" className="w-full h-full object-cover"></div>
        </div>

        {/* Footer / Instrucciones */}
        <div className="p-5 text-center bg-slate-50 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500">
            Apunta a un QR de Producto Suelto o una Caja.<br/>
            <span className="text-indigo-600">El sistema sumará las piezas automáticamente.</span>
          </p>
        </div>

      </div>
    </div>
  );
}

export default QRScannerInventario;