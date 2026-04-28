import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  doc, 
  runTransaction, 
  increment, 
  Timestamp
} from 'firebase/firestore';

export interface ProductionItem {
  id: string; // Producto ID
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export const processProductionTransaction = async (
  sourceProductId: string,
  sourceQuantity: number,
  results: ProductionItem[]
) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // 1. Discount source product
      const sourceRef = doc(db, 'productos', sourceProductId);
      const sourceSnap = await transaction.get(sourceRef);
      if (!sourceSnap.exists()) throw new Error("Producto origen no encontrado");
      
      const currentStock = sourceSnap.data().stock || 0;
      if (currentStock < sourceQuantity) throw new Error("Stock insuficiente del producto origen");

      transaction.update(sourceRef, {
        stock: increment(-sourceQuantity)
      });

      // 2. Add results to stock
      for (const item of results) {
        const targetRef = doc(db, 'productos', item.id);
        transaction.update(targetRef, {
          stock: increment(item.cantidad),
          costo: item.precioUnitario // We update cost based on production allocation
        });

        // Optional: Record movement in a separate production log
        const logRef = doc(collection(db, 'ajustes_inventario'));
        transaction.set(logRef, {
          fecha: Timestamp.now(),
          productoId: item.id,
          productoNombre: item.nombre,
          cantidadAnterior: 0, // Simplified
          cantidadNueva: item.cantidad,
          motivo: `Producción desde ${sourceSnap.data().nombre}`,
          adminId: 'system'
        });
      }

      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'productos');
  }
};
