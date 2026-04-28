import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  runTransaction, 
  increment, 
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { Compra, DetalleCompra, Caja } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Firestore Error: ', error);
  throw error;
}

export const createPurchaseTransaction = async (
  compraData: Omit<Compra, 'id'>,
  detalles: Omit<DetalleCompra, 'id' | 'compraId'>[],
  montoPagado: number
) => {
  try {
    return await runTransaction(db, async (transaction) => {
    // 1. Get and update consecutive
    const empresaRef = doc(db, 'empresa', 'config');
    const empresaSnap = await transaction.get(empresaRef);
    
    let nextConsecutive = 1;
    if (empresaSnap.exists()) {
      nextConsecutive = empresaSnap.data().consecutivoCompra || 1;
    } else {
      // Initialize with defaults if it doesn't exist
      transaction.set(empresaRef, {
        nombre: 'Distribuidora QUE POLLO',
        consecutivoCompra: 1,
        consecutivoVenta: 1
      }, { merge: true });
    }
    
    const numeroFactura = `COMP-${nextConsecutive.toString().padStart(4, '0')}`;
    
    // 2. Prepare purchase doc
    const purchaseRef = doc(collection(db, 'compras'));
    
    // Ensure fecha is a valid Timestamp
    let fechaTimestamp: Timestamp;
    try {
      const dateObj = compraData.fecha instanceof Date ? compraData.fecha : new Date(compraData.fecha);
      if (isNaN(dateObj.getTime())) throw new Error("Fecha inválida");
      fechaTimestamp = Timestamp.fromDate(dateObj);
    } catch (e) {
      fechaTimestamp = Timestamp.now();
    }

    const finalCompraData = {
      ...compraData,
      numeroFactura,
      fecha: fechaTimestamp,
    };
    transaction.set(purchaseRef, finalCompraData);

    // 3. Process details and update stock
    for (const item of detalles) {
      const detailRef = doc(collection(db, 'detalle_compras'));
      transaction.set(detailRef, {
        ...item,
        compraId: purchaseRef.id
      });

      const productRef = doc(db, 'productos', item.productoId);
      
      // Basic validation for stock update
      const cantidad = Number(item.cantidad) || 0;
      const costo = Number(item.precioUnitario) || 0;

      transaction.update(productRef, {
        stock: increment(cantidad),
        costo: costo // Update cost to last purchase cost
      });
    }

    // 4. Handle money flow and balances
    if (compraData.tipoPago === 'credito') {
      const providerRef = doc(db, 'proveedores', compraData.proveedorId);
      // Saldo pendiente is Total - Abono
      transaction.update(providerRef, {
        saldoPendiente: increment(compraData.saldoPendiente)
      });
    }

    // 5. Register cash movement if there was any payment
    if (montoPagado > 0) {
      const cajaRef = doc(collection(db, 'caja'));
      const concepto = compraData.tipoPago === 'contado' 
        ? `Compra de contado ${numeroFactura}` 
        : `Abono inicial compra ${numeroFactura}`;
        
      const cajaMov: Omit<Caja, 'id'> = {
        fecha: Timestamp.now(),
        tipo: 'salida',
        monto: montoPagado,
        concepto: concepto,
        referenciaId: purchaseRef.id
      };
      transaction.set(cajaRef, cajaMov);
    }

    // 6. Update company consecutive
    transaction.update(empresaRef, {
      consecutivoCompra: nextConsecutive + 1
    });

    return { id: purchaseRef.id, numeroFactura };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'compras');
    throw error;
  }
};
