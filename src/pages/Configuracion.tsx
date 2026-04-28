import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Building2, Save, Mail, Phone, MapPin, Hash, Image as ImageIcon, CheckCircle2, X, Lock, Database, RefreshCw } from 'lucide-react';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { motion } from 'motion/react';

const DEFAULT_PRODUCTS = [
  { nombre: 'Pernil grande', unidad: 'kg', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Pernil mediano', unidad: 'kg', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Alas', unidad: 'kg', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Hueso', unidad: 'kg', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Picadas', unidad: 'unidad', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Bandeja de hígado', unidad: 'unidad', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Bandeja de molleja', unidad: 'unidad', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Pollo entero', unidad: 'kg', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Bolsa de patas', unidad: 'unidad', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Bandeja de pescuezo', unidad: 'unidad', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Corazones', unidad: 'unidad', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Menudencia grande', unidad: 'unidad', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Menudencia', unidad: 'unidad', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Pechuga', unidad: 'kg', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Gallina', unidad: 'unidad', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Quesos', unidad: 'kg', tipo: 'normal', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Cuajada', unidad: 'kg', tipo: 'normal', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Hielo', unidad: 'unidad', tipo: 'normal', stock: 0, precio: 0, costo: 0 },
  { nombre: 'Pernil pequeño', unidad: 'kg', tipo: 'produccion', stock: 0, precio: 0, costo: 0 },
];

const Configuracion = () => {
  const { empresa, refreshEmpresa, isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    nit: '',
    direccion: '',
    telefono: '',
    correo: '',
    logoUrl: '',
    consecutivoCompra: 1,
    consecutivoVenta: 1
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSeedProducts = async () => {
    if (!confirm('¿Deseas agregar los productos básicos al inventario?')) return;
    setSeeding(true);
    try {
      const prodRef = collection(db, 'productos');
      let addedCount = 0;

      for (const prod of DEFAULT_PRODUCTS) {
        const q = query(prodRef, where('nombre', '==', prod.nombre));
        const snap = await getDocs(q);
        if (snap.empty) {
          await addDoc(prodRef, prod);
          addedCount++;
        }
      }
      alert(`Se agregaron ${addedCount} productos nuevos.`);
    } catch (error) {
      console.error(error);
      alert('Error al agregar productos.');
    } finally {
      setSeeding(false);
    }
  };

  React.useEffect(() => {
    if (empresa) {
      setFormData(empresa);
    }
  }, [empresa]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Lock className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold">Acceso Denegado</h2>
        <p>Solo el administrador puede acceder a esta sección.</p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert('Por favor seleccione una imagen válida (JPG, PNG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, logoUrl: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await setDoc(doc(db, 'empresa', 'config'), formData as any, { merge: true });
      await refreshEmpresa();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error updating config:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configuración</h1>
        <p className="text-slate-500">Gestione la información y parámetros de su empresa</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Información Institucional
              </h3>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Nombre de la Empresa
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-slate-400" />
                    NIT
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                    value={formData.nit}
                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  Dirección
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  Logo de la Empresa
                </label>
                
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    {formData.logoUrl && (
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, logoUrl: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-bold text-slate-900">Subir nueva imagen</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Sube el logo de tu empresa en formato JPG o PNG. 
                      Se recomienda un tamaño de 200x200px con fondo transparente para mejor apariencia.
                    </p>
                    <label className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <ImageIcon className="w-3 h-3" />
                      Seleccionar Archivo
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png" 
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Próximo Núm. Compra</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-mono"
                    value={formData.consecutivoCompra}
                    onChange={(e) => setFormData({ ...formData, consecutivoCompra: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Próximo Núm. Venta</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all font-mono"
                    value={formData.consecutivoVenta}
                    onChange={(e) => setFormData({ ...formData, consecutivoVenta: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6">
                {saved && (
                  <motion.span 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-emerald-600 text-sm font-bold flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Cambios guardados
                  </motion.span>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-xl shadow-blue-600/20">
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5" />
              Estado del Sistema
            </h3>
            <p className="text-sm text-blue-100 mb-4">Su sistema está configurado y funcionando correctamente con Firebase.</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-blue-500/30">
                <span>Base de Datos</span>
                <span className="font-bold">Conectado</span>
              </div>
              <div className="flex justify-between py-1 border-b border-blue-500/30">
                <span>Autenticación</span>
                <span className="font-bold">Activa</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Versión ERP</span>
                <span className="font-bold">1.0.0-beta</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-900/40 border border-slate-800">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-amber-500" />
              Mantenimiento
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Herramientas para la gestión masiva de datos y recuperación del sistema.
            </p>
            <button
              onClick={handleSeedProducts}
              disabled={seeding}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
            >
              {seeding ? (
                 <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {seeding ? 'Procesando...' : 'Cargar Productos Base'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;
