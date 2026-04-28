import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc, Timestamp } from 'firebase/firestore';
import { Caja, TipoMovimiento, Venta, Compra, Empresa } from '../types';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Plus, Search, Calendar, Landmark, X, FileText, Download } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { generateFinancialReport } from '../lib/reports';
import { doc, getDoc, getDocs } from 'firebase/firestore';

const CajaPage = () => {
  const [movimientos, setMovimientos] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [saldo, setSaldo] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'empresa', 'config')).then(snap => {
      if (snap.exists()) setEmpresa({ id: snap.id, ...snap.data() } as Empresa);
    });
  }, []);

  const downloadReport = async () => {
    setIsGeneratingReport(true);
    try {
      const [ventasSnap, comprasSnap, cajaSnap] = await Promise.all([
        getDocs(query(collection(db, 'ventas'), orderBy('fecha', 'desc'))),
        getDocs(query(collection(db, 'compras'), orderBy('fecha', 'desc'))),
        getDocs(query(collection(db, 'caja'), orderBy('fecha', 'desc')))
      ]);

      const ventas = ventasSnap.docs.map(d => ({ id: d.id, ...d.data() } as Venta));
      const compras = comprasSnap.docs.map(d => ({ id: d.id, ...d.data() } as Compra));
      const caja = cajaSnap.docs.map(d => ({ id: d.id, ...d.data() } as Caja));

      generateFinancialReport(empresa, ventas, compras, caja);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte financiero');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const [formData, setFormData] = useState({
    tipo: 'entrada' as TipoMovimiento,
    monto: 0,
    concepto: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'caja'), orderBy('fecha', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Caja));
      setMovimientos(data);
      
      // Calculate total balance (This is inefficient for large datasets, in production use a summary doc)
      // For MVP we listen to all caja docs or at least a significant sample
      onSnapshot(collection(db, 'caja'), (fullSnap) => {
        const total = fullSnap.docs.reduce((acc, doc) => {
          const m = doc.data() as Caja;
          return m.tipo === 'entrada' ? acc + m.monto : acc - m.monto;
        }, 0);
        setSaldo(total);
      });

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'caja'), {
        ...formData,
        fecha: Timestamp.now()
      });
      setIsModalOpen(false);
      setFormData({ tipo: 'entrada', monto: 0, concepto: '' });
    } catch (error) {
      console.error('Error recording movement:', error);
    }
  };

  const filteredMovimientos = movimientos.filter(m => 
    m.concepto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Caja</h1>
          <p className="text-slate-500">Control de flujo de caja y movimientos financieros</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadReport}
            disabled={isGeneratingReport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm w-fit disabled:opacity-50"
          >
            {isGeneratingReport ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            Reporte Financiero
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm w-fit"
          >
            <Plus className="w-5 h-5" />
            Registrar Movimiento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="md:col-span-2 bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-900/20 flex items-center justify-between overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-1">Saldo Actual</p>
            <p className="text-4xl font-black font-mono tracking-tighter">{formatCurrency(saldo)}</p>
          </div>
          <Wallet className="w-20 h-20 text-white/5 absolute -right-2 -bottom-2 rotate-12" />
          <Landmark className="w-12 h-12 text-blue-500/20" />
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <ArrowUpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entradas Hoy</p>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(movimientos.filter(m => m.tipo === 'entrada').reduce((a, b) => a + b.monto, 0))}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salidas Hoy</p>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(movimientos.filter(m => m.tipo === 'salida').reduce((a, b) => a + b.monto, 0))}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por concepto..."
            className="bg-transparent border-none focus:ring-0 w-full text-slate-700 placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-extrabold mb-4 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Fecha / Hora</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Concepto</th>
                <th className="px-6 py-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center">Cargando movimientos...</td></tr>
              ) : filteredMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Wallet className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    No hay movimientos registrados
                  </td>
                </tr>
              ) : (
                filteredMovimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-900 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(mov.fecha)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-[10px] font-black uppercase",
                        mov.tipo === 'entrada' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {mov.tipo === 'entrada' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                        {mov.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {mov.concepto}
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-right font-mono font-bold",
                      mov.tipo === 'entrada' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {mov.tipo === 'entrada' ? '+' : '-'} {formatCurrency(mov.monto)}
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
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Registrar Movimiento</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tipo de Movimiento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo: 'entrada' })}
                      className={cn(
                        "py-3 rounded-xl border-2 font-bold text-sm transition-all",
                        formData.tipo === 'entrada' ? "border-emerald-600 bg-emerald-50 text-emerald-600" : "border-slate-100 text-slate-400"
                      )}
                    >
                      Entrada (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo: 'salida' })}
                      className={cn(
                        "py-3 rounded-xl border-2 font-bold text-sm transition-all",
                        formData.tipo === 'salida' ? "border-red-600 bg-red-50 text-red-600" : "border-slate-100 text-slate-400"
                      )}
                    >
                      Salida (-)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Concepto / Motivo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pago de arriendo, Retiro para cambio..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    value={formData.concepto}
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Monto</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-xl font-bold"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: Number(e.target.value) })}
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className={cn(
                      "w-full text-white font-bold py-4 rounded-xl transition-all shadow-lg",
                      formData.tipo === 'entrada' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                    )}
                  >
                    Registrar {formData.tipo}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CajaPage;
