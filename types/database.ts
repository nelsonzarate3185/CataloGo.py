export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanTipo = "basico" | "pro" | "business";
export type PlanEstado = "activo" | "cancelado" | "vencido";
export type PedidoEstado = "pendiente" | "confirmado" | "entregado" | "cancelado";

export type Database = {
  public: {
    Tables: {
      comercios: {
        Row: {
          id: string;
          user_id: string;
          nombre: string;
          slug: string;
          descripcion: string | null;
          logo_url: string | null;
          whatsapp: string;
          rubro: string | null;
          plan: PlanTipo;
          plan_expira_at: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nombre: string;
          slug: string;
          descripcion?: string | null;
          logo_url?: string | null;
          whatsapp: string;
          rubro?: string | null;
          plan?: PlanTipo;
          plan_expira_at?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nombre?: string;
          slug?: string;
          descripcion?: string | null;
          logo_url?: string | null;
          whatsapp?: string;
          rubro?: string | null;
          plan?: PlanTipo;
          plan_expira_at?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      catalogos: {
        Row: {
          id: string;
          comercio_id: string;
          nombre: string;
          descripcion: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          comercio_id: string;
          nombre: string;
          descripcion?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          comercio_id?: string;
          nombre?: string;
          descripcion?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categorias: {
        Row: {
          id: string;
          catalogo_id: string;
          nombre: string;
          orden: number;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          catalogo_id: string;
          nombre: string;
          orden?: number;
          activo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          catalogo_id?: string;
          nombre?: string;
          orden?: number;
          activo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      productos: {
        Row: {
          id: string;
          comercio_id: string;
          catalogo_id: string;
          categoria_id: string | null;
          nombre: string;
          descripcion: string | null;
          precio: number;
          imagen_url: string | null;
          disponible: boolean;
          destacado: boolean;
          orden: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          comercio_id: string;
          catalogo_id: string;
          categoria_id?: string | null;
          nombre: string;
          descripcion?: string | null;
          precio?: number;
          imagen_url?: string | null;
          disponible?: boolean;
          destacado?: boolean;
          orden?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          comercio_id?: string;
          catalogo_id?: string;
          categoria_id?: string | null;
          nombre?: string;
          descripcion?: string | null;
          precio?: number;
          imagen_url?: string | null;
          disponible?: boolean;
          destacado?: boolean;
          orden?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pedidos: {
        Row: {
          id: string;
          comercio_id: string;
          catalogo_id: string;
          items: Json;
          total: number;
          nombre_cliente: string | null;
          telefono_cliente: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          comercio_id: string;
          catalogo_id: string;
          items?: Json;
          total: number;
          nombre_cliente?: string | null;
          telefono_cliente?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          comercio_id?: string;
          catalogo_id?: string;
          items?: Json;
          total?: number;
          nombre_cliente?: string | null;
          telefono_cliente?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      suscripciones: {
        Row: {
          id: string;
          comercio_id: string;
          plan: PlanTipo;
          estado: PlanEstado;
          mp_subscription_id: string | null;
          created_at: string;
          expira_at: string | null;
        };
        Insert: {
          id?: string;
          comercio_id: string;
          plan: PlanTipo;
          estado?: PlanEstado;
          mp_subscription_id?: string | null;
          created_at?: string;
          expira_at?: string | null;
        };
        Update: {
          id?: string;
          comercio_id?: string;
          plan?: PlanTipo;
          estado?: PlanEstado;
          mp_subscription_id?: string | null;
          created_at?: string;
          expira_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      es_dueno_comercio: {
        Args: { p_comercio_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      plan_tipo: "basico" | "pro" | "business";
      plan_estado: "activo" | "cancelado" | "vencido";
      pedido_estado: "pendiente" | "confirmado" | "entregado" | "cancelado";
    };
    CompositeTypes: Record<string, never>;
  };
};

// Helpers de tipo extraídos del schema
export type Comercio = Database["public"]["Tables"]["comercios"]["Row"];
export type Catalogo = Database["public"]["Tables"]["catalogos"]["Row"];
export type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
export type Producto = Database["public"]["Tables"]["productos"]["Row"];
export type Pedido = Database["public"]["Tables"]["pedidos"]["Row"];
export type Suscripcion = Database["public"]["Tables"]["suscripciones"]["Row"];

// Límites por plan (sin Infinity en const para evitar problemas de tipo)
export const PLAN_LIMITES: Record<PlanTipo, { productos: number; catalogos: number }> = {
  basico: { productos: 30, catalogos: 1 },
  pro: { productos: Number.MAX_SAFE_INTEGER, catalogos: 3 },
  business: { productos: Number.MAX_SAFE_INTEGER, catalogos: Number.MAX_SAFE_INTEGER },
};
