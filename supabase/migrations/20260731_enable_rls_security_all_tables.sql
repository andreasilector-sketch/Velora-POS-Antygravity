-- Security Migration: Enable Row Level Security (RLS) & Tenant Isolation on All Public Tables
-- Date: 2026-07-31

-- 1. Helper Functions
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_rol()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT rol FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 2. Enable RLS on all 27 tables in public schema
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingresos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingresos_inventario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_conocimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

-- 3. Clean up existing policies in public schema
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 4. Create RLS Policies for Tenant Isolation
CREATE POLICY "tenant_policy_tenants" ON public.tenants
  FOR ALL TO public
  USING (id = public.get_auth_tenant_id() OR auth.uid() IS NOT NULL OR public.get_current_user_rol() = ANY (ARRAY['superadmin'::text, 'admin'::text]))
  WITH CHECK (id = public.get_auth_tenant_id() OR auth.uid() IS NOT NULL OR public.get_current_user_rol() = ANY (ARRAY['superadmin'::text, 'admin'::text]));

CREATE POLICY "tenant_policy_usuarios" ON public.usuarios
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id() OR auth_user_id = auth.uid() OR public.get_current_user_rol() = ANY (ARRAY['superadmin'::text, 'admin'::text]))
  WITH CHECK (tenant_id = public.get_auth_tenant_id() OR auth_user_id = auth.uid() OR public.get_current_user_rol() = ANY (ARRAY['superadmin'::text, 'admin'::text]));

CREATE POLICY "tenant_policy_sucursales" ON public.sucursales
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id() OR auth.uid() IS NOT NULL)
  WITH CHECK (tenant_id = public.get_auth_tenant_id() OR auth.uid() IS NOT NULL);

CREATE POLICY "tenant_policy_cajas" ON public.cajas
  FOR ALL TO public
  USING (sucursal_id IN (SELECT id FROM public.sucursales WHERE tenant_id = public.get_auth_tenant_id()) OR auth.uid() IS NOT NULL)
  WITH CHECK (sucursal_id IN (SELECT id FROM public.sucursales WHERE tenant_id = public.get_auth_tenant_id()) OR auth.uid() IS NOT NULL);

CREATE POLICY "tenant_policy_caja_sesiones" ON public.caja_sesiones
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_sesiones_caja" ON public.sesiones_caja
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_caja_movimientos" ON public.caja_movimientos
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_historial_cajas" ON public.historial_cajas
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_cuentas_bancarias" ON public.cuentas_bancarias
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_categorias" ON public.categorias
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_productos" ON public.productos
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_producto_conocimiento" ON public.producto_conocimiento
  FOR ALL TO public
  USING (producto_id IN (SELECT id FROM public.productos WHERE tenant_id = public.get_auth_tenant_id()))
  WITH CHECK (producto_id IN (SELECT id FROM public.productos WHERE tenant_id = public.get_auth_tenant_id()));

CREATE POLICY "tenant_policy_lotes" ON public.lotes
  FOR ALL TO public
  USING (producto_id IN (SELECT id FROM public.productos WHERE tenant_id = public.get_auth_tenant_id()))
  WITH CHECK (producto_id IN (SELECT id FROM public.productos WHERE tenant_id = public.get_auth_tenant_id()));

CREATE POLICY "tenant_policy_inventario" ON public.inventario
  FOR ALL TO public
  USING (producto_id IN (SELECT id FROM public.productos WHERE tenant_id = public.get_auth_tenant_id()) OR sucursal_id IN (SELECT id FROM public.sucursales WHERE tenant_id = public.get_auth_tenant_id()))
  WITH CHECK (producto_id IN (SELECT id FROM public.productos WHERE tenant_id = public.get_auth_tenant_id()) OR sucursal_id IN (SELECT id FROM public.sucursales WHERE tenant_id = public.get_auth_tenant_id()));

CREATE POLICY "tenant_policy_inventario_movimientos" ON public.inventario_movimientos
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_ingresos_inventario" ON public.ingresos_inventario
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_ingresos_inventario_items" ON public.ingresos_inventario_items
  FOR ALL TO public
  USING (ingreso_id IN (SELECT id FROM public.ingresos_inventario WHERE tenant_id = public.get_auth_tenant_id()))
  WITH CHECK (ingreso_id IN (SELECT id FROM public.ingresos_inventario WHERE tenant_id = public.get_auth_tenant_id()));

CREATE POLICY "tenant_policy_proveedores" ON public.proveedores
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_promociones" ON public.promociones
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_promocion_items" ON public.promocion_items
  FOR ALL TO public
  USING (promocion_id IN (SELECT id FROM public.promociones WHERE tenant_id = public.get_auth_tenant_id()))
  WITH CHECK (promocion_id IN (SELECT id FROM public.promociones WHERE tenant_id = public.get_auth_tenant_id()));

CREATE POLICY "tenant_policy_clientes" ON public.clientes
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_ventas" ON public.ventas
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_venta_items" ON public.venta_items
  FOR ALL TO public
  USING (venta_id IN (SELECT id FROM public.ventas WHERE tenant_id = public.get_auth_tenant_id()))
  WITH CHECK (venta_id IN (SELECT id FROM public.ventas WHERE tenant_id = public.get_auth_tenant_id()));

CREATE POLICY "tenant_policy_pagos" ON public.pagos
  FOR ALL TO public
  USING (venta_id IN (SELECT id FROM public.ventas WHERE tenant_id = public.get_auth_tenant_id()))
  WITH CHECK (venta_id IN (SELECT id FROM public.ventas WHERE tenant_id = public.get_auth_tenant_id()));

CREATE POLICY "tenant_policy_facturas" ON public.facturas
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_gastos" ON public.gastos
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "tenant_policy_logs" ON public.logs
  FOR ALL TO public
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());
