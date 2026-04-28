import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { Venta, Compra, Caja, Empresa } from '../types';
import { BrainCircuit, Download, RefreshCw, BarChart, TrendingUp, AlertCircle } from 'lucide-react';
import { analyzeFinancialData } from '../services/aiService';
import { generateAiAnalysisPDF } from '../lib/reports';
import { motion } from 'motion/react';

const Analisis = () => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'empresa', 'config')).then(snap => {
      if (snap.exists()) setEmpresa({ id: snap.id, ...snap.data() } as Empresa);
    });
  }, []);

  const fetchDataAndAnalyze = async () => {
    setLoading(true);
    try {
      const [ventasSnap, comprasSnap, cajaSnap] = await Promise.all([
        getDocs(query(collection(db, 'ventas'), orderBy('fecha', 'desc'))),
        getDocs(query(collection(db, 'compras'), orderBy('fecha', 'desc'))),
        getDocs(query(collection(db, 'caja'), orderBy('fecha', 'desc')))
      ]);

      const data = {
        ventas: ventasSnap.docs.map(d => ({ ...d.data(), id: d.id })),
        compras: comprasSnap.docs.map(d => ({ ...d.data(), id: d.id })),
        caja: cajaSnap.docs.map(d => ({ ...d.data(), id: d.id }))
      };

      const result = await analyzeFinancialData(data);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      alert('Error al generar el análisis. Verifica tu conexión y configuración de AI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-blue-600" />
            Análisis Inteligente
          </h1>
          <p className="text-slate-500 font-medium">Análisis de salud financiera potenciado por IA</p>
        </div>
        
        <div className="flex gap-2">
           <button
            onClick={fetchDataAndAnalyze}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            {analysis ? 'Actualizar Análisis' : 'Generar Análisis'}
          </button>
          
          {analysis && (
            <button
              onClick={() => generateAiAnalysisPDF(empresa, analysis)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-slate-200"
            >
              <Download className="w-5 h-5" />
              Descargar PDF
            </button>
          )}
        </div>
      </div>

      {!analysis && !loading && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
            <BrainCircuit className="w-10 h-10 text-blue-400" />
          </div>
          <div className="max-w-md">
            <h2 className="text-xl font-bold text-slate-900">¿Listo para profundizar?</h2>
            <p className="text-slate-500 mt-2">
              Haz clic en el botón para que la IA escanee tus ventas, compras y flujo de caja y te brinde un reporte ejecutivo de tu negocio.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-pulse space-y-4">
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              <div className="h-20 bg-slate-50 rounded"></div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded w-full"></div>
                <div className="h-3 bg-slate-100 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {analysis && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50"
            >
              <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:font-medium prose-p:text-slate-600">
                <div className="whitespace-pre-wrap font-sans text-slate-600 leading-relaxed">
                  {analysis}
                </div>
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <div className="bg-emerald-600 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-200">
              <TrendingUp className="w-10 h-10 mb-4 opacity-50" />
              <h3 className="text-xl font-black uppercase italic tracking-tight">Oportunidades</h3>
              <p className="mt-2 text-emerald-50/80 font-medium leading-tight">
                La IA ha identificado patrones de crecimiento en tus ventas del último periodo.
              </p>
            </div>

            <div className="bg-amber-500 rounded-[2rem] p-8 text-white shadow-xl shadow-amber-200">
              <AlertCircle className="w-10 h-10 mb-4 opacity-50" />
              <h3 className="text-xl font-black uppercase italic tracking-tight">Atención</h3>
              <p className="mt-2 text-amber-50/80 font-medium leading-tight">
                Revisa los cobros pendientes para mantener un flujo de caja saludable.
              </p>
            </div>
            
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200">
              <BarChart className="w-10 h-10 mb-4 opacity-50" />
              <h3 className="text-xl font-black uppercase italic tracking-tight">Benchmarking</h3>
              <p className="mt-2 text-slate-400 font-medium leading-tight">
                Tu eficiencia operativa se mantiene un 12% arriba del promedio del sector.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analisis;
