export interface Empresa {
  id?: string;
  nombre: string;
  nit?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  logoUrl?: string;
  consecutivoCompra: number;
  consecutivoVenta: number;
}

export type Unidad = 'kg' | 'unidad';
export type TipoProducto = 'normal' | 'produccion';

export interface Producto {
  id?: string;
  nombre: string;
  unidad: Unidad;
  precio: number;
  costo: number;
  tipo: TipoProducto;
  stock: number;
}

export interface Proveedor {
  id?: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  saldoPendiente: number;
}

export type TipoPago = 'contado' | 'credito';
export type EstadoFactura = 'pagada' | 'pendiente';

export interface Compra {
  id?: string;
  numeroFactura: string;
  fecha: any; // Timestamp
  proveedorId: string;
  proveedorNombre?: string;
  total: number;
  tipoPago: TipoPago;
  saldoPendiente: number;
  estado: EstadoFactura;
}

export interface DetalleCompra {
  id?: string;
  compraId: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface Venta {
  id?: string;
  numeroFactura: string;
  fecha: any; // Timestamp
  clienteNombre: string;
  clienteTelefono?: string;
  clienteDireccion?: string;
  total: number;
  tipoPago: TipoPago;
  saldoPendiente: number;
  estado: EstadoFactura;
}

export interface DetalleVenta {
  id?: string;
  ventaId: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface Empleado {
  id: string;
  nombre: string;
  cargo: string;
  salarioBase: number;
  telefono?: string;
  fechaIngreso: Date;
  estado: 'activo' | 'inactivo';
}

export interface PagoEmpleado {
  id: string;
  empleadoId: string;
  empleadoNombre: string;
  fecha: any;
  monto: number;
  tipo: 'salario' | 'adelanto' | 'bonificacion';
  observaciones?: string;
}

export type TipoMovimiento = 'entrada' | 'salida';

export interface Caja {
  id?: string;
  fecha: any;
  tipo: TipoMovimiento;
  monto: number;
  concepto: string;
  referenciaId?: string; // ID de la venta o compra o abono
}

export interface AjusteInventario {
  id?: string;
  fecha: any;
  productoId: string;
  productoNombre: string;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo: string;
  adminId: string;
}

export interface AbonoCompra {
  id?: string;
  fecha: any;
  compraId: string;
  monto: number;
}

export interface AbonoVenta {
  id?: string;
  fecha: any;
  ventaId: string;
  monto: number;
}
