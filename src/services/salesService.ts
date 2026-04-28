import { db } from '../lib/firebase';
import { collection, doc, runTransaction, Timestamp } from 'firebase/firestore';

// CREAR VENTA
export const createSaleTransaction = async (ventaData, detalles, montoPagado) => {
  return await runTransaction(db, async (transaction) => {

    const empresaRef = doc(db, 'empresa', 'config');
    const empresaSnap = await transaction.get(empresaRef);

    let consecutivo = empresaSnap.exists()
      ? empresaSnap.data().consecutivoVenta || 1
      : 1;

    const numeroFactura = `VENT-${String(consecutivo).padStart(4, '0')}`;

    const totalOriginal = ventaData.total;
    const descuento = ventaData.descuento || 0;
    const totalFinal = totalOriginal - descuento;

    if (totalFinal < 0) throw new Error("Descuento inválido");

    const saleRef = doc(collection(db, 'ventas'));

    transaction.set(saleRef, {
      ...ventaData,
      numeroFactura,
      fecha: Timestamp.now(),
      totalOriginal,
      descuento,
      totalFinal
    });

    transaction.set(empresaRef, {
      consecutivoVenta: consecutivo + 1
    }, { merge: true });

    return { id: saleRef.id };
  });
};

// DESCUENTO DESPUÉS
export const applyDiscountToSale = async (ventaId, nuevoDescuento) => {
  return await runTransaction(db, async (transaction) => {

    const ref = doc(db, 'ventas', ventaId);
    const snap = await transaction.get(ref);

    if (!snap.exists()) throw new Error("Venta no existe");

    const venta = snap.data();

    const totalOriginal = venta.totalOriginal || venta.total;
    const totalFinal = totalOriginal - nuevoDescuento;

    if (totalFinal < 0) throw new Error("Descuento inválido");

    transaction.update(ref, {
      descuento: nuevoDescuento,
      totalFinal
    });
  });
};
