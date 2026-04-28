import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  doc, 
  runTransaction, 
  increment, 
  Timestamp
} from 'firebase/firestore';
import { Venta, DetalleVenta, Caja } from '../types';


// ===============================
// 🟢 CREAR VENTA (CON DESCUENTO)
// ===============================
export const createSaleTransaction = async (
  ventaData: Omit<Venta, 'id'>,
  detalles: Omit<DetalleVenta, 'id' | 'ventaId'>[],
  montoPagado: number
) => {
  try {
    return await runTransaction(db, async (transaction) => {

      // 🔹 1. LECTURAS
      const empresaRef = doc(db, 'empresa', 'config');
      const empresaSnap = await transaction.get(empresaRef);

      let nextConsecutive = 1;
      if (empresaSnap.exists()) {
        nextConsecutive = empresaSnap.data().consecutivoVenta || 1;
      }

      const productosData = [];
      for (const item of detalles) {
        const productRef = doc(db, 'productos', item.productoId);
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
          throw new Error(`Producto ${item.productoId} no encontrado`);
        }

        const currentStock = productSnap.data().stock || 0;

        if (currentStock < item.cantidad) {
          throw new Error(
            `Stock insuficiente para ${item.productoNombre}. Disponible: ${currentStock}`
          );
        }

        productosData.push({
          ref: productRef,
          cantidad: item.cantidad
        });
      }

      // 🔹 2. CÁLCULOS
      const numeroFactura = `VENT-${nextConsecutive.toString().padStart(4, '0')}`;

      const totalOriginal = ventaData.total;
      const descuento = ventaData.descuento || 0;
      const totalFinal = totalOriginal - descuento;

      if (totalFinal < 0) {
        throw new Error('El descuento no puede ser mayor al total');
      }

      // 🔹 3. CREAR VENTA
      const saleRef = doc(collection(db, 'ventas'));
      const finalVentaData = {
        ...ventaData,
        numeroFactura,
        fecha: Timestamp.fromDate(new Date(ventaData.fecha)),
        totalOriginal,
        descuento,
        totalFinal
      };

      transaction.set(saleRef, finalVentaData);

      // 🔹 4. DETALLES
      for (const item of detalles) {
        const detailRef = doc(collection(db, 'detalle_ventas'));
        transaction.set(detailRef, {
          ...item,
          ventaId: saleRef.id
        });
      }

      // 🔹 5. STOCK
      for (const prod of productosData) {
        transaction.update(prod.ref, {
          stock: increment(-prod.cantidad)
        });
      }

      // 🔹 6. CAJA
      if (montoPagado > 0) {
        const cajaRef = doc(collection(db, 'caja'));
        const concepto = ventaData.tipoPago === 'contado' 
          ? `Venta de contado ${numeroFactura}` 
          : `Abono inicial venta ${numeroFactura}`;
          
        const cajaMov: Omit<Caja, 'id'> = {
          fecha: Timestamp.now(),
          tipo: 'entrada',
          monto: montoPagado,
          concepto,
          referenciaId: saleRef.id
        };

        transaction.set(cajaRef, cajaMov);
      }

      // 🔹 7. CONSECUTIVO
      transaction.set(empresaRef, {
        consecutivoVenta: nextConsecutive + 1
      }, { merge: true });

      return { id: saleRef.id, numeroFactura };
    });

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'ventas');
    throw error;
  }
};


// =======================================
// 🟡 APLICAR DESCUENTO DESPUÉS DE LA VENTA
// =======================================
export const applyDiscountToSale = async (
  ventaId,
  nuevoDescuento
) => {
  try {
    return await runTransaction(db, async (transaction) => {

      // 🔹 1. LEER VENTA
      const ventaRef = doc(db, 'ventas', ventaId);
      const ventaSnap = await transaction.get(ventaRef);

      if (!ventaSnap.exists()) {
        throw new Error('Venta no encontrada');
      }

      const venta = ventaSnap.data();

      const totalOriginal = venta.totalOriginal || venta.total;
      const descuentoAnterior = venta.descuento || 0;
      const totalFinal = totalOriginal - nuevoDescuento;

      if (totalFinal < 0) {
        throw new Error('El descuento no puede ser mayor al total');
      }

      // 🔹 2. ACTUALIZAR VENTA
      transaction.update(ventaRef, {
        descuento: nuevoDescuento,
        totalFinal
      });

      // 🔹 3. HISTORIAL (PRO)
      const historialRef = doc(collection(db, 'historial_descuentos'));
      transaction.set(historialRef, {
        ventaId,
        descuentoAnterior,
        descuentoNuevo: nuevoDescuento,
        fecha: Timestamp.now()
      });

      return true;
    });

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'ventas');
    throw error;
  }
};
