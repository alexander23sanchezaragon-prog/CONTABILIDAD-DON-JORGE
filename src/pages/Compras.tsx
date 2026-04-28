import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp, getDocs, deleteDoc, doc, runTransaction, increment, where, getDoc } from 'firebase/firestore';
import { Compra, Proveedor, Producto, DetalleCompra, TipoPago, Empresa } from '../types';
import { Plus, X, Search, ShoppingCart, Calendar, Truck, Trash2, ArrowRight, DollarSign, Download } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { createPurchaseTransaction } from '../services/purchaseService';
import { registerCompraAbono } from '../services/paymentsService';
import { generateInvoicePDF } from '../lib/reports';

const Compras = () => {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
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
    if (!selectedCompra) return;
    try {
      await registerCompraAbono(
        selectedCompra.id, 
        montoPagar, 
        selectedCompra.numeroFactura,
        selectedCompra.proveedorId
      );
      setIsAbonoModalOpen(false);
      setSelectedCompra(null);
      setMontoPagar(0);
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Form State
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipoPago, setTipoPago] = useState<TipoPago>('contado');
  const [montoAbonado, setMontoAbonado] = useState(0);
  const [cart, setCart] = useState<any[]>([]);

  // Add Item State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [modoIngreso, setModoIngreso] = useState<'unidad' | 'peso'>('unidad');
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'compras'), orderBy('fecha', 'desc'));
    const unsubCompras = onSnapshot(q, (snapshot) => {
      setCompras(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Compra)));
      setLoading(false);
    });

    onSnapshot(collection(db, 'proveedores'), (snapshot) => {
      setProveedores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proveedor)));
    });

    onSnapshot(collection(db, 'productos'), (snapshot) => {
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
    });

    return () => unsubCompras();
  }, []);

  const addToCart = () => {
    const product = productos.find(p => p.id === selectedProduct);
    if (!product) return;

    setCart([...cart, {
      productoId: product.id,
      productoNombre: `${product.nombre} (${modoIngreso === 'peso' ? 'Peso' : 'Unidad'})`,
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

  const totalCompra = cart.reduce((acc, curr) => acc + curr.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProveedor) {
      alert('Seleccione un proveedor');
      return;
    }
    if (cart.length === 0) {
      alert('Agregue al menos un producto');
      return;
    }

    try {
      const provider = proveedores.find(p => p.id === selectedProveedor);
      const abono = tipoPago === 'contado' ? totalCompra : montoAbonado;
      const compraData: Omit<Compra, 'id'> = {
        numeroFactura: '', // Generated in transaction
        fecha: new Date(fecha + 'T12:00:00'), // Use noon to avoid timezone issues
        proveedorId: selectedProveedor,
        proveedorNombre: provider?.nombre || '',
        total: totalCompra,
        tipoPago: tipoPago,
        saldoPendiente: totalCompra - abono,
        estado: (totalCompra - abono <= 0) ? 'pagada' : 'pendiente'
      };

      const result = await createPurchaseTransaction(compraData, cart, abono);

      if (confirm('¿Desea descargar el resumen de compra en PDF?')) {
        const docForPDF = {
          ...compraData,
          numeroFactura: result.numeroFactura,
          id: result.id
        } as Compra;
        generateInvoicePDF(empresa, docForPDF, cart, 'compra');
      }

      setIsModalOpen(false);
      setCart([]);
      setSelectedProveedor('');
      setMontoAbonado(0);
      setTipoPago('contado');
    } catch (error: any) {
      console.error('Error saving purchase:', error);
      alert('Error al guardar la compra: ' + (error.message || 'Error desconocido'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Compras</h1>
          <p className="text-slate-500">Registre facturas de sus proveedores</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm w-fit"
        >
          <Plus className="w-5 h-5" />
          Nueva Compra
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por factura o proveedor..."
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
                <th className="px-6 py-4">Proveedor</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4 text-right">Saldo</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : compras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    No hay registros de compras
                  </td>
                </tr>
              ) : (
                compras.map((compra) => (
                  <tr key={compra.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{compra.numeroFactura}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(compra.fecha)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {compra.proveedorNombre}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        compra.tipoPago === 'credito' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {compra.tipoPago === 'credito' ? 'Crédito' : 'Contado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">
                      {compra.saldoPendiente > 0 ? (
                        <span className="text-red-600 font-bold">{formatCurrency(compra.saldoPendiente)}</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">PAGADO</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(compra.total)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={async () => {
                            const snap = await getDocs(query(collection(db, 'detalle_compras'), where('compraId', '==', compra.id)));
                            const details = snap.docs.map(d => d.data());
                            generateInvoicePDF(empresa, compra, details, 'compra');
                          }}
                          className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {compra.estado === 'pendiente' && (
                          <button 
                            onClick={() => {
                              setSelectedCompra(compra);
                              setMontoPagar(compra.saldoPendiente);
                              setIsAbonoModalOpen(true);
                            }}
                            title="Registrar Abono"
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
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Registrar Nueva Compra</h2>
                  <p className="text-sm text-slate-500">Ingrese los detalles de la factura</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Information Side */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 uppercase">General</h3>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Proveedor</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm"
                        value={selectedProveedor}
                        onChange={(e) => setSelectedProveedor(e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Fecha Factura</label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Forma de Pago</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTipoPago('contado')}
                          className={cn(
                            "py-2 px-3 text-xs font-bold rounded-lg border transition-all",
                            tipoPago === 'contado' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-600"
                          )}
                        >
                          Contado
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoPago('credito')}
                          className={cn(
                            "py-2 px-3 text-xs font-bold rounded-lg border transition-all",
                            tipoPago === 'credito' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-600"
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
                          max={totalCompra}
                          onChange={(e) => setMontoAbonado(Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 uppercase">Agregar Producto</h3>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Producto</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm"
                        value={selectedProduct}
                        onChange={(e) => {
                          setSelectedProduct(e.target.value);
                          const p = productos.find(prod => prod.id === e.target.value);
                          if (p) {
                            setPrecio(p.costo);
                            setModoIngreso(p.unidad === 'kg' ? 'peso' : 'unidad');
                          }
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {productos.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} ({p.unidad})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Modo de Ingreso</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setModoIngreso('unidad')}
                          className={cn(
                            "py-1.5 px-3 text-[10px] font-bold rounded-lg border transition-all",
                            modoIngreso === 'unidad' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
                          )}
                        >
                          Por Unidad
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoIngreso('peso')}
                          className={cn(
                            "py-1.5 px-3 text-[10px] font-bold rounded-lg border transition-all",
                            modoIngreso === 'peso' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
                          )}
                        >
                          Por Peso
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">
                          {modoIngreso === 'peso' ? 'Peso (kg)' : 'Cantidad'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-mono"
                          value={cantidad}
                          min="0.01"
                          onChange={(e) => setCantidad(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">
                          {modoIngreso === 'peso' ? 'Vlr. x Kilo' : 'Vlr. x Unidad'}
                        </label>
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-mono"
                          value={precio}
                          onChange={(e) => setPrecio(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100/50 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Subtotal Item</span>
                      <span className="text-sm font-black text-blue-700 font-mono">
                        {formatCurrency(cantidad * precio)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={addToCart}
                      disabled={!selectedProduct || cantidad <= 0 || precio <= 0}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Añadir al Detalle
                    </button>
                  </div>
                </div>

                {/* Items Table Side */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 min-h-[300px] flex flex-col">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 uppercase">Detalle de Productos</h3>
                      <span className="text-xs font-bold px-2 py-1 bg-slate-200 rounded text-slate-600">{cart.length} Items</span>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold sticky top-0">
                          <tr>
                            <th className="px-4 py-2">Producto</th>
                            <th className="px-4 py-2">Cant.</th>
                            <th className="px-4 py-2 text-right">Precio C/U</th>
                            <th className="px-4 py-2 text-right">Subtotal</th>
                            <th className="px-4 py-2 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cart.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-20 text-center text-slate-400 italic">
                                No hay productos en esta compra
                              </td>
                            </tr>
                          ) : (
                            cart.map((item, idx) => (
                              <tr key={idx} className="bg-white">
                                <td className="px-4 py-3 font-medium text-slate-900">{item.productoNombre}</td>
                                <td className="px-4 py-3 font-mono">{item.cantidad}</td>
                                <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.precioUnitario)}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(item.total)}</td>
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

                    <div className="p-6 border-t border-slate-200 bg-slate-100/50 flex flex-col items-end gap-2">
                      <div className="flex items-center gap-8 w-full justify-between lg:justify-end">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Factura</span>
                        <span className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                          {formatCurrency(totalCompra)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={cart.length === 0 || !selectedProveedor}
                      className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      Procesar Compra ({formatCurrency(totalCompra)})
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
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Registrar Pago</h2>
                <button onClick={() => setIsAbonoModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleRegisterAbono} className="p-6 space-y-4">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-2 text-center">
                   <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Saldo Pendiente</p>
                   <p className="text-2xl font-black text-blue-900">{formatCurrency(selectedCompra?.saldoPendiente || 0)}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Monto a Pagar</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xl font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={montoPagar}
                    max={selectedCompra?.saldoPendiente}
                    onChange={e => setMontoPagar(Number(e.target.value))}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase italic py-4 rounded-2xl shadow-xl shadow-emerald-600/20 transition-all font-mono"
                >
                  Confirmar Pago
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Compras;
