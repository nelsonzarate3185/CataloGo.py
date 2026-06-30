export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanTipo = "basico" | "pro" | "plus" | "business";
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
          direccion: string | null;
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
          direccion?: string | null;
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
          direccion?: string | null;
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
          imagenes_adicionales: Json | null;
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
          imagenes_adicionales?: Json | null;
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
          imagenes_adicionales?: Json | null;
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
      users: {
        Row: {
          id: string;
          email: string | null;
          rol: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          rol?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          rol?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sucursales: {
        Row: {
          id: string;
          comercio_id: string;
          nombre: string;
          direccion: string | null;
          telefono: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          comercio_id: string;
          nombre: string;
          direccion?: string | null;
          telefono?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          comercio_id?: string;
          nombre?: string;
          direccion?: string | null;
          telefono?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
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
      plan_tipo: "basico" | "pro" | "plus" | "business";
      plan_estado: "activo" | "cancelado" | "vencido";
      pedido_estado: "pendiente" | "confirmado" | "entregado" | "cancelado";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Comercio = Database["public"]["Tables"]["comercios"]["Row"];
export type Catalogo = Database["public"]["Tables"]["catalogos"]["Row"];
export type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
export type Producto = Database["public"]["Tables"]["productos"]["Row"];
export type Pedido = Database["public"]["Tables"]["pedidos"]["Row"];
export type Suscripcion = Database["public"]["Tables"]["suscripciones"]["Row"];
export type Sucursal = Database["public"]["Tables"]["sucursales"]["Row"];

export type PlanLimites = {
  productos: number;
  catalogos: number;
  imagenes: number;
  sucursales: number;
};

export const ILIMITADO = Number.MAX_SAFE_INTEGER;

export const PLAN_LIMITES: Record<PlanTipo, PlanLimites> = {
  basico:   { productos: 5,        catalogos: 1,        imagenes: 1, sucursales: 0 },
  pro:      { productos: 30,       catalogos: 2,        imagenes: 3, sucursales: 0 },
  plus:     { productos: 90,       catalogos: 3,        imagenes: 3, sucursales: 0 },
  business: { productos: ILIMITADO, catalogos: ILIMITADO, imagenes: 5, sucursales: 5 },
};

export const PRECIOS_PLAN: Record<PlanTipo, number> = {
  basico:   0,
  pro:      30000,
  plus:     120000,
  business: 200000,
};
