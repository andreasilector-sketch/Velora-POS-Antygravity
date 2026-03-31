-- TABLA DE INGRESOS (COMPRAS/ENTRADAS DE INVENTARIO)
CREATE TABLE IF NOT EXISTS public.ingresos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  numero_factura TEXT,
  proveedor TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  observaciones TEXT,
  estado TEXT DEFAULT 'completado',
  total NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA DE ITEMS POR INGRESO
CREATE TABLE IF NOT EXISTS public.ingresos_inventario_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingreso_id UUID NOT NULL REFERENCES public.ingresos_inventario(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  cantidad NUMERIC NOT NULL DEFAULT 1,
  costo_unitario NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0
);

-- POLICIES DE SEGURIDAD
ALTER TABLE public.ingresos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingresos_inventario_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios ingresos" 
  ON public.ingresos_inventario FOR ALL 
  USING (tenant_id IN (SELECT id FROM public.perfiles WHERE id = tenant_id));

CREATE POLICY "Usuarios pueden ver items de sus ingresos" 
  ON public.ingresos_inventario_items FOR ALL 
  USING (true);

-- FUNCIÓN PARA ACTUALIZAR EL STOCK Y COSTO AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION update_stock_precios_tras_ingreso()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizamos el stock_actual sumando la cantidad del ingreso
  -- Y actualizamos el precio_compra al último costo unitario pagado
  UPDATE public.productos
  SET 
    stock_actual = COALESCE(stock_actual, 0) + NEW.cantidad,
    precio_compra = NEW.costo_unitario
  WHERE id = NEW.producto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER DE INSERCIÓN
DROP TRIGGER IF EXISTS trg_ingreso_item_insert ON public.ingresos_inventario_items;
CREATE TRIGGER trg_ingreso_item_insert
AFTER INSERT ON public.ingresos_inventario_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_precios_tras_ingreso();
