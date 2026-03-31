-- Add fecha_vencimiento to productos table
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- Update existing records if needed (optional)
-- UPDATE public.productos SET fecha_vencimiento = NULL;
