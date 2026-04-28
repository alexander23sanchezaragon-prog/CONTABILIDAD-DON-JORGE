import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { Venta, Producto, TipoPago, Empresa } from '../types';
import { Plus, X, Search, BarChart3, Calendar, Trash2, ArrowRight, User, DollarSign, Phone, Download } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { createSaleTransaction } from '../services/salesService';
import { registerVentaAbono } from '../services/paymentsService';
import { generateInvoicePDF } from '../lib/reports';

const Ventas = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [montoPagar, setMontoPagar] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  // 🔥 NUEVO: DESCUENTO
  const [descuento, setDescuento] = useState(0);

  // FORM
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipoPago, setTipoPago] = useState<TipoPago>('contado');
  const [montoAbonado, setMontoAbonado] = useState(0);
  const [cart, setCart] = useState<any[]>([]);
  const [stockError, setStockError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(0);

  useEffect(() => {
    getDoc(doc(db, 'empresa', 'config')).then(snap => {
      if (snap.exists()) setEmpresa({ id: snap.id, ...snap.data() } as Empresa);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'ventas'), orderBy('fecha', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setVentas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Venta)));
      setLoading(false);
    });

    onSnapshot(collection(db, 'productos'), (snap) => {
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Producto)));
    });

    return () => unsub();
  }, []);

  const addToCart = () => {
    const product = productos.find(p => p.id === selectedProduct);
    if (!product) return;

    if (product.stock < cantidad) {
      setStockError(`Stock insuficiente: ${product.stock}`);
      return;
    }

    setCart([...cart, {
      productoId: product.id,
      productoNombre: product.nombre,
      cantidad,
      precioUnitario: precio,
      total: cantidad * precio
    }]);

    setSelectedProduct('');
    setCantidad(1);
    setPrecio(0);
  };

  const removeFromCart = (i: number) => {
    setCart(cart.filter((_, idx) => idx !== i));
  };

  // 🔥 TOTALES
  const totalVenta = cart.reduce((acc, curr) => acc + curr.total, 0);
  const totalFinal = totalVenta - descuento;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) return alert("Agrega productos");

    if (descuento > totalVenta) {
      return alert("Descuento inválido");
    }

    const totalConDescuento = totalVenta - descuento;
    const abono = tipoPago === 'contado' ? totalConDescuento : montoAbonado;

    const ventaData: Omit<Venta, 'id'> = {
      numeroFactura: '',
      fecha: new Date(fecha),
      clienteNombre,
      clienteTelefono,
      total: totalConDescuento,
      descuento,
      totalOriginal: totalVenta,
      tipoPago,
      saldoPendiente: totalConDescuento - abono,
      estado: (totalConDescuento - abono <= 0) ? 'pagada' : 'pendiente'
    };

    const result = await createSaleTransaction(ventaData, cart, abono);

    if (confirm("¿Descargar PDF?")) {
      generateInvoicePDF(empresa, { ...ventaData, id: result.id, numeroFactura: result.numeroFactura } as Venta, cart, 'venta');
    }

    // RESET
    setCart([]);
    setDescuento(0);
    setClienteNombre('');
    setClienteTelefono('');
    setMontoAbonado(0);
    setTipoPago('contado');
    setIsModalOpen(false);
  };

  return (
    <div className="p-6">

      <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2 rounded">
        Nueva Venta
      </button>

      {/* TABLA */}
      <table className="w-full mt-4">
        <thead>
          <tr>
            <th>Factura</th>
            <th>Cliente</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map(v => (
            <tr key={v.id}>
              <td>{v.numeroFactura}</td>
              <td>{v.clienteNombre}</td>
              <td>{formatCurrency(v.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <motion.div className="bg-white p-6 rounded w-[600px]">

              <h2>Nueva Venta</h2>

              <input placeholder="Cliente"
                value={clienteNombre}
                onChange={e => setClienteNombre(e.target.value)}
              />

              <select
                value={selectedProduct}
                onChange={e => {
                  setSelectedProduct(e.target.value);
                  const p = productos.find(x => x.id === e.target.value);
                  if (p) setPrecio(p.precio);
                }}
              >
                <option>Producto</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>

              <input type="number" value={cantidad} onChange={e => setCantidad(Number(e.target.value))} />
              <input type="number" value={precio} onChange={e => setPrecio(Number(e.target.value))} />

              <button onClick={addToCart}>Agregar</button>

              {/* ITEMS */}
              {cart.map((item, i) => (
                <div key={i}>
                  {item.productoNombre} - {formatCurrency(item.total)}
                  <button onClick={() => removeFromCart(i)}>X</button>
                </div>
              ))}

              {/* 🔥 DESCUENTO */}
              <div className="mt-4">
                <p>Total: {formatCurrency(totalVenta)}</p>

                <input
                  type="number"
                  placeholder="Descuento"
                  value={descuento}
                  onChange={(e) => setDescuento(Number(e.target.value))}
                />

                <p>Total Final: {formatCurrency(totalFinal)}</p>
              </div>

              <button onClick={handleSubmit}>
                Guardar Venta
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Ventas;
