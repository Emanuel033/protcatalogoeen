export const printMassiveQRs = (itemsToPrint, type = 'ALMACEN') => {
  if (!itemsToPrint || itemsToPrint.length === 0) {
    alert("No hay productos seleccionados o listados para imprimir.");
    return;
  }

  const printWindow = window.open('', '_blank');
  
  const isVitrina = type === 'VITRINA';
  const columns = isVitrina ? 4 : 3;
  const qrSize = isVitrina ? 90 : 130;
  const fontSizeSku = isVitrina ? '13px' : '18px';
  const fontSizeName = isVitrina ? '10px' : '12px';
  const boxHeight = isVitrina ? '150px' : '220px';

  // ESTRUCTURA HTML CLÁSICA (Compatible con tus apps lectoras)
  let html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Impresión QRs - ${type}</title>
      <style>
        @page { size: letter; margin: 10mm; }
        body { 
          font-family: 'Segoe UI', system-ui, sans-serif; 
          margin: 0; padding: 0; color: #000;
        }
        .grid { 
          display: grid; 
          grid-template-columns: repeat(${columns}, 1fr); 
          gap: 15px; 
        }
        /* CLASES CLAVE PARA COMPATIBILIDAD CON TUS APPS */
        .label, .qr-card { 
          border: 1px dashed #ccc; 
          padding: 10px; 
          text-align: center; 
          page-break-inside: avoid; 
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: ${boxHeight};
          box-sizing: border-box;
        }
        .qr-image { 
          width: ${qrSize}px; 
          height: ${qrSize}px; 
          margin-bottom: 5px;
        }
        .sku, .qr-sku { 
          font-weight: 900; 
          font-size: ${fontSizeSku}; 
          letter-spacing: 0.5px;
        }
        .name, .qr-name { 
          font-size: ${fontSizeName}; 
          color: #444; 
          margin-top: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.2;
        }
        .footer-tag {
          font-size: 8px;
          color: #888;
          margin-top: auto;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="grid" id="qr-container">
  `;

  itemsToPrint.forEach(p => {
    const sku = p.codigo_sistema_oficial || p.sku || 'SIN-CODIGO';
    const name = p.nombre_flexible || p.descripcion_oficial || 'Producto Web';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(sku)}&margin=0`;
    
    html += `
      <div class="label qr-card">
        <img src="${qrUrl}" alt="QR" class="qr-image" crossorigin="anonymous" />
        <div class="sku qr-sku">${sku}</div>
        <div class="name qr-name">${name}</div>
        <div class="footer-tag">Envases La Económica - ${type}</div>
      </div>
    `;
  });

  html += `
      </div>
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
          }, 1000);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};