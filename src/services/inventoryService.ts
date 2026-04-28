import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  runTransaction, 
  increment, 
  Timestamp
} from 'firebase/firestore';
import { AjusteInventario } from '../types';

export const adjustStockTransaction = async (
  ajusteData: Omit<AjusteInventario, 'id'>
) => {
  return runTransaction(db, async (transaction) => {
    // 1. Get current product
    const productRef = doc(db, 'productos', ajusteData.productoId);
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) throw new Error("Producto no encontrado");
    
    // 2. Register adjustment
    const adjustmentRef = doc(collection(db, 'ajustes_inventario'));
    transaction.set(adjustmentRef, {
      ...ajusteData,
      fecha: Timestamp.now()
    });

    // 3. Update stock
    transaction.update(productRef, {
      stock: ajusteData.cantidadNueva
    });

    return adjustmentRef.id;
  });
};
