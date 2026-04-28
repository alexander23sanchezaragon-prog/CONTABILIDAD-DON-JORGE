import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { Venta, Producto, DetalleVenta, TipoPago, Empresa } from '../types';
import { Plus, X, Search, BarChart3, Calendar, Trash2, ArrowRight, User, DollarSign, Phone, FileText, Download } from 'lucide-react';
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

  useEffect(() => {
    getDoc(doc(db, 'empresa', 'config')).then(snap => {
      if (snap.exists()) setEmpresa({ id: snap.id, ...snap.data() } as Empresa);
    });
  }, []);

  const handleRegisterAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenta) return;
    try {
      await registerVentaAbono(selectedVenta.id, montoPagar, selectedVenta.numeroFactura);
      setIsAbonoModalOpen(false);
      setSelectedVenta(null);
      setMontoPagar(0);
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Form State
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipoPago, setTipoPago] = useState<TipoPago>('contado');
  const [montoAbonado, setMontoAbonado] = useState(0);
  const [cart, setCart] = useState<any[]>([]);
  const [stockError, setStockError] = useState<string | null>(null);

  // Add Item State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'ventas'), orderBy('fecha', 'desc'));
    const unsubVentas = onSnapshot(q, (snapshot) => {
      setVentas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venta)));
      setLoading(false);
    });

    onSnapshot(collection(db, 'productos'), (snapshot) => {
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
    });

    return () => unsubVentas();
  }, []);

  const addToCart = () => {
    const product = productos.find(p => p.id === selectedProduct);
    if (!product) return;

    if (product.stock < cantidad) {
      setStockError(`Stock insuficiente. Disponible: ${product.stock} ${product.unidad}`);
      setTimeout(() => setStockError(null), 5000);
      return;
    }

    setStockError(null);
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

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const totalVenta = cart.reduce((acc, curr) => acc + curr.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Agregue al menos un producto');
      return;
    }

    try {
      const abono = tipoPago === 'contado' ? totalVenta : montoAbonado;
      const ventaData: Omit<Venta, 'id'> = {
        numeroFactura: '', // Generated in transaction
        fecha: new Date(fecha + 'T12:00:00'),
        clienteNombre,
        clienteTelefono,
        total: totalVenta,
        tipoPago: tipoPago,
        saldoPendiente: totalVenta - abono,
        estado: (totalVenta - abono <= 0) ? 'pagada' : 'pendiente'
      };

      const result = await createSaleTransaction(ventaData, cart, abono);
      
      if (confirm('¿Desea descargar la factura en PDF?')) {
        const docForPDF = {
          ...ventaData,
          numeroFactura: result.numeroFactura,
          id: result.id
        } as Venta;
        generateInvoicePDF(empresa, docForPDF, cart, 'venta');
      }

      setIsModalOpen(false);
      setCart([]);
      setClienteNombre('');
      setClienteTelefono('');
      setMontoAbonado(0);
      setTipoPago('contado');
    } catch (error: any) {
      console.error('Error saving sale:', error);
      alert(error.message || 'Error al guardar la venta');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ventas</h1>
          <p className="text-slate-500">Realice facturación y control de ventas</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm w-fit"
        >
          <Plus className="w-5 h-5" />
          Nueva Venta
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por factura o cliente..."
            className="bg-transparent border-none focus:ring-0 w-full text-slate-700 placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Factura / Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4 text-right">Saldo</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    No hay registros de ventas
                  </td>
                </tr>
              ) : (
                ventas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{venta.numeroFactura}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(venta.fecha)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {venta.clienteNombre}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        venta.tipoPago === 'credito' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {venta.tipoPago === 'credito' ? 'Crédito' : 'Contado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">
                      {venta.saldoPendiente > 0 ? (
                        <span className="text-orange-600 font-bold">{formatCurrency(venta.saldoPendiente)}</span>
                      ) : (
                        <span className="text-emerald-600">PAGADO</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(venta.total)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={async () => {
                            // Need details for PDF. In a real app we'd fetch them or have them in state.
                            // For simplicity, let's assume we fetch them here or the table row has them.
                            // I'll need to fetch detalle_ventas for this specific ID.
                            const snap = await getDocs(query(collection(db, 'detalle_ventas'), where('ventaId', '==', venta.id)));
                            const details = snap.docs.map(d => d.data());
                            generateInvoicePDF(empresa, venta, details, 'venta');
                          }}
                          className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {venta.estado === 'pendiente' && (
                          <button 
                            onClick={() => {
                              setSelectedVenta(venta);
                              setMontoPagar(venta.saldoPendiente);
                              setIsAbonoModalOpen(true);
                            }}
                            title="Registrar Cobro"
                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-colors"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Realizar Nueva Venta</h2>
                  <p className="text-sm text-slate-600">Complete los datos de la facturación</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Information Side */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 uppercase">Información de Venta</h3>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Cliente</label>
                      <div className="relative">
                        <User className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-8 pr-2 text-sm"
                          placeholder="Nombre del cliente"
                          value={clienteNombre}
                          onChange={(e) => setClienteNombre(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Teléfono / Celular</label>
                      <div className="relative">
                        <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-8 pr-2 text-sm"
                          placeholder="Número de contacto"
                          value={clienteTelefono}
                          onChange={(e) => setClienteTelefono(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Fecha</label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-mono"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Tipo de Pago</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTipoPago('contado')}
                          className={cn(
                            "py-2 px-3 text-xs font-bold rounded-lg border transition-all",
                            tipoPago === 'contado' ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-600"
                          )}
                        >
                          Contado
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoPago('credito')}
                          className={cn(
                            "py-2 px-3 text-xs font-bold rounded-lg border transition-all",
                            tipoPago === 'credito' ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-600"
                          )}
                        >
                          Crédito
                        </button>
                      </div>
                    </div>

                    {tipoPago === 'credito' && (
                      <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-bold text-slate-500">Abono Inicial</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-mono"
                          value={montoAbonado}
                          min="0"
                          max={totalVenta}
                          onChange={(e) => setMontoAbonado(Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 uppercase">Productos</h3>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Seleccionar Producto</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm"
                        value={selectedProduct}
                        onChange={(e) => {
                          setSelectedProduct(e.target.value);
                          const p = productos.find(prod => prod.id === e.target.value);
                          if (p) setPrecio(p.precio);
                        }}
                      >
                        <option value="">Buscar producto...</option>
                        {productos.map(p => (
                          <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                            {p.nombre} ({p.stock} {p.unidad})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex justify-between items-end">
                          <label className="text-xs font-bold text-slate-500">Cantidad</label>
                          {productos.find(p => p.id === selectedProduct) && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Dis: {productos.find(p => p.id === selectedProduct)?.stock}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          className={cn(
                            "w-full bg-white border rounded-lg p-2 text-sm font-mono transition-colors",
                            stockError ? "border-red-500 bg-red-50" : "border-slate-200"
                          )}
                          value={cantidad}
                          min="0.1"
                          step="0.1"
                          onChange={(e) => {
                            setCantidad(Number(e.target.value));
                            setStockError(null);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Precio Unit.</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-mono"
                          value={precio}
                          onChange={(e) => setPrecio(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {stockError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 overflow-hidden"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shrink-0" />
                          {stockError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={addToCart}
                      disabled={!selectedProduct || cantidad <= 0}
                      className="w-full bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Item
                    </button>
                  </div>
                </div>

                {/* Items Table Side */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 min-h-[300px] flex flex-col">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-xl">
                      <h3 className="text-sm font-bold text-slate-900 uppercase">Detalle Factura</h3>
                      <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">{cart.length} Productos</span>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0">
                          <tr>
                            <th className="px-4 py-2">Producto</th>
                            <th className="px-4 py-2">Cant/Unidad</th>
                            <th className="px-4 py-2 text-right">Precio</th>
                            <th className="px-4 py-2 text-right">Subtotal</th>
                            <th className="px-4 py-2 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cart.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-20 text-center text-slate-400 italic">
                                La factura está vacía
                              </td>
                            </tr>
                          ) : (
                            cart.map((item, idx) => (
                              <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-900">{item.productoNombre}</td>
                                <td className="px-4 py-3 font-mono">{item.cantidad}</td>
                                <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.precioUnitario)}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(item.total)}</td>
                                <td className="px-4 py-3 text-right">
                                  <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-6 border-t border-slate-200 bg-white flex flex-col items-end gap-2 rounded-b-xl">
                      <div className="flex items-center gap-8 w-full justify-between lg:justify-end">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Total Venta</span>
                        <span className="text-4xl font-black text-emerald-600 font-mono tracking-tighter">
                          {formatCurrency(totalVenta)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-xl transition-all"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={cart.length === 0}
                      className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      Confirmar Venta ({formatCurrency(totalVenta)})
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Abono Modal */}
      <AnimatePresence>
        {isAbonoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm shadow-2xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Cobrar Saldo</h2>
                <button onClick={() => setIsAbonoModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleRegisterAbono} className="p-6 space-y-4">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-2 text-center">
                   <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Saldo x Cobrar</p>
                   <p className="text-2xl font-black text-emerald-900">{formatCurrency(selectedVenta?.saldoPendiente || 0)}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Monto Recibido</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xl font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={montoPagar}
                    max={selectedVenta?.saldoPendiente}
                    onChange={e => setMontoPagar(Number(e.target.value))}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase italic py-4 rounded-2xl shadow-xl shadow-emerald-600/20 transition-all font-mono"
                >
                  Confirmar Cobro
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Ventas;
