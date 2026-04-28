import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Producto } from '../types';
import { Boxes, Plus, Trash2, ArrowRight, Calculator, CheckCircle2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { processProductionTransaction, ProductionItem } from '../services/productionService';

const Produccion = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [sourceProduct, setSourceProduct] = useState('');
  const [sourceQuantity, setSourceQuantity] = useState(1);
  
  // Results
  const [results, setResults] = useState<ProductionItem[]>([]);
  const [targetProduct, setTargetProduct] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [targetCost, setTargetCost] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'productos'), (snapshot) => {
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addResult = () => {
    const p = productos.find(prod => prod.id === targetProduct);
    if (!p) return;
    
    setResults([...results, {
      id: p.id!,
      nombre: p.nombre,
      cantidad: targetQuantity,
      precioUnitario: targetCost
    }]);
    
    setTargetProduct('');
    setTargetQuantity(1);
    setTargetCost(0);
  };

  const removeResult = (idx: number) => {
    setResults(results.filter((_, i) => i !== idx));
  };

  const handleProcess = async () => {
    if (!sourceProduct || results.length === 0) return;
    
    try {
      setLoading(true);
      await processProductionTransaction(sourceProduct, sourceQuantity, results);
      setSourceProduct('');
      setSourceQuantity(1);
      setResults([]);
      alert("Producción procesada con éxito");
    } catch (error: any) {
      alert(error.message || "Error al procesar producción");
    } finally {
      setLoading(false);
    }
  };

  const source = productos.find(p => p.id === sourceProduct);
  const totalAllocated = results.reduce((acc, curr) => acc + (curr.cantidad * curr.precioUnitario), 0);
  const totalWeight = results.reduce((acc, curr) => acc + curr.cantidad, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Producción (Desposte)</h1>
        <p className="text-slate-500">Convierta pollo entero en piezas y distribuya costos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Source Material */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Boxes className="w-4 h-4 text-orange-500" />
              Materia Prima (Origen)
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 italic">Producto Origen</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                value={sourceProduct}
                onChange={(e) => setSourceProduct(e.target.value)}
              >
                <option value="">Seleccione el pollo...</option>
                {productos.filter(p => p.tipo === 'produccion').map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.stock} {p.unidad})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 italic">Diferencia Peso/Cant</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono"
                  value={sourceQuantity}
                  onChange={(e) => setSourceQuantity(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 italic">Costo Actual p/u</label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-mono text-slate-500">
                  {source ? formatCurrency(source.costo) : '$ 0'}
                </div>
              </div>
            </div>

            {source && (
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                <p className="text-[10px] text-orange-600 font-bold uppercase mb-1">Costo Total a Distribuir</p>
                <p className="text-2xl font-black text-orange-700 tracking-tighter">
                  {formatCurrency(source.costo * sourceQuantity)}
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-4 overflow-hidden relative">
            <h3 className="text-xs font-bold uppercase text-slate-400">Resumen de Escándalo</h3>
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Peso Resultante:</span>
                <span className="font-bold">{totalWeight.toFixed(2)} Kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Costo Asignado:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(totalAllocated)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-500">Diferencia vs Origen:</span>
                <span className={cn(
                  "font-mono text-sm",
                  source && (totalAllocated > source.costo * sourceQuantity) ? "text-red-400" : "text-emerald-400"
                )}>
                  {source ? formatCurrency(totalAllocated - (source.costo * sourceQuantity)) : '$ 0'}
                </span>
              </div>
            </div>
            <Calculator className="w-16 h-16 absolute -right-2 -bottom-2 text-white/5 -rotate-12" />
          </div>
        </div>

        {/* Target Material List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase">Productos Resultantes</h3>
              <div className="flex items-center gap-2">
                <select
                  className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                  value={targetProduct}
                  onChange={(e) => setTargetProduct(e.target.value)}
                >
                  <option value="">Seleccione pieza...</option>
                  {productos.filter(p => p.id !== sourceProduct).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Peso"
                  className="w-20 bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Number(e.target.value))}
                />
                <input
                  type="number"
                  placeholder="Costo"
                  className="w-28 bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono"
                  value={targetCost}
                  onChange={(e) => setTargetCost(Number(e.target.value))}
                />
                <button
                  onClick={addResult}
                  disabled={!targetProduct}
                  className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
                  <tr>
                    <th className="px-6 py-3">Pieza</th>
                    <th className="px-6 py-3">Peso Final</th>
                    <th className="px-6 py-3">Costo Asignado</th>
                    <th className="px-6 py-3 text-right">Subtotal</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic text-sm">
                        Agregue las piezas resultantes del desposte.
                      </td>
                    </tr>
                  ) : (
                    results.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-900">{item.nombre}</td>
                        <td className="px-6 py-4 font-mono">{item.cantidad} Kg</td>
                        <td className="px-6 py-4 font-mono text-slate-600">{formatCurrency(item.precioUnitario)}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(item.cantidad * item.precioUnitario)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => removeResult(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-bold uppercase tracking-widest">Listo para procesar desposte</span>
              </div>
              <button
                onClick={handleProcess}
                disabled={results.length === 0 || !sourceProduct || loading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3 text-sm tracking-widest uppercase disabled:opacity-50"
              >
                Procesar Producción
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Produccion;
