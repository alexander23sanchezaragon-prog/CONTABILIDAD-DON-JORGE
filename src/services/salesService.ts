import { db } from '../lib/firebase';
import { collection, doc, runTransaction, increment, Timestamp } from 'firebase/firestore';

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
import { useState } from "react";
import { createSaleTransaction } from "../services/ventas";

export default function VentaForm() {

  const [total, setTotal] = useState(0);
  const [descuento, setDescuento] = useState(0);

  const guardar = async () => {
    await createSaleTransaction(
      { total, descuento, tipoPago: "contado" },
      [],
      total - descuento
    );

    alert("Venta guardada");
  };

  return (
    <div>
      <h2>Crear venta</h2>

      <input
        type="number"
        placeholder="Total"
        onChange={e => setTotal(Number(e.target.value))}
      />

      <input
        type="number"
        placeholder="Descuento"
        onChange={e => setDescuento(Number(e.target.value))}
      />

      <p>Total final: {total - descuento}</p>

      <button onClick={guardar}>
        Guardar
      </button>
    </div>
  );
}
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { applyDiscountToSale } from "../services/ventas";

export default function VentasList() {

  const [ventas, setVentas] = useState([]);

  const cargar = async () => {
    const snap = await getDocs(collection(db, "ventas"));
    setVentas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    cargar();
  }, []);

  const cambiar = async (id) => {
    const val = prompt("Nuevo descuento:");
    if (!val) return;

    await applyDiscountToSale(id, Number(val));
    cargar();
  };

  return (
    <div>
      <h2>Ventas</h2>

      {ventas.map(v => (
        <div key={v.id}>
          <p>{v.numeroFactura}</p>
          <p>Total: {v.totalOriginal}</p>
          <p>Descuento: {v.descuento}</p>
          <p>Total final: {v.totalFinal}</p>

          <button onClick={() => cambiar(v.id)}>
            Editar descuento
          </button>
        </div>
      ))}
    </div>
  );
}
import VentaForm from "./components/VentaForm";
import VentasList from "./components/VentasList";

export default function App() {
  return (
    <div>
      <VentaForm />
      <VentasList />
    </div>
  );
}
