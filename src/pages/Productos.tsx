import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { Producto, Unidad, TipoProducto } from '../types';
import { Plus, Pencil, Trash2, X, Search, Package, Database, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getDocs, where } from 'firebase/firestore';

const DEFAULT_PRODUCTS = [
  { nombre: 'Pernil grande', unidad: 'kg' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Pernil mediano', unidad: 'kg' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Alas', unidad: 'kg' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Hueso', unidad: 'kg' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Picadas', unidad: 'unidad' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Bandeja de hígado', unidad: 'unidad' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Bandeja de molleja', unidad: 'unidad' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Pollo entero', unidad: 'kg' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Bolsa de patas', unidad: 'unidad' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Bandeja de pescuezo', unidad: 'unidad' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Corazones', unidad: 'unidad' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Menudencia grande', unidad: 'unidad' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Menudencia', unidad: 'unidad' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Pechuga', unidad: 'kg' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Gallina', unidad: 'unidad' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Quesos', unidad: 'kg' as Unidad, tipo: 'normal' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Cuajada', unidad: 'kg' as Unidad, tipo: 'normal' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Hielo', unidad: 'unidad' as Unidad, tipo: 'normal' as TipoProducto, stock: 0, precio: 0, costo: 0 },
  { nombre: 'Pernil pequeño', unidad: 'kg' as Unidad, tipo: 'produccion' as TipoProducto, stock: 0, precio: 0, costo: 0 },
];

const Productos = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    nombre: '',
    unidad: 'kg' as Unidad,
    precio: 0,
    costo: 0,
    tipo: 'normal' as TipoProducto,
    stock: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'productos'), orderBy('nombre'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto));
      setProductos(data);
      setLoading(false);
    }, (err) => {
      console.error('Snapshot error:', err);
    });
    return unsubscribe;
  }, []);

  const handleOpenModal = (producto?: Producto) => {
    setStatusMessage(null);
    if (producto) {
      setEditingProducto(producto);
      setFormData({
        nombre: producto.nombre,
        unidad: producto.unidad,
        precio: producto.precio,
        costo: producto.costo,
        tipo: producto.tipo,
        stock: producto.stock
      });
    } else {
      setEditingProducto(null);
      setFormData({
        nombre: '',
        unidad: 'kg',
        precio: 0,
        costo: 0,
        tipo: 'normal',
        stock: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = editingProducto ? `productos/${editingProducto.id}` : 'productos';
    try {
      if (editingProducto) {
        await updateDoc(doc(db, 'productos', editingProducto.id!), formData);
      } else {
        await addDoc(collection(db, 'productos'), formData);
      }
      setIsModalOpen(false);
      setStatusMessage({ text: 'Producto guardado con éxito', type: 'success' });
    } catch (err: any) {
      console.error('Save error:', err);
      setStatusMessage({ text: 'Error al guardar el producto.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este producto?')) {
      const path = `productos/${id}`;
      try {
        await deleteDoc(doc(db, 'productos', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  };

  const handleSeedProducts = async () => {
    setSeeding(true);
    setStatusMessage(null);
    try {
      console.log('Seed started...');
      const prodRef = collection(db, 'productos');
      let addedCount = 0;

      for (const prod of DEFAULT_PRODUCTS) {
        const exists = productos.some(p => p.nombre.toLowerCase().trim() === prod.nombre.toLowerCase().trim());
        if (!exists) {
          await addDoc(prodRef, prod);
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        setStatusMessage({ text: `Éxito: Se agregaron ${addedCount} productos nuevos.`, type: 'success' });
      } else {
        setStatusMessage({ text: 'Todos los productos ya existen.', type: 'success' });
      }
    } catch (err: any) {
      console.error('Seed Error:', err);
      setStatusMessage({ text: 'Error de permisos o conexión.', type: 'error' });
    } finally {
      setSeeding(false);
    }
  };

  const filteredProductos = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Productos</h1>
          <p className="text-slate-500">Gestione el catálogo de su distribuidora</p>
          {statusMessage && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-sm mt-2 font-medium px-3 py-1 rounded-full w-fit",
                statusMessage.type === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}
            >
              {statusMessage.text}
            </motion.p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedProducts}
            disabled={seeding}
            className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-sm disabled:opacity-50"
          >
            {seeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
            Cargar Lista de Imagen
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm w-fit"
          >
            <Plus className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            className="bg-transparent border-none focus:ring-0 w-full text-slate-700 placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Costo</th>
                <th className="px-6 py-4">Precio Venta</th>
                <th className="px-6 py-4">Margen</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded"></div></td>
                  </tr>
                ))
              ) : filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filteredProductos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{producto.nombre}</p>
                      <p className="text-xs text-slate-500">Unidad: {producto.unidad}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        producto.tipo === 'produccion' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {producto.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm font-mono">
                      {formatCurrency(producto.costo)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900 text-sm font-mono">
                      {formatCurrency(producto.precio)}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      <span className={cn(
                        "px-2 py-1 rounded-lg",
                        producto.precio > producto.costo ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      )}>
                        {(((producto.precio - producto.costo) / (producto.precio || 1)) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-mono font-bold",
                          producto.stock <= 5 ? "text-red-600" : "text-slate-700"
                        )}>
                          {producto.stock} {producto.unidad}
                        </span>
                        {producto.stock <= 5 && (
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenModal(producto)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(producto.id!)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Nombre del Producto</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Unidad</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      value={formData.unidad}
                      onChange={(e) => setFormData({ ...formData, unidad: e.target.value as Unidad })}
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="unidad">Unidad</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Tipo</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoProducto })}
                    >
                      <option value="normal">Normal</option>
                      <option value="produccion">Producción (Desposte)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Costo (Compra)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                      value={formData.costo}
                      onChange={(e) => setFormData({ ...formData, costo: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Precio de Venta</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                      value={formData.precio}
                      onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {!editingProducto && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Stock Inicial</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    />
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                  >
                    {editingProducto ? 'Actualizar Producto' : 'Guardar Producto'}
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

export default Productos;
