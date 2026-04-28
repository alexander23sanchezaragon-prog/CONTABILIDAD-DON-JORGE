import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User as UserIcon } from 'lucide-react';

const Navbar = () => {
  const { user, isAdmin } = useAuth();

  return (
    <header className="h-[64px] bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30 ml-[220px]">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Resumen General</h2>
        <p className="text-[11px] text-slate-500 italic">Bienvenido de nuevo</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900">{user?.email}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{isAdmin ? 'Administrador' : 'Operador'}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 font-bold text-slate-600 text-xs uppercase">
          {user?.email?.substring(0, 2)}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
