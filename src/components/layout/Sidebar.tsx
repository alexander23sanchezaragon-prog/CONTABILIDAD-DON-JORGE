import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Tag, 
  Wallet, 
  BarChart3, 
  Settings, 
  LogOut,
  Boxes,
  Truck,
  BrainCircuit
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

const Sidebar = () => {
  const { signOut, isAdmin, empresa } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Inventario', path: '/inventario' },
    { icon: Tag, label: 'Productos', path: '/productos' },
    { icon: Truck, label: 'Proveedores', path: '/proveedores' },
    { icon: Users, label: 'Personal', path: '/empleados' },
    { icon: ShoppingCart, label: 'Compras', path: '/compras' },
    { icon: BarChart3, label: 'Ventas', path: '/ventas' },
    { icon: Wallet, label: 'Caja', path: '/caja' },
    { icon: Boxes, label: 'Producción', path: '/produccion' },
    { icon: BrainCircuit, label: 'Análisis IA', path: '/analisis' },
  ];

  if (isAdmin) {
    menuItems.push({ icon: Settings, label: 'Configuración', path: '/configuracion' });
  }

  return (
    <aside className="w-[220px] bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-slate-900 shrink-0 overflow-hidden">
          {empresa?.logoUrl ? (
            <img src={empresa.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            "QP"
          )}
        </div>
        <div className="overflow-hidden">
          <h1 className="text-sm font-bold text-white truncate">{empresa?.nombre || 'QUE POLLO'}</h1>
          <p className="text-[10px] opacity-60">Distribuidora ERP</p>
        </div>
      </div>
      
      <nav className="flex-1 p-0 space-y-0.5 mt-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-6 py-3 transition-all text-xs font-medium",
                isActive 
                  ? "bg-white/5 text-white border-l-[3px] border-amber-500" 
                  : "text-white/70 hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-4 h-4", isActive ? "text-amber-500" : "text-white/40")} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-600/10 hover:text-red-500 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
