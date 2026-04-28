import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Venta, Compra, Producto, Caja } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Wallet, 
  AlertCircle, 
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  DollarSign,
  FileText,
  Download
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { generateFinancialReport } from '../lib/reports';

const Dashboard = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [caja, setCaja] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresa } = useAuth();

  useEffect(() => {
    const unsubVentas = onSnapshot(query(collection(db, 'ventas'), orderBy('fecha', 'desc'), limit(50)), (snap) => {
      setVentas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venta)));
    });
    const unsubCompras = onSnapshot(query(collection(db, 'compras'), orderBy('fecha', 'desc'), limit(50)), (snap) => {
      setCompras(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Compra)));
    });
    const unsubProd = onSnapshot(collection(db, 'productos'), (snap) => {
      setProductos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
    });
    const unsubCaja = onSnapshot(collection(db, 'caja'), (snap) => {
      setCaja(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Caja)));
      setLoading(false);
    });

    return () => {
      unsubVentas();
      unsubCompras();
      unsubProd();
      unsubCaja();
    };
  }, []);

  // Stats Calculations
  const totalVentas = ventas.reduce((acc, curr) => acc + curr.total, 0);
  const totalCompras = compras.reduce((acc, curr) => acc + curr.total, 0);
  const saldoCaja = caja.reduce((acc, curr) => curr.tipo === 'entrada' ? acc + curr.monto : acc - curr.monto, 0);
  const lowStock = productos.filter(p => p.stock <= 5);
  
  // Chart Data preparation (Last 7 sales)
  const salesChartData = ventas.slice(0, 7).reverse().map(v => ({
    name: v.numeroFactura.replace('VENT-', ''),
    monto: v.total
  }));

  const stockPieData = productos.slice(0, 5).map(p => ({
    name: p.nombre,
    value: p.stock
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const stats = [
    { 
      label: 'Ventas Totales', 
      value: formatCurrency(totalVentas), 
      icon: TrendingUp, 
      color: 'bg-emerald-500', 
      detail: `${ventas.length} Transacciones`,
      trend: '+12%',
      isUp: true
    },
    { 
      label: 'Compras Realizadas', 
      value: formatCurrency(totalCompras), 
      icon: ShoppingBag, 
      color: 'bg-blue-500', 
      detail: `${compras.length} Facturas`,
      trend: '-5%',
      isUp: false
    },
    { 
      label: 'Saldo en Caja', 
      value: formatCurrency(saldoCaja), 
      icon: Wallet, 
      color: 'bg-slate-900', 
      detail: 'Liquidez Actual',
      trend: '+8%',
      isUp: true
    },
    { 
      label: 'Productos Críticos', 
      value: lowStock.length, 
      icon: AlertCircle, 
      color: 'bg-red-500', 
      detail: 'Bajo inventario',
      trend: 'Revisar',
      isUp: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="flex items-center gap-6 relative z-10">
          {empresa?.logoUrl && (
            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center shrink-0">
              <img src={empresa.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Dashboard General</h1>
            <p className="text-slate-500 font-medium tracking-wide">{empresa?.nombre || 'Distribuidora QUE POLLO'} - Panel de Control</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 relative z-10">
          <button 
            onClick={() => generateFinancialReport(empresa, ventas, compras, caja)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
          >
            <FileText className="w-4 h-4 text-amber-500" />
            Descargar Detalle Financiero
          </button>
          
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center min-w-[120px]">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ingresos</span>
             <span className="text-xl font-black text-slate-900">{formatCurrency(totalVentas)}</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center min-w-[120px]">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Egresos</span>
             <span className="text-xl font-black text-red-600">{formatCurrency(totalCompras)}</span>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/5 blur-3xl rounded-full" />
      </div>

      {/* 4-Column KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
          >
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <div className={cn(
              "text-[11px] font-bold mt-2 flex items-center gap-1",
              stat.isUp ? "text-emerald-500" : "text-red-500"
            )}>
              {stat.isUp ? "▲" : "▼"} {stat.trend} vs anterior
            </div>
          </motion.div>
        ))}
      </div>

      {/* 2:1 Split Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Table/Chart Area (2/3) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Últimas Ventas y Movimientos</h3>
              <button className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                + Nueva Venta
              </button>
            </div>
            
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">ID Factura</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Cliente</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Total</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ventas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic text-xs">No hay movimientos recientes</td>
                    </tr>
                  ) : (
                    ventas.slice(0, 6).map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 text-slate-900 font-medium">{v.numeroFactura}</td>
                        <td className="px-6 py-3.5 text-slate-600">{v.clienteNombre}</td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">{formatCurrency(v.total)}</td>
                        <td className="px-6 py-3.5 text-right">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            v.estado === 'pagada' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {v.estado === 'pagada' ? 'Pagado' : 'Crédito'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Alertas Area (1/3) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Alertas de Inventario</h3>
            </div>
            <div className="p-6 space-y-4">
              {productos.filter(p => p.stock <= 10).length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center">Sin alertas críticas</p>
              ) : (
                productos.filter(p => p.stock <= 10).slice(0, 4).map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-slate-50 border-dashed last:border-0">
                    <span className="font-medium text-slate-700">{p.nombre}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      p.stock <= 5 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {p.stock} {p.unidad}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 pt-0 mt-4 border-t border-slate-100">
              <div className="pt-4 space-y-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cuentas por Pagar</h4>
                <div className="space-y-1">
                   <p className="text-xs text-slate-400 italic text-center py-4">No hay deudas pendientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
