-- ==========================================
-- VELORA POS - Módulo SaaS Multi-Tenant Supabase
-- ==========================================

-- 1. Tenants (Empresas)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_empresa TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    plan TEXT DEFAULT 'basico',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido'))
);

-- 2. Sucursales
CREATE TABLE public.sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    ciudad TEXT,
    estado TEXT DEFAULT 'activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Usuarios
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id),
    auth_user_id UUID UNIQUE, -- Link a auth.users de Supabase
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'cajero')),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Categorias
CREATE TABLE public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Productos
CREATE TABLE public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    sku TEXT,
    codigo_barras TEXT,
    categoria_id UUID REFERENCES public.categorias(id),
    precio_compra NUMERIC(10,2) NOT NULL DEFAULT 0,
    precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0,
    precio_minimo NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    control_lotes BOOLEAN DEFAULT false,
    tiene_vencimiento BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fecha_vencimiento DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Producto Conocimiento (IA Naturista)
CREATE TABLE public.producto_conocimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    beneficios TEXT,
    sintomas TEXT,
    contraindicaciones TEXT,
    ingredientes TEXT,
    modo_uso TEXT
);

-- 7. Lotes de Producto
CREATE TABLE public.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    numero_lote TEXT NOT NULL,
    fecha_vencimiento DATE,
    stock INTEGER NOT NULL DEFAULT 0,
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Clientes
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    documento TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    tipo_cliente TEXT DEFAULT 'normal' CHECK (tipo_cliente IN ('normal', 'vip', 'mayorista')),
    credito_disponible NUMERIC(10,2) DEFAULT 0,
    puntos INTEGER DEFAULT 0,
    notas TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Proveedores
CREATE TABLE public.proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    contacto TEXT,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Cajas
CREATE TABLE public.cajas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    activa BOOLEAN DEFAULT true
);

-- 11. Sesiones de Caja
CREATE TABLE public.sesiones_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id UUID NOT NULL REFERENCES public.cajas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
    hora_apertura TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    hora_cierre TIMESTAMP WITH TIME ZONE,
    monto_inicial NUMERIC(10,2) NOT NULL,
    monto_final NUMERIC(10,2),
    estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada'))
);

-- 12. Movimientos de Caja
CREATE TABLE public.caja_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id UUID NOT NULL REFERENCES public.cajas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('venta', 'retiro', 'ingreso', 'ajuste')),
    monto NUMERIC(10,2) NOT NULL,
    descripcion TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Ventas
CREATE TABLE public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id),
    caja_id UUID REFERENCES public.cajas(id),
    usuario_id UUID REFERENCES public.usuarios(id),
    cliente_id UUID REFERENCES public.clientes(id),
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
    impuestos NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'credito_cliente', 'mixto')),
    estado TEXT DEFAULT 'completada' CHECK (estado IN ('completada', 'anulada', 'pendiente')),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Venta Items
CREATE TABLE public.venta_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id),
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
    descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 15. Pagos (Para pagos mixtos o múltiples)
CREATE TABLE public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'credito_cliente')),
    monto NUMERIC(10,2) NOT NULL,
    referencia TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. Inventario (Stock actual por sucursal)
CREATE TABLE public.inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_reservado INTEGER NOT NULL DEFAULT 0,
    stock_disponible INTEGER NOT NULL DEFAULT 0,
    ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Historial de Inventario (Movimientos)
CREATE TABLE public.inventario_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('venta', 'ajuste', 'ingreso', 'devolucion')),
    cantidad INTEGER NOT NULL,
    referencia TEXT,
    usuario_id UUID REFERENCES public.usuarios(id),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Promociones
CREATE TABLE public.promociones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('2x1', 'descuento_cantidad', 'combo', 'descuento_vip', 'fecha_especial')),
    valor NUMERIC(10,2) NOT NULL DEFAULT 0,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    activo BOOLEAN DEFAULT true
);

-- 19. Facturas Electronicas (Preparado DIAN)
CREATE TABLE public.facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    numero_factura TEXT NOT NULL,
    cufe TEXT,
    xml_url TEXT,
    pdf_url TEXT,
    estado_dian TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 20. Auditoria / Logs
CREATE TABLE public.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.usuarios(id),
    accion TEXT NOT NULL,
    tabla TEXT NOT NULL,
    registro_id UUID,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip TEXT
);

-- ==========================================
-- INDEXES DE RENDIMIENTO (Cruciales para POS veloz)
-- ==========================================
CREATE INDEX idx_productos_tenant ON public.productos(tenant_id);
CREATE INDEX idx_productos_codigo_barras ON public.productos(codigo_barras);
CREATE INDEX idx_ventas_tenant_fecha ON public.ventas(tenant_id, fecha);
CREATE INDEX idx_clientes_tenant_doc ON public.clientes(tenant_id, documento);
CREATE INDEX idx_inv_movs_prod_sucursal ON public.inventario_movimientos(producto_id, sucursal_id);
CREATE INDEX idx_usuarios_auth ON public.usuarios(auth_user_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) - Aislamiento Multi-Tenant
-- ==========================================
-- Ejemplo para activar RLS en las tablas principales
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Nota: Las politicas RLS completas requieren leer el auth.uid() de Supabase
-- y emparejarlo con el tenant_id del usuario autenticado.
-- Esto se implementará en la capa de negocio o en policy scripts detallados.
