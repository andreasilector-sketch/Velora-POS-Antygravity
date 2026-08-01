export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      caja_movimientos: {
        Row: {
          caja_id: string
          descripcion: string | null
          fecha: string
          id: string
          metodo_pago: string | null
          monto: number
          sesion_id: string | null
          tenant_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          caja_id: string
          descripcion?: string | null
          fecha?: string
          id?: string
          metodo_pago?: string | null
          monto: number
          sesion_id?: string | null
          tenant_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          caja_id?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          metodo_pago?: string | null
          monto?: number
          sesion_id?: string | null
          tenant_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caja_movimientos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_movimientos_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "caja_sesiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_movimientos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_movimientos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      caja_sesiones: {
        Row: {
          caja_id: string
          created_at: string | null
          denominaciones_apertura: Json | null
          denominaciones_cierre: Json | null
          diferencia: number | null
          estado: string | null
          fecha_apertura: string | null
          fecha_cierre: string | null
          id: string
          monto_apertura: number
          monto_cierre_esperado: number | null
          monto_cierre_real: number | null
          notas: string | null
          sucursal_id: string
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          caja_id: string
          created_at?: string | null
          denominaciones_apertura?: Json | null
          denominaciones_cierre?: Json | null
          diferencia?: number | null
          estado?: string | null
          fecha_apertura?: string | null
          fecha_cierre?: string | null
          id?: string
          monto_apertura: number
          monto_cierre_esperado?: number | null
          monto_cierre_real?: number | null
          notas?: string | null
          sucursal_id: string
          tenant_id: string
          usuario_id: string
        }
        Update: {
          caja_id?: string
          created_at?: string | null
          denominaciones_apertura?: Json | null
          denominaciones_cierre?: Json | null
          diferencia?: number | null
          estado?: string | null
          fecha_apertura?: string | null
          fecha_cierre?: string | null
          id?: string
          monto_apertura?: number
          monto_cierre_esperado?: number | null
          monto_cierre_real?: number | null
          notas?: string | null
          sucursal_id?: string
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caja_sesiones_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_sesiones_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_sesiones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_sesiones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cajas: {
        Row: {
          activa: boolean | null
          id: string
          nombre: string
          sucursal_id: string
        }
        Insert: {
          activa?: boolean | null
          id?: string
          nombre: string
          sucursal_id: string
        }
        Update: {
          activa?: boolean | null
          id?: string
          nombre?: string
          sucursal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cajas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          credito_disponible: number | null
          direccion: string | null
          documento: string | null
          email: string | null
          fecha_registro: string
          id: string
          nombre: string
          notas: string | null
          puntos: number | null
          saldo_pendiente: number | null
          telefono: string | null
          tenant_id: string
          tipo_cliente: string | null
        }
        Insert: {
          credito_disponible?: number | null
          direccion?: string | null
          documento?: string | null
          email?: string | null
          fecha_registro?: string
          id?: string
          nombre: string
          notas?: string | null
          puntos?: number | null
          saldo_pendiente?: number | null
          telefono?: string | null
          tenant_id: string
          tipo_cliente?: string | null
        }
        Update: {
          credito_disponible?: number | null
          direccion?: string | null
          documento?: string | null
          email?: string | null
          fecha_registro?: string
          id?: string
          nombre?: string
          notas?: string | null
          puntos?: number | null
          saldo_pendiente?: number | null
          telefono?: string | null
          tenant_id?: string
          tipo_cliente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_bancarias: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id: string
          nombre_banco: string
          numero_cuenta: string
          tenant_id: string
          titular: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre_banco: string
          numero_cuenta: string
          tenant_id: string
          titular?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre_banco?: string
          numero_cuenta?: string
          tenant_id?: string
          titular?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_bancarias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          cufe: string | null
          estado_dian: string | null
          fecha: string
          id: string
          numero_factura: string
          pdf_url: string | null
          tenant_id: string
          venta_id: string
          xml_url: string | null
        }
        Insert: {
          cufe?: string | null
          estado_dian?: string | null
          fecha?: string
          id?: string
          numero_factura: string
          pdf_url?: string | null
          tenant_id: string
          venta_id: string
          xml_url?: string | null
        }
        Update: {
          cufe?: string | null
          estado_dian?: string | null
          fecha?: string
          id?: string
          numero_factura?: string
          pdf_url?: string | null
          tenant_id?: string
          venta_id?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_cajas: {
        Row: {
          diferencia: number | null
          fecha_cierre: string | null
          id: string
          monto_esperado: number | null
          monto_final: number | null
          monto_inicial: number | null
          reporte_detallado: Json | null
          sesion_id: string
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          diferencia?: number | null
          fecha_cierre?: string | null
          id?: string
          monto_esperado?: number | null
          monto_final?: number | null
          monto_inicial?: number | null
          reporte_detallado?: Json | null
          sesion_id: string
          tenant_id: string
          usuario_id: string
        }
        Update: {
          diferencia?: number | null
          fecha_cierre?: string | null
          id?: string
          monto_esperado?: number | null
          monto_final?: number | null
          monto_inicial?: number | null
          reporte_detallado?: Json | null
          sesion_id?: string
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_cajas_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones_caja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_cajas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_cajas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario: {
        Row: {
          id: string
          producto_id: string
          stock_actual: number
          stock_disponible: number
          stock_reservado: number
          sucursal_id: string
          ultima_actualizacion: string
        }
        Insert: {
          id?: string
          producto_id: string
          stock_actual?: number
          stock_disponible?: number
          stock_reservado?: number
          sucursal_id: string
          ultima_actualizacion?: string
        }
        Update: {
          id?: string
          producto_id?: string
          stock_actual?: number
          stock_disponible?: number
          stock_reservado?: number
          sucursal_id?: string
          ultima_actualizacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_movimientos: {
        Row: {
          cantidad: number
          fecha: string
          id: string
          producto_id: string
          referencia: string | null
          sucursal_id: string
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          fecha?: string
          id?: string
          producto_id: string
          referencia?: string | null
          sucursal_id: string
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          fecha?: string
          id?: string
          producto_id?: string
          referencia?: string | null
          sucursal_id?: string
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          accion: string
          fecha: string
          id: string
          ip: string | null
          registro_id: string | null
          tabla: string
          tenant_id: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          fecha?: string
          id?: string
          ip?: string | null
          registro_id?: string | null
          tabla: string
          tenant_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          fecha?: string
          id?: string
          ip?: string | null
          registro_id?: string | null
          tabla?: string
          tenant_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          fecha_ingreso: string
          fecha_vencimiento: string | null
          id: string
          numero_lote: string
          producto_id: string
          stock: number
        }
        Insert: {
          fecha_ingreso?: string
          fecha_vencimiento?: string | null
          id?: string
          numero_lote: string
          producto_id: string
          stock?: number
        }
        Update: {
          fecha_ingreso?: string
          fecha_vencimiento?: string | null
          id?: string
          numero_lote?: string
          producto_id?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          cuenta_bancaria_id: string | null
          fecha: string
          id: string
          metodo_pago: string
          monto: number
          referencia: string | null
          venta_id: string
        }
        Insert: {
          cuenta_bancaria_id?: string | null
          fecha?: string
          id?: string
          metodo_pago: string
          monto: number
          referencia?: string | null
          venta_id: string
        }
        Update: {
          cuenta_bancaria_id?: string | null
          fecha?: string
          id?: string
          metodo_pago?: string
          monto?: number
          referencia?: string | null
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cuenta_bancaria_id_fkey"
            columns: ["cuenta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "cuentas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_conocimiento: {
        Row: {
          beneficios: string | null
          contraindicaciones: string | null
          id: string
          ingredientes: string | null
          modo_uso: string | null
          producto_id: string
          sintomas: string | null
        }
        Insert: {
          beneficios?: string | null
          contraindicaciones?: string | null
          id?: string
          ingredientes?: string | null
          modo_uso?: string | null
          producto_id: string
          sintomas?: string | null
        }
        Update: {
          beneficios?: string | null
          contraindicaciones?: string | null
          id?: string
          ingredientes?: string | null
          modo_uso?: string | null
          producto_id?: string
          sintomas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producto_conocimiento_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean | null
          beneficios: string | null
          categoria_id: string | null
          codigo_barras: string | null
          control_lotes: boolean | null
          descuento: number | null
          es_fraccionado: boolean | null
          factor_conversion: number | null
          fecha_creacion: string
          id: string
          ingredientes: string | null
          margen_ganancia: number | null
          nombre: string
          precio_compra: number
          precio_minimo: number
          precio_venta: number
          producto_padre_id: string | null
          sintomas_alivia: string | null
          sku: string | null
          stock_actual: number
          stock_minimo: number
          tenant_id: string
          tiene_vencimiento: boolean | null
          fecha_vencimiento: string | null
          imagen_url: string | null
          tipo_precio: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          beneficios?: string | null
          categoria_id?: string | null
          codigo_barras?: string | null
          control_lotes?: boolean | null
          descuento?: number | null
          es_fraccionado?: boolean | null
          factor_conversion?: number | null
          fecha_creacion?: string
          id?: string
          ingredientes?: string | null
          margen_ganancia?: number | null
          nombre: string
          precio_compra?: number
          precio_minimo?: number
          precio_venta?: number
          producto_padre_id?: string | null
          sintomas_alivia?: string | null
          sku?: string | null
          stock_actual?: number
          stock_minimo?: number
          tenant_id: string
          tiene_vencimiento?: boolean | null
          fecha_vencimiento?: string | null
          imagen_url?: string | null
          tipo_precio?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          beneficios?: string | null
          categoria_id?: string | null
          codigo_barras?: string | null
          control_lotes?: boolean | null
          descuento?: number | null
          es_fraccionado?: boolean | null
          factor_conversion?: number | null
          fecha_creacion?: string
          id?: string
          ingredientes?: string | null
          margen_ganancia?: number | null
          nombre?: string
          precio_compra?: number
          precio_minimo?: number
          precio_venta?: number
          producto_padre_id?: string | null
          sintomas_alivia?: string | null
          sku?: string | null
          stock_actual?: number
          stock_minimo?: number
          tenant_id?: string
          tiene_vencimiento?: boolean | null
          fecha_vencimiento?: string | null
          imagen_url?: string | null
          tipo_precio?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promocion_items: {
        Row: {
          categoria_id: string | null
          created_at: string | null
          id: string
          producto_id: string | null
          promocion_id: string | null
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string | null
          id?: string
          producto_id?: string | null
          promocion_id?: string | null
        }
        Update: {
          categoria_id?: string | null
          created_at?: string | null
          id?: string
          producto_id?: string | null
          promocion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promocion_items_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocion_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocion_items_promocion_id_fkey"
            columns: ["promocion_id"]
            isOneToOne: false
            referencedRelation: "promociones"
            referencedColumns: ["id"]
          },
        ]
      }
      promociones: {
        Row: {
          activo: boolean | null
          aplica_a_todo: boolean | null
          cantidad_bonificada: number | null
          cantidad_minima: number | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          nombre: string
          tenant_id: string
          tipo: string
          valor: number
        }
        Insert: {
          activo?: boolean | null
          aplica_a_todo?: boolean | null
          cantidad_bonificada?: number | null
          cantidad_minima?: number | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          nombre: string
          tenant_id: string
          tipo: string
          valor?: number
        }
        Update: {
          activo?: boolean | null
          aplica_a_todo?: boolean | null
          cantidad_bonificada?: number | null
          cantidad_minima?: number | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          nombre?: string
          tenant_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "promociones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          contacto: string | null
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          tenant_id: string
        }
        Insert: {
          contacto?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          tenant_id: string
        }
        Update: {
          contacto?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones_caja: {
        Row: {
          caja_id: string
          desglose_efectivo: Json | null
          diferencia: number | null
          estado: string | null
          hora_apertura: string
          hora_cierre: string | null
          id: string
          monto_esperado: number | null
          monto_final: number | null
          monto_inicial: number
          observaciones: string | null
          usuario_id: string
        }
        Insert: {
          caja_id: string
          desglose_efectivo?: Json | null
          diferencia?: number | null
          estado?: string | null
          hora_apertura?: string
          hora_cierre?: string | null
          id?: string
          monto_esperado?: number | null
          monto_final?: number | null
          monto_inicial: number
          observaciones?: string | null
          usuario_id: string
        }
        Update: {
          caja_id?: string
          desglose_efectivo?: Json | null
          diferencia?: number | null
          estado?: string | null
          hora_apertura?: string
          hora_cierre?: string | null
          id?: string
          monto_esperado?: number | null
          monto_final?: number | null
          monto_inicial?: number
          observaciones?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_caja_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_caja_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          ciudad: string | null
          created_at: string
          direccion: string | null
          estado: string | null
          id: string
          nombre: string
          telefono: string | null
          tenant_id: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          estado?: string | null
          id?: string
          nombre: string
          telefono?: string | null
          tenant_id: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          estado?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sucursales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          configuracion_pos: Json | null
          correo_contacto: string | null
          departamento: string | null
          direccion_fiscal: string | null
          email: string | null
          estado: string | null
          fecha_creacion: string
          id: string
          logo_url: string | null
          municipio: string | null
          nit: string | null
          nombre_empresa: string
          pais: string | null
          plan: string | null
          telefono: string | null
        }
        Insert: {
          configuracion_pos?: Json | null
          correo_contacto?: string | null
          departamento?: string | null
          direccion_fiscal?: string | null
          email?: string | null
          estado?: string | null
          fecha_creacion?: string
          id?: string
          logo_url?: string | null
          municipio?: string | null
          nit?: string | null
          nombre_empresa: string
          pais?: string | null
          plan?: string | null
          telefono?: string | null
        }
        Update: {
          configuracion_pos?: Json | null
          correo_contacto?: string | null
          departamento?: string | null
          direccion_fiscal?: string | null
          email?: string | null
          estado?: string | null
          fecha_creacion?: string
          id?: string
          logo_url?: string | null
          municipio?: string | null
          nit?: string | null
          nombre_empresa?: string
          pais?: string | null
          plan?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          activo: boolean | null
          auth_user_id: string | null
          email: string
          fecha_creacion: string
          id: string
          nombre: string
          rol: string
          sucursal_id: string | null
          tenant_id: string
        }
        Insert: {
          activo?: boolean | null
          auth_user_id?: string | null
          email: string
          fecha_creacion?: string
          id?: string
          nombre: string
          rol: string
          sucursal_id?: string | null
          tenant_id: string
        }
        Update: {
          activo?: boolean | null
          auth_user_id?: string | null
          email?: string
          fecha_creacion?: string
          id?: string
          nombre?: string
          rol?: string
          sucursal_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      venta_items: {
        Row: {
          cantidad: number
          descuento: number
          id: string
          precio_unitario: number
          producto_id: string
          subtotal: number
          venta_id: string
        }
        Insert: {
          cantidad?: number
          descuento?: number
          id?: string
          precio_unitario?: number
          producto_id: string
          subtotal?: number
          venta_id: string
        }
        Update: {
          cantidad?: number
          descuento?: number
          id?: string
          precio_unitario?: number
          producto_id?: string
          subtotal?: number
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          caja_id: string | null
          cliente_id: string | null
          descuento: number
          estado: string | null
          fecha: string
          fecha_vencimiento_pago: string | null
          id: string
          impuestos: number
          metodo_pago: string | null
          monto_pagado: number | null
          subtotal: number
          sucursal_id: string | null
          tenant_id: string
          total: number
          usuario_id: string | null
        }
        Insert: {
          caja_id?: string | null
          cliente_id?: string | null
          descuento?: number
          estado?: string | null
          fecha?: string
          fecha_vencimiento_pago?: string | null
          id?: string
          impuestos?: number
          metodo_pago?: string | null
          monto_pagado?: number | null
          subtotal?: number
          sucursal_id?: string | null
          tenant_id: string
          total?: number
          usuario_id?: string | null
        }
        Update: {
          caja_id?: string | null
          cliente_id?: string | null
          descuento?: number
          estado?: string | null
          fecha?: string
          fecha_vencimiento_pago?: string | null
          id?: string
          impuestos?: number
          metodo_pago?: string | null
          monto_pagado?: number | null
          subtotal?: number
          sucursal_id?: string | null
          tenant_id?: string
          total?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_tenant_id: { Args: never; Returns: string }
      get_current_user_rol: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
