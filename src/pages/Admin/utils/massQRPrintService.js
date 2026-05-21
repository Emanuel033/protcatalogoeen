/**
 * Servicio de Impresión Masiva de QRs
 * Migrado y actualizado a Firebase V9 Modular
 */

import { db } from '../../../firebase'; 
// 🔥 IMPORTACIÓN CLAVE PARA FIREBASE V9 MODULAR
import { collection, getDocs } from 'firebase/firestore';

/**
 * Construye el HTML para imprimir etiquetas con QRs
 */
function buildPrintHTML(dataArray, quantityPerLabel, isPackage, baseUrl, labelFormat) {
  const labelsPerPage = 30;
  let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Impresión de QRs</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: white; }
        .page { page-break-after: always; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 10px; }
        .label { 
            width: 100%; 
            height: 100px; 
            border: 1px solid #ccc; 
            padding: 8px; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            font-size: 10px;
            text-align: center;
            page-break-inside: avoid;
        }
        .qr { margin-bottom: 4px; }
        .qr canvas { max-width: 60px !important; max-height: 60px !important; }
        .label h4 { font-weight: bold; font-size: 9px; margin: 2px 0; }
        .label p { font-size: 8px; color: #666; margin: 1px 0; }
    </style>
</head>
<body>`;

  let labels = [];
  dataArray.forEach(item => {
    for (let i = 0; i < quantityPerLabel; i++) {
      labels.push(item);
    }
  });

  for (let i = 0; i < labels.length; i += labelsPerPage) {
    const chunk = labels.slice(i, i + labelsPerPage);
    html += '<div class="page">';
    
    chunk.forEach(lbl => {
      html += `
        <div class="label">
            <div class="qr" id="qr-${lbl.id.replace(/[^a-zA-Z0-9]/g, '-')}"></div>
            <div>
                <h4>${lbl.title}</h4>
                <p>${lbl.sub}</p>
            </div>
        </div>`;
    });

    for (let j = chunk.length; j < labelsPerPage; j++) {
      html += '<div class="label"></div>';
    }
    html += '</div>';
  }

  html += `<script>
    const qrData = ${JSON.stringify(labels)};
    qrData.forEach(item => {
      // Limpiamos el ID para evitar errores en el selector de JS
      const safeId = item.id.replace(/[^a-zA-Z0-9]/g, '-');
      new QRCode(document.getElementById('qr-' + safeId), {
        text: item.id,
        width: 60,
        height: 60,
        colorDark: '#000000',
        colorLight: '#ffffff'
      });
    });
    window.onload = function() { 
      setTimeout(() => { window.print(); }, 500); 
    }
  </script></body></html>`;

  return html;
}

/**
 * Obtiene los productos filtrados
 */
function getFilteredProductsForPrint(filters, allItems, isProductPending) {
  const { searchTerm = '', filterType = 'ALL', showOnlyPending = false } = filters;
  const term = searchTerm.toLowerCase().trim();

  return allItems.filter(p => {
    const flexName = String(p.nombre_flexible || '').toLowerCase();
    const sysCode = String(p.codigo_sistema_oficial || '').toLowerCase();
    const cat = String(p.categoria || '').toLowerCase();

    const matchSearch = term === '' || flexName.includes(term) || sysCode.includes(term) || cat.includes(term);
    if (!matchSearch) return false;

    if (showOnlyPending && !isProductPending(p)) return false;

    const pType = p.tipo_item || 'PIEZA_BASE';
    if (filterType !== 'ALL' && pType !== filterType) return false;

    return true;
  });
}

/**
 * Imprime QRs de paquetes masivamente (CORREGIDO A FIREBASE V9)
 */
export async function printAllPackagesQRs(
  allItems,
  isProductPending,
  filters,
  showToast,
  customPrompt
) {
  try {
    const filtered = getFilteredProductsForPrint(filters, allItems, isProductPending).filter(
      p => !p.tipo_item || p.tipo_item === 'PIEZA_BASE'
    );

    if (filtered.length === 0) {
      showToast('No hay PIEZAS BASE filtradas para imprimir.', 'error');
      return;
    }

    showToast('Calculando paquetes...', 'info');

    let dataArray = [];
    
    const promises = filtered.map(async (p) => {
      // 🔥 SOLUCIÓN: Consulta con sintaxis de Firebase V9 Modular
      const paquetesRef = collection(db, 'productos_master', p.id, 'paquetes');
      const snap = await getDocs(paquetesRef);

      snap.forEach(doc => {
        const pkg = doc.data();
        dataArray.push({
          id: `PKG|${p.id}|${pkg.sku}|${pkg.piezas}`,
          title: p.nombre_flexible,
          sub: `SKU: ${pkg.sku} (${pkg.piezas} PZ)`
        });
      });
    });

    await Promise.all(promises);

    if (dataArray.length === 0) {
      showToast('No se encontraron empaques en los productos filtrados.', 'error');
      return;
    }

    const qty = await customPrompt(
      `Se encontraron ${dataArray.length} cajas base.\n¿Cuántas etiquetas POR CAJA imprimir?`,
      '1'
    );

    if (!qty || qty <= 0) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(buildPrintHTML(dataArray, parseInt(qty), true, '', '3x10'));
    printWindow.document.close();
  } catch (e) {
    console.error('Error en printAllPackagesQRs:', e);
    showToast('Error al obtener los paquetes. Revisa la consola.', 'error');
  }
}

/**
 * Imprime QRs masivamente (inventario o vitrina)
 */
export async function printAllQRs(
  printType,
  allItems,
  isProductPending,
  filters,
  vitrinaUrl,
  showToast,
  customPrompt
) {
  try {
    let filtered = getFilteredProductsForPrint(filters, allItems, isProductPending);

    if (printType === 'inventario') {
      filtered = filtered.filter(p => !p.tipo_item || p.tipo_item === 'PIEZA_BASE');
      if (filtered.length === 0) {
        showToast('Solo las Piezas Base tienen QR de inventario interno.', 'error');
        return;
      }
    }

    if (filtered.length === 0) {
      showToast('No hay productos válidos filtrados', 'error');
      return;
    }

    let baseUrl = '';
    if (printType === 'vitrina') {
      baseUrl = vitrinaUrl || 'https://productoseen.web.app/?add=';
      if (!baseUrl) {
        showToast('URL requerida', 'error');
        return;
      }
    }

    const qty = await customPrompt(
      `Imprimiendo ${filtered.length} productos.\n¿Cuántas etiquetas POR PRODUCTO deseas?`,
      '1'
    );

    if (!qty || qty <= 0) return;

    const dataArray = filtered.map(p => {
      let qrContent = '';
      if (printType === 'inventario') {
        qrContent = p.codigo_sistema_oficial || `INV|${p.id}`;
      } else if (printType === 'vitrina') {
        qrContent = `${baseUrl}${p.id}`;
      }

      return {
        id: qrContent,
        title: p.nombre_flexible || 'S/N',
        sub: printType === 'inventario' ? `Cód: ${p.codigo_sistema_oficial}` : `SKU: ${p.id}`
      };
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(buildPrintHTML(dataArray, parseInt(qty), false, baseUrl, '3x10'));
    printWindow.document.close();
  } catch (e) {
    console.error('Error en printAllQRs:', e);
    showToast('Error al procesar la impresión.', 'error');
  }
}

export default {
  printAllQRs,
  printAllPackagesQRs,
  buildPrintHTML,
  getFilteredProductsForPrint
};
