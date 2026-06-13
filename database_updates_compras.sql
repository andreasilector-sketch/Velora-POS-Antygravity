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

-- FUNCIÓN PARA ACTUALIZAR EL STOCK Y COSTO AUTOMÁTICAMENTE EN LOS ÍTEMS
CREATE OR REPLACE FUNCTION public.update_stock_precios_tras_ingreso_item()
RETURNS TRIGGER AS $$
DECLARE
  v_estado TEXT;
BEGIN
  -- Obtener el estado del ingreso padre
  SELECT estado INTO v_estado FROM public.ingresos_inventario WHERE id = COALESCE(NEW.ingreso_id, OLD.ingreso_id);
  
  -- Solo actuar si el estado del ingreso es 'completado'
  IF v_estado = 'completado' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.productos
      SET 
        stock_actual = COALESCE(stock_actual, 0) + NEW.cantidad,
        precio_compra = NEW.costo_unitario
      WHERE id = NEW.producto_id;
      
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.productos
      SET 
        stock_actual = GREATEST(0, COALESCE(stock_actual, 0) - OLD.cantidad)
      WHERE id = OLD.producto_id;
      
    ELSIF TG_OP = 'UPDATE' THEN
      UPDATE public.productos
      SET 
        stock_actual = GREATEST(0, COALESCE(stock_actual, 0) + (NEW.cantidad - OLD.cantidad)),
        precio_compra = NEW.costo_unitario
      WHERE id = NEW.producto_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER DE ÍTEMS (INSERT, UPDATE, DELETE)
DROP TRIGGER IF EXISTS trg_ingreso_item_insert ON public.ingresos_inventario_items;
DROP TRIGGER IF EXISTS trg_ingreso_item_changes ON public.ingresos_inventario_items;

CREATE TRIGGER trg_ingreso_item_changes
AFTER INSERT OR UPDATE OR DELETE ON public.ingresos_inventario_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_precios_tras_ingreso_item();

-- FUNCIÓN PARA PROCESAR EL INGRESO CUANDO SE COMPLETA O PASA A BORRADOR (CABECERA)
CREATE OR REPLACE FUNCTION public.process_ingreso_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Transición a 'completado': sumar stock de todos los ítems actuales
  IF (OLD.estado IS NULL OR OLD.estado != 'completado') AND NEW.estado = 'completado' THEN
    UPDATE public.productos p
    SET 
      stock_actual = COALESCE(p.stock_actual, 0) + sub.total_cantidad,
      precio_compra = sub.ultimo_costo
    FROM (
      SELECT 
        producto_id, 
        SUM(cantidad) as total_cantidad,
        MAX(costo_unitario) as ultimo_costo
      FROM public.ingresos_inventario_items
      WHERE ingreso_id = NEW.id
      GROUP BY producto_id
    ) sub
    WHERE p.id = sub.producto_id;
    
  -- Transición saliendo de 'completado': restar stock de todos los ítems
  ELSIF OLD.estado = 'completado' AND (NEW.estado IS NULL OR NEW.estado != 'completado') THEN
    UPDATE public.productos p
    SET 
      stock_actual = GREATEST(0, COALESCE(p.stock_actual, 0) - sub.total_cantidad)
    FROM (
      SELECT 
        producto_id, 
        SUM(cantidad) as total_cantidad
      FROM public.ingresos_inventario_items
      WHERE ingreso_id = NEW.id
      GROUP BY producto_id
    ) sub
    WHERE p.id = sub.producto_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER DE CABECERA (UPDATE)
DROP TRIGGER IF EXISTS trg_process_ingreso_complete ON public.ingresos_inventario;

CREATE TRIGGER trg_process_ingreso_complete
AFTER UPDATE ON public.ingresos_inventario
FOR EACH ROW
EXECUTE FUNCTION process_ingreso_on_complete();

-- FUNCIÓN PARA PROCESAR EL INGRESO ANTES DE ELIMINARSE (CABECERA)
CREATE OR REPLACE FUNCTION public.process_ingreso_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el ingreso que se elimina estaba completado, restamos su stock
  IF OLD.estado = 'completado' THEN
    UPDATE public.productos p
    SET 
      stock_actual = GREATEST(0, COALESCE(p.stock_actual, 0) - sub.total_cantidad)
    FROM (
      SELECT 
        producto_id, 
        SUM(cantidad) as total_cantidad
      FROM public.ingresos_inventario_items
      WHERE ingreso_id = OLD.id
      GROUP BY producto_id
    ) sub
    WHERE p.id = sub.producto_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER DE CABECERA (DELETE)
DROP TRIGGER IF EXISTS trg_process_ingreso_delete ON public.ingresos_inventario;

CREATE TRIGGER trg_process_ingreso_delete
BEFORE DELETE ON public.ingresos_inventario
FOR EACH ROW
EXECUTE FUNCTION process_ingreso_before_delete();

