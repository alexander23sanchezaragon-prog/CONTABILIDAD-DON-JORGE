import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { Empleado, PagoEmpleado } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { 
  Users, 
  Plus, 
  DollarSign, 
  Calendar, 
  Trash2, 
  Briefcase,
  Search,
  ChevronRight,
  TrendingDown,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { registerPagoEmpleado } from '../services/paymentsService';

const Empleados = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [pagos, setPagos] = useState<PagoEmpleado[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // New Employee Form
  const [newEmpleado, setNewEmpleado] = useState({
    nombre: '',
    cargo: '',
    salarioBase: 0,
    telefono: '',
    fechaIngreso: new Date().toISOString().split('T')[0]
  });

  // Pay Form
  const [pagoForm, setPagoForm] = useState({
    empleadoId: '',
    monto: 0,
    tipo: 'salario' as any,
    fecha: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  useEffect(() => {
    const unsubEmp = onSnapshot(query(collection(db, 'empleados'), orderBy('nombre')), (snap) => {
      setEmpleados(snap.docs.map(d => ({ id: d.id, ...d.data() } as Empleado)));
      setLoading(false);
    });

    const unsubPagos = onSnapshot(query(collection(db, 'pagos_empleados'), orderBy('fecha', 'desc')), (snap) => {
      setPagos(snap.docs.map(d => ({ id: d.id, ...d.data() } as PagoEmpleado)));
    });

    return () => {
      unsubEmp();
      unsubPagos();
    };
  }, []);

  const handleCreateEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'empleados'), {
        ...newEmpleado,
        fechaIngreso: Timestamp.fromDate(new Date(newEmpleado.fechaIngreso)),
        estado: 'activo'
      });
      setIsModalOpen(false);
      setNewEmpleado({ nombre: '', cargo: '', salarioBase: 0, telefono: '', fechaIngreso: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error(error);
      alert('Error al crear empleado');
    }
  };

  const handleRegisterPago = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const emp = empleados.find(em => em.id === pagoForm.empleadoId);
      if (!emp) return;

      await registerPagoEmpleado({
        ...pagoForm,
        empleadoNombre: emp.nombre,
      });
      setIsPagoModalOpen(false);
      setPagoForm({ empleadoId: '', monto: 0, tipo: 'salario', fecha: new Date().toISOString().split('T')[0], observaciones: '' });
    } catch (error) {
      console.error(error);
      alert('Error al registrar pago');
    }
  };

  const filteredEmpleados = empleados.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Nómina y Personal</h1>
          <p className="text-slate-500 font-medium tracking-wide">Gestión de empleados, salarios y adelantos</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setIsPagoModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Registrar Pago / Adelanto
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/10"
          >
            <Plus className="w-4 h-4" />
            Nuevo Empleado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employees List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar empleado por nombre o cargo..."
              className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEmpleados.map((emp) => (
              <motion.div 
                layout
                key={emp.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salario Base</p>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(emp.salarioBase)}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase italic tracking-tight">{emp.nombre}</h3>
                  <p className="text-sm font-bold text-blue-600 mb-1">{emp.cargo}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Desde: {formatDate(emp.fechaIngreso)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden h-fit">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Últimos Pagos
            </h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-auto">
            {pagos.map((pago) => (
              <div key={pago.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase italic">{pago.empleadoNombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
                        pago.tipo === 'salario' ? "bg-emerald-100 text-emerald-700" : 
                        pago.tipo === 'adelanto' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {pago.tipo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{formatDate(pago.fecha)}</span>
                    </div>
                  </div>
                  <p className="text-sm font-black text-slate-900">-{formatCurrency(pago.monto)}</p>
                </div>
                {pago.observaciones && (
                  <p className="text-[10px] text-slate-500 mt-2 italic">"{pago.observaciones}"</p>
                )}
              </div>
            ))}
            {pagos.length === 0 && (
              <div className="p-10 text-center text-slate-400 italic text-sm">
                No hay pagos registrados
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Employee Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Nuevo Empleado</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateEmpleado} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nombre Completo</label>
                  <input
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newEmpleado.nombre}
                    onChange={e => setNewEmpleado({...newEmpleado, nombre: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Cargo</label>
                    <input
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newEmpleado.cargo}
                      onChange={e => setNewEmpleado({...newEmpleado, cargo: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Salario Base</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newEmpleado.salarioBase}
                      onChange={e => setNewEmpleado({...newEmpleado, salarioBase: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Teléfono</label>
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newEmpleado.telefono}
                    onChange={e => setNewEmpleado({...newEmpleado, telefono: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Fecha de Ingreso</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newEmpleado.fechaIngreso}
                    onChange={e => setNewEmpleado({...newEmpleado, fechaIngreso: e.target.value})}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  Guardar Empleado
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPagoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Registrar Pago</h2>
                <button onClick={() => setIsPagoModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleRegisterPago} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Empleado</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-medium"
                    value={pagoForm.empleadoId}
                    onChange={e => {
                      const empId = e.target.value;
                      const emp = empleados.find(em => em.id === empId);
                      setPagoForm({
                        ...pagoForm, 
                        empleadoId: empId,
                        monto: emp?.salarioBase || 0
                      });
                    }}
                  >
                    <option value="">Seleccionar empleado...</option>
                    {empleados.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre} - {emp.cargo}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Tipo de Pago</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-medium"
                      value={pagoForm.tipo}
                      onChange={e => setPagoForm({...pagoForm, tipo: e.target.value as any})}
                    >
                      <option value="salario">Salario</option>
                      <option value="adelanto">Adelanto</option>
                      <option value="bonificacion">Bonificación</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Monto</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-mono"
                      value={pagoForm.monto}
                      onChange={e => setPagoForm({...pagoForm, monto: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Observaciones</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-medium h-20 resize-none"
                    placeholder="Ej: Pago quincena segunda..."
                    value={pagoForm.observaciones}
                    onChange={e => setPagoForm({...pagoForm, observaciones: e.target.value})}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase italic py-4 rounded-2xl shadow-xl shadow-slate-900/20 transition-all"
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

export default Empleados;
