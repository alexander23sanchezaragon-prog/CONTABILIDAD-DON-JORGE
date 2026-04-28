import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  doc, 
  runTransaction, 
  increment, 
  Timestamp
} from 'firebase/firestore';
import { Venta, DetalleVenta, Caja } from '../types';

export const createSaleTransaction = async (
  ventaData: Omit<Venta, 'id'>,
  detalles: Omit<DetalleVenta, 'id' | 'ventaId'>[],
  montoPagado: number
) => {
  try {
    return await runTransaction(db, async (transaction) => {

      // 🔹 1. LEER TODO PRIMERO
      const empresaRef = doc(db, 'empresa', 'config');
      const empresaSnap = await transaction.get(empresaRef);

      let nextConsecutive = 1;
      if (empresaSnap.exists()) {
        nextConsecutive = empresaSnap.data().consecutivoVenta || 1;
      }

      // Leer todos los productos antes de escribir
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

      // 🔹 2. AHORA SÍ, TODAS LAS ESCRITURAS

      const numeroFactura = `VENT-${nextConsecutive.toString().padStart(4, '0')}`;

      // Crear venta
      const saleRef = doc(collection(db, 'ventas'));
      const finalVentaData = {
        ...ventaData,
        numeroFactura,
        fecha: Timestamp.fromDate(new Date(ventaData.fecha)),
      };

      transaction.set(saleRef, finalVentaData);

      // Crear detalles de venta
      for (const item of detalles) {
        const detailRef = doc(collection(db, 'detalle_ventas'));
        transaction.set(detailRef, {
          ...item,
          ventaId: saleRef.id
        });
      }

      // Actualizar stock
      for (const prod of productosData) {
        transaction.update(prod.ref, {
          stock: increment(-prod.cantidad)
        });
      }

      // Registrar en caja
      if (montoPagado > 0) {
        const cajaRef = doc(collection(db, 'caja'));
        const concepto = ventaData.tipoPago === 'contado' 
          ? `Venta de contado ${numeroFactura}` 
          : `Abono inicial venta ${numeroFactura}`;
          
        const cajaMov: Omit<Caja, 'id'> = {
          fecha: Timestamp.now(),
          tipo: 'entrada',
          monto: montoPagado,
          concepto: concepto,
          referenciaId: saleRef.id
        };

        transaction.set(cajaRef, cajaMov);
      }

      // Actualizar consecutivo
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
