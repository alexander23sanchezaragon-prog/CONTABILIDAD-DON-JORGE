import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { Proveedor } from '../types';
import { Plus, Pencil, Trash2, X, Search, Truck, Phone, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Proveedores = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    saldoPendiente: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'proveedores'), orderBy('nombre'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proveedor));
      setProveedores(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleOpenModal = (proveedor?: Proveedor) => {
    if (proveedor) {
      setEditingProveedor(proveedor);
      setFormData({
        nombre: proveedor.nombre,
        contacto: proveedor.contacto || '',
        telefono: proveedor.telefono || '',
        saldoPendiente: proveedor.saldoPendiente
      });
    } else {
      setEditingProveedor(null);
      setFormData({
        nombre: '',
        contacto: '',
        telefono: '',
        saldoPendiente: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProveedor) {
        await updateDoc(doc(db, 'proveedores', editingProveedor.id!), formData);
      } else {
        await addDoc(collection(db, 'proveedores'), formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving proveedor:', error);
    }
  };

  const handleDelete = async (id: string, saldo: number) => {
    if (saldo > 0) {
      alert('No se puede eliminar un proveedor con saldo pendiente.');
      return;
    }
    if (window.confirm('¿Está seguro de eliminar este proveedor?')) {
      try {
        await deleteDoc(doc(db, 'proveedores', id));
      } catch (error) {
        console.error('Error deleting proveedor:', error);
      }
    }
  };

  const filteredProveedores = proveedores.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.contacto?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Proveedores</h1>
          <p className="text-slate-500">Gestione sus relaciones comerciales</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm w-fit"
        >
          <Plus className="w-5 h-5" />
          Nuevo Proveedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Proveedores</p>
          <p className="text-2xl font-bold text-slate-900">{proveedores.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Saldo Pendiente Total</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(proveedores.reduce((acc, curr) => acc + (curr.saldoPendiente || 0), 0))}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Proveedores con Deuda</p>
          <p className="text-2xl font-bold text-orange-600">
            {proveedores.filter(p => p.saldoPendiente > 0).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o contacto..."
            className="bg-transparent border-none focus:ring-0 w-full text-slate-700 placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Proveedor</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-right">Saldo Pendiente</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded"></div></td>
                  </tr>
                ))
              ) : filteredProveedores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Truck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    No se encontraron proveedores
                  </td>
                </tr>
              ) : (
                filteredProveedores.map((proveedor) => (
                  <tr key={proveedor.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{proveedor.nombre}</p>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {proveedor.contacto && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <User className="w-3.5 h-3.5" />
                          {proveedor.contacto}
                        </div>
                      )}
                      {proveedor.telefono && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5" />
                          {proveedor.telefono}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "font-mono font-bold text-sm px-3 py-1 rounded-lg",
                        proveedor.saldoPendiente > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {formatCurrency(proveedor.saldoPendiente)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenModal(proveedor)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(proveedor.id!, proveedor.saldoPendiente)}
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
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Nombre de la Empresa</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Persona de Contacto</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    value={formData.contacto}
                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Teléfono</label>
                  <input
                    type="tel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>

                {isAdmin && !editingProveedor && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Saldo Inicial Pendiente</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                      value={formData.saldoPendiente}
                      onChange={(e) => setFormData({ ...formData, saldoPendiente: Number(e.target.value) })}
                    />
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                  >
                    {editingProveedor ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
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

export default Proveedores;
