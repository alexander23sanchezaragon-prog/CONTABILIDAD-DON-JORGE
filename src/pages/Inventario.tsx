import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Producto, AjusteInventario } from '../types';
import { Package, Search, History, Settings2, X, AlertTriangle, ArrowRightLeft, Info } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { adjustStockTransaction } from '../services/inventoryService';

const Inventario = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ajustes, setAjustes] = useState<AjusteInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const { user, isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    cantidadNueva: 0,
    motivo: ''
  });

  useEffect(() => {
    const unsubProd = onSnapshot(query(collection(db, 'productos'), orderBy('nombre')), (snapshot) => {
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
      setLoading(false);
    });

    const unsubAjustes = onSnapshot(query(collection(db, 'ajustes_inventario'), orderBy('fecha', 'desc'), limit(50)), (snapshot) => {
      setAjustes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AjusteInventario)));
    });

    return () => {
      unsubProd();
      unsubAjustes();
    };
  }, []);

  const handleOpenAjuste = (producto: Producto) => {
    if (!isAdmin) return;
    setSelectedProducto(producto);
    setFormData({
      cantidadNueva: producto.stock,
      motivo: ''
    });
    setIsModalOpen(true);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProducto || !isAdmin) return;

    try {
      await adjustStockTransaction({
        productoId: selectedProducto.id!,
        productoNombre: selectedProducto.nombre,
        cantidadAnterior: selectedProducto.stock,
        cantidadNueva: formData.cantidadNueva,
        motivo: formData.motivo,
        adminId: user?.uid || '',
        fecha: new Date()
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Error al realizar el ajuste');
    }
  };

  const filteredProductos = productos.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Control de Inventario</h1>
          <p className="text-slate-500">Supervisión y ajuste de stock en tiempo real</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-3 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-slate-700">Stock Actualizado</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventory List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por producto..."
                className="bg-transparent border-none focus:ring-0 w-full text-slate-700 placeholder-slate-400 text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black spacing-3 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Stock Actual</th>
                    <th className="px-6 py-4">Estado</th>
                    {isAdmin && <th className="px-6 py-4 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Consultando almacén...</td></tr>
                  ) : filteredProductos.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No se encontraron productos.</td></tr>
                  ) : (
                    filteredProductos.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              p.tipo === 'produccion' ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                            )}>
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-none mb-1">{p.nombre}</p>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">{p.tipo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-lg font-black font-mono text-slate-900">{p.stock} <span className="text-xs font-medium text-slate-400">{p.unidad}</span></p>
                        </td>
                        <td className="px-6 py-4">
                          {p.stock <= 0 ? (
                            <span className="flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black w-fit uppercase">
                              <AlertTriangle className="w-3 h-3" /> Agotado
                            </span>
                          ) : p.stock <= 10 ? (
                            <span className="flex items-center gap-1.5 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black w-fit uppercase">
                              <Info className="w-3 h-3" /> Bajo
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black w-fit uppercase">
                              Óptimo
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenAjuste(p)}
                              className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100/50 hover:bg-slate-200 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="Ajuste Manual"
                            >
                              <Settings2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Adjustments History */}
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative border border-slate-800 shadow-xl shadow-slate-900/40">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
              <History className="w-4 h-4" />
              Historial de Ajustes
            </h3>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {ajustes.length === 0 ? (
                <p className="text-slate-500 text-sm italic py-8 text-center bg-slate-800/20 rounded-xl">No hay registros de ajustes manuales.</p>
              ) : (
                ajustes.map((a) => (
                  <div key={a.id} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">{a.productoNombre}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{formatDate(a.fecha)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Antes</span>
                        <span className="text-sm font-mono font-bold text-red-400">{a.cantidadAnterior}</span>
                      </div>
                      <ArrowRightLeft className="w-4 h-4 text-slate-600" />
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Después</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">{a.cantidadNueva}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed bg-slate-900/50 p-2 rounded-lg italic">
                      "{a.motivo || 'Sin motivo especificado'}"
                    </p>
                  </div>
                ))
              )}
            </div>
            
            <Package className="w-32 h-32 absolute -right-8 -bottom-8 opacity-5 -rotate-12 pointer-events-none" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && selectedProducto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 bg-slate-50 border-b border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Ajuste de Stock</h2>
                    <p className="text-sm font-medium text-slate-500">Corrigiendo inventario para: <span className="text-blue-600 font-bold">{selectedProducto.nombre}</span></p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleAdjust} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Cantidad Actual</label>
                    <div className="w-full bg-slate-100 border-2 border-slate-100 rounded-2xl p-4 text-center">
                      <p className="text-3xl font-black font-mono text-slate-400">{selectedProducto.stock}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black uppercase text-blue-400 tracking-widest pr-1">Nueva Cantidad</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl p-4 text-center text-3xl font-black font-mono focus:ring-4 focus:ring-blue-100 focus:outline-none focus:border-blue-300 transition-all"
                      value={formData.cantidadNueva}
                      onChange={(e) => setFormData({ ...formData, cantidadNueva: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Motivo del Ajuste</label>
                  <textarea
                    required
                    placeholder="Ej. Devolución parcial, pérdida de peso por frío, error de digitación..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium min-h-[100px] focus:ring-4 focus:ring-slate-100 focus:outline-none transition-all resize-none"
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-slate-900/10 uppercase tracking-widest text-sm flex items-center justify-center gap-2 group"
                >
                  <Settings2 className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                  Aplicar Ajuste de Inventario
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventario;
