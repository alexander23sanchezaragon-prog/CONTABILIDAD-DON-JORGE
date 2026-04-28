import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import Ventas from './pages/Ventas';
import Caja from './pages/Caja';
import Inventario from './pages/Inventario';
import Produccion from './pages/Produccion';
import Empleados from './pages/Empleados';
import Analisis from './pages/Analisis';
import Configuracion from './pages/Configuracion';
import { AuthProvider } from './hooks/useAuth';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/produccion" element={<Produccion />} />
            <Route path="/empleados" element={<Empleados />} />
            <Route path="/analisis" element={<Analisis />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
