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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LISTA */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por producto..."
                className="bg-transparent border-none focus:ring-0 w-full text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <table className="w-full">
              <tbody>
                {filteredProductos.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4 font-bold">{p.nombre}</td>

                    {/* 👇 MOSTRAR DECIMALES */}
                    <td className="p-4 font-mono">
                      {Number(p.stock).toFixed(2)} {p.unidad}
                    </td>

                    {isAdmin && (
                      <td className="p-4 text-right">
                        <button onClick={() => handleOpenAjuste(p)}>
                          <Settings2 />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>

        {/* HISTORIAL */}
        <div>
          {ajustes.map(a => (
            <div key={a.id}>
              {a.productoNombre} → {Number(a.cantidadNueva).toFixed(2)}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && selectedProducto && (
          <div className="fixed inset-0 flex items-center justify-center">

            <motion.div className="bg-white p-6 rounded-xl w-full max-w-md">

              <form onSubmit={handleAdjust}>

                <h2 className="font-bold mb-4">
                  Ajustar: {selectedProducto.nombre}
                </h2>

                {/* 👇 INPUT CORREGIDO */}
                <input
                  type="number"
                  step="0.01"   // 🔥 CLAVE
                  min="0"
                  value={formData.cantidadNueva}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cantidadNueva: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full border p-3 mb-4 text-xl text-center"
                />

                <textarea
                  placeholder="Motivo"
                  value={formData.motivo}
                  onChange={(e) =>
                    setFormData({ ...formData, motivo: e.target.value })
                  }
                  className="w-full border p-3 mb-4"
                />

                <button className="bg-black text-white w-full p-3">
                  Ajustar
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
