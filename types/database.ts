export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanTipo = "basico" | "pro" | "business";
export type PlanEstado = "activo" | "inactivo" | "trial";

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          user_id: string;
          nombre: string;
          slug: string;
          descripcion: string | null;
          telefono: string;
          logo_url: string | null;
          plan: PlanTipo;
          plan_estado: PlanEstado;
          plan_vence_en: string | null;
          mercadopago_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["stores"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["stores"]["Insert"]>;
      };
      catalogos: {
        Row: {
          id: string;
          store_id: string;
          nombre: string;
          slug: string;
          descripcion: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["catalogos"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["catalogos"]["Insert"]>;
      };
      categorias: {
        Row: {
          id: string;
          catalogo_id: string;
          nombre: string;
          orden: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["categorias"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["categorias"]["Insert"]>;
      };
      productos: {
        Row: {
          id: string;
          store_id: string;
          catalogo_id: string;
          categoria_id: string | null;
          nombre: string;
          descripcion: string | null;
          precio: number;
          imagen_url: string | null;
          disponible: boolean;
          orden: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["productos"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["productos"]["Insert"]>;
      };
      pedidos: {
        Row: {
          id: string;
          store_id: string;
          catalogo_id: string;
          cliente_nombre: string | null;
          cliente_telefono: string | null;
          items: Json;
          total: number;
          nota: string | null;
          estado: "pendiente" | "confirmado" | "entregado" | "cancelado";
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["pedidos"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["pedidos"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      plan_tipo: PlanTipo;
      plan_estado: PlanEstado;
    };
  };
}

// Helpers de tipo
export type Store = Database["public"]["Tables"]["stores"]["Row"];
export type Catalogo = Database["public"]["Tables"]["catalogos"]["Row"];
export type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
export type Producto = Database["public"]["Tables"]["productos"]["Row"];
export type Pedido = Database["public"]["Tables"]["pedidos"]["Row"];
