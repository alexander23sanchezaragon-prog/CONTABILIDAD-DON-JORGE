import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Empresa, Venta, Compra, Caja } from '../types';
import { formatCurrency, formatDate } from './utils';

export const generateFinancialReport = (
  empresa: Empresa | null,
  ventas: Venta[],
  compras: Compra[],
  caja: Caja[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  if (empresa?.logoUrl) {
    try {
      doc.addImage(empresa.logoUrl, 'PNG', 14, 10, 25, 25);
    } catch (e) {
      console.error('Error adding logo to PDF', e);
    }
  }

  const headerX = empresa?.logoUrl ? 45 : 14;
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(empresa?.nombre || 'Distribuidora QUE POLLO', headerX, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`NIT: ${empresa?.nit || 'N/A'}`, headerX, 28);
  doc.text(`Dirección: ${empresa?.direccion || 'N/A'}`, headerX, 33);
  doc.text(`Fecha de Reporte: ${new Date().toLocaleDateString()}`, headerX, 38);

  // Line separator
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(14, 45, pageWidth - 14, 45);

  // Summary Section
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Resumen Financiero', 14, 55);

  const totalVentas = ventas.reduce((acc, v) => acc + v.total, 0);
  const totalCompras = compras.reduce((acc, c) => acc + c.total, 0);
  const balance = totalVentas - totalCompras;
  const saldoCaja = caja.reduce((acc, mov) => mov.tipo === 'entrada' ? acc + mov.monto : acc - mov.monto, 0);

  doc.setFontSize(11);
  doc.text(`Ingresos Totales (Ventas):`, 14, 65);
  doc.text(`${formatCurrency(totalVentas)}`, pageWidth - 50, 65, { align: 'right' });

  doc.text(`Egresos Totales (Compras):`, 14, 72);
  doc.text(`${formatCurrency(totalCompras)}`, pageWidth - 50, 72, { align: 'right' });

  doc.setFontSize(12);
  if (balance >= 0) {
    doc.setTextColor(16, 185, 129); // emerald-500
  } else {
    doc.setTextColor(239, 68, 68); // red-500
  }
  doc.text(`Utilidad Operativa:`, 14, 82);
  doc.text(`${formatCurrency(balance)}`, pageWidth - 50, 82, { align: 'right' });

  doc.setTextColor(15, 23, 42);
  doc.text(`Saldo Final en Caja:`, 14, 89);
  doc.text(`${formatCurrency(saldoCaja)}`, pageWidth - 50, 89, { align: 'right' });

  // Ventas Recientes Table
  doc.setFontSize(14);
  doc.text('Detalle de Ventas Recientes', 14, 105);

  const ventasData = ventas.slice(0, 20).map(v => [
    v.numeroFactura,
    v.clienteNombre,
    formatDate(v.fecha),
    v.tipoPago.toUpperCase(),
    formatCurrency(v.total)
  ]);

  autoTable(doc, {
    startY: 110,
    head: [['Factura', 'Cliente', 'Fecha', 'Tipo', 'Total']],
    body: ventasData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }, // blue-500
    styles: { fontSize: 9 }
  });

  // Compras Recientes Table
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Detalle de Compras Recientes', 14, finalY);

  const comprasData = compras.slice(0, 20).map(c => [
    c.numeroFactura,
    c.proveedorNombre,
    formatDate(c.fecha),
    c.tipoPago.toUpperCase(),
    formatCurrency(c.total)
  ]);

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Factura', 'Proveedor', 'Fecha', 'Tipo', 'Total']],
    body: comprasData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] }, // slate-900
    styles: { fontSize: 9 }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount} - Generado por Dist. QUE POLLO ERP`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`Reporte_Financiero_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateInvoicePDF = (
  empresa: Empresa | null,
  data: Venta | Compra,
  items: any[],
  type: 'venta' | 'compra'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Color theme
  const primaryColor: [number, number, number] = type === 'venta' ? [16, 185, 129] : [59, 130, 246]; // emerald vs blue

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  if (empresa?.logoUrl) {
    try {
      doc.addImage(empresa.logoUrl, 'PNG', 14, 5, 30, 30);
    } catch (e) {
      console.error('Error adding logo to PDF', e);
    }
  }

  const titleX = empresa?.logoUrl ? 50 : 14;
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text(empresa?.nombre || 'Distribuidora QUE POLLO', titleX, 25);
  
  doc.setFontSize(10);
  doc.text(type === 'venta' ? 'FACTURA DE VENTA' : 'RESUMEN DE COMPRA', pageWidth - 14, 25, { align: 'right' });
  doc.text(data.numeroFactura, pageWidth - 14, 32, { align: 'right' });

  // Company Info
  doc.setTextColor(15, 23, 42); // reset to dark
  doc.setFontSize(10);
  let y = 55;
  doc.text('DE:', 14, y);
  doc.setFont(undefined, 'bold');
  doc.text(empresa?.nombre || 'Distribuidora QUE POLLO', 14, y + 5);
  doc.setFont(undefined, 'normal');
  doc.text(`NIT: ${empresa?.nit || 'N/A'}`, 14, y + 10);
  doc.text(`Tel: ${empresa?.telefono || 'N/A'}`, 14, y + 15);
  doc.text(`Dir: ${empresa?.direccion || 'N/A'}`, 14, y + 20);

  // Client / Provider Info
  doc.text(type === 'venta' ? 'PARA (CLIENTE):' : 'PROVEEDOR:', pageWidth / 2, y);
  doc.setFont(undefined, 'bold');
  doc.text(type === 'venta' ? (data as Venta).clienteNombre : (data as Compra).proveedorNombre || 'N/A', pageWidth / 2, y + 5);
  doc.setFont(undefined, 'normal');
  if (type === 'venta') {
    doc.text(`Tel: ${(data as Venta).clienteTelefono || 'N/A'}`, pageWidth / 2, y + 10);
    doc.text(`Dir: ${(data as Venta).clienteDireccion || 'N/A'}`, pageWidth / 2, y + 15);
  }
  doc.text(`Fecha: ${formatDate(data.fecha)}`, pageWidth / 2, y + 20);

  // Items Table
  const tableData = items.map(item => [
    item.productoNombre,
    item.cantidad,
    formatCurrency(item.precioUnitario),
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    startY: y + 35,
    head: [['Descripción', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    styles: { fontSize: 9 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  doc.setFontSize(11);
  doc.text('Total Bruto:', pageWidth - 80, finalY);
  doc.text(formatCurrency(data.total), pageWidth - 14, finalY, { align: 'right' });

  doc.text('Pago:', pageWidth - 80, finalY + 7);
  doc.text(data.tipoPago.toUpperCase(), pageWidth - 14, finalY + 7, { align: 'right' });

  if (data.saldoPendiente > 0) {
    doc.setTextColor(239, 68, 68); // red
    doc.setFont(undefined, 'bold');
    doc.text('SALDO PENDIENTE:', pageWidth - 80, finalY + 14);
    doc.text(formatCurrency(data.saldoPendiente), pageWidth - 14, finalY + 14, { align: 'right' });
  } else {
    doc.setTextColor(16, 185, 129); // green
    doc.setFont(undefined, 'bold');
    doc.text('ESTADO:', pageWidth - 80, finalY + 14);
    doc.text('CANCELADO', pageWidth - 14, finalY + 14, { align: 'right' });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, pageWidth - 14, footerY);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Gracias por su preferencia.', pageWidth / 2, footerY + 10, { align: 'center' });

  doc.save(`${type.toUpperCase()}_${data.numeroFactura}.pdf`);
};

export const generateAiAnalysisPDF = (
  empresa: Empresa | null,
  analysis: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  if (empresa?.logoUrl) {
    try {
      doc.addImage(empresa.logoUrl, 'PNG', 14, 5, 30, 30);
    } catch (e) {
      console.error('Error adding logo to PDF', e);
    }
  }

  const aiTitleX = empresa?.logoUrl ? 50 : 14;
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('ANÁLISIS INTELIGENTE', aiTitleX, 25);
  
  doc.setFontSize(10);
  doc.text(empresa?.nombre || 'Distribuidora QUE POLLO', pageWidth - 14, 25, { align: 'right' });
  doc.text(new Date().toLocaleDateString(), pageWidth - 14, 32, { align: 'right' });

  // Content
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  
  // Simple markdown parser-ish (only for basic spacing and bolding)
  const lines = analysis.split('\n');
  let y = 50;
  const margin = 14;
  const maxWidth = pageWidth - (margin * 2);

  lines.forEach(line => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    if (line.startsWith('#')) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      const text = line.replace(/#/g, '').trim();
      doc.text(text, margin, y);
      y += 10;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
    } else if (line.startsWith('**') || line.startsWith('- **')) {
      doc.setFont(undefined, 'bold');
      const text = doc.splitTextToSize(line.replace(/\*\*/g, ''), maxWidth);
      doc.text(text, margin, y);
      y += (text.length * 5) + 2;
      doc.setFont(undefined, 'normal');
    } else {
      const text = doc.splitTextToSize(line, maxWidth);
      doc.text(text, margin, y);
      y += (text.length * 5) + 2;
    }
  });

  doc.save(`Analisis_Financiero_${new Date().toISOString().split('T')[0]}.pdf`);
};
