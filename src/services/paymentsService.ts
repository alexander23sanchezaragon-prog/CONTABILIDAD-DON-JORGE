import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  runTransaction, 
  Timestamp, 
  increment 
} from 'firebase/firestore';
import { Caja, PagoEmpleado } from '../types';

export const registerVentaAbono = async (
  ventaId: string, 
  monto: number, 
  numeroFactura: string
) => {
  return runTransaction(db, async (transaction) => {
    const ventaRef = doc(db, 'ventas', ventaId);
    const ventaSnap = await transaction.get(ventaRef);
    
    if (!ventaSnap.exists()) throw new Error("Venta no encontrada");
    
    const ventaData = ventaSnap.data();
    const nuevoSaldo = ventaData.saldoPendiente - monto;
    
    if (nuevoSaldo < -0.01) throw new Error("El abono supera el saldo pendiente");

    // 1. Update Sale
    transaction.update(ventaRef, {
      saldoPendiente: nuevoSaldo,
      estado: nuevoSaldo <= 0.01 ? 'pagada' : 'pendiente'
    });

    // 2. Register Cash Movement
    const cajaRef = doc(collection(db, 'caja'));
    const cajaMov: Omit<Caja, 'id'> = {
      fecha: Timestamp.now(),
      tipo: 'entrada',
      monto: monto,
      concepto: `Abono a venta ${numeroFactura}`,
      referenciaId: ventaId
    };
    transaction.set(cajaRef, cajaMov);
  });
};

export const registerCompraAbono = async (
  compraId: string, 
  monto: number, 
  numeroFactura: string,
  proveedorId: string
) => {
  return runTransaction(db, async (transaction) => {
    const compraRef = doc(db, 'compras', compraId);
    const compraSnap = await transaction.get(compraRef);
    
    if (!compraSnap.exists()) throw new Error("Compra no encontrada");
    
    const compraData = compraSnap.data();
    const nuevoSaldo = compraData.saldoPendiente - monto;
    
    if (nuevoSaldo < -0.01) throw new Error("El abono supera el saldo pendiente");

    // 1. Update Purchase
    transaction.update(compraRef, {
      saldoPendiente: nuevoSaldo,
      estado: nuevoSaldo <= 0.01 ? 'pagada' : 'pendiente'
    });

    // 2. Update Provider Balance
    const providerRef = doc(db, 'proveedores', proveedorId);
    transaction.update(providerRef, {
      saldoPendiente: increment(-monto)
    });

    // 3. Register Cash Movement
    const cajaRef = doc(collection(db, 'caja'));
    const cajaMov: Omit<Caja, 'id'> = {
      fecha: Timestamp.now(),
      tipo: 'salida',
      monto: monto,
      concepto: `Abono a compra ${numeroFactura}`,
      referenciaId: compraId
    };
    transaction.set(cajaRef, cajaMov);
  });
};

export const registerPagoEmpleado = async (pago: Omit<PagoEmpleado, 'id'>) => {
  return runTransaction(db, async (transaction) => {
    const pagoRef = doc(collection(db, 'pagos_empleados'));
    
    // 1. Save payment
    const finalPago = {
      ...pago,
      fecha: Timestamp.fromDate(new Date(pago.fecha))
    };
    transaction.set(pagoRef, finalPago);

    // 2. Register Cash Movement
    const cajaRef = doc(collection(db, 'caja'));
    const cajaMov: Omit<Caja, 'id'> = {
      fecha: Timestamp.now(),
      tipo: 'salida',
      monto: pago.monto,
      concepto: `Pago ${pago.tipo} a ${pago.empleadoNombre}`,
      referenciaId: pagoRef.id
    };
    transaction.set(cajaRef, cajaMov);
  });
};
