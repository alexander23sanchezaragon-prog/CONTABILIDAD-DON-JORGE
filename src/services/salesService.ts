import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  runTransaction, 
  increment, 
  Timestamp
} from 'firebase/firestore';
import { Venta, DetalleVenta, Caja } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Firestore Error: ', error);
  throw error;
}

export const createSaleTransaction = async (
  ventaData: Omit<Venta, 'id'>,
  detalles: Omit<DetalleVenta, 'id' | 'ventaId'>[],
  montoPagado: number
) => {
  try {
    return await runTransaction(db, async (transaction) => {
    // 1. Get and update consecutive
    const empresaRef = doc(db, 'empresa', 'config');
    const empresaSnap = await transaction.get(empresaRef);
    
    let nextConsecutive = 1;
    if (empresaSnap.exists()) {
      nextConsecutive = empresaSnap.data().consecutivoVenta || 1;
    } else {
      // Initialize with defaults if it doesn't exist
      transaction.set(empresaRef, {
        nombre: 'Distribuidora QUE POLLO',
        consecutivoCompra: 1,
        consecutivoVenta: 1
      }, { merge: true });
    }
    
    const numeroFactura = `VENT-${nextConsecutive.toString().padStart(4, '0')}`;
    
    // 2. Prepare sale doc
    const saleRef = doc(collection(db, 'ventas'));
    const finalVentaData = {
      ...ventaData,
      numeroFactura,
      fecha: Timestamp.fromDate(new Date(ventaData.fecha)),
    };
    transaction.set(saleRef, finalVentaData);

    // 3. Process details and update stock
    for (const item of detalles) {
      const detailRef = doc(collection(db, 'detalle_ventas'));
      transaction.set(detailRef, {
        ...item,
        ventaId: saleRef.id
      });

      const productRef = doc(db, 'productos', item.productoId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists()) throw new Error(`Product ${item.productoId} not found`);
      
      const currentStock = productSnap.data().stock || 0;
      if (currentStock < item.cantidad) {
        throw new Error(`Stock insuficiente para ${item.productoNombre}. Disponible: ${currentStock}`);
      }

      transaction.update(productRef, {
        stock: increment(-item.cantidad)
      });
    }

    // 4. Register cash movement if there was any payment
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

    // 5. Update company consecutive
    transaction.update(empresaRef, {
      consecutivoVenta: nextConsecutive + 1
    });

    return { id: saleRef.id, numeroFactura };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'ventas');
    throw error;
  }
};
