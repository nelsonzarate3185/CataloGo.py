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

export interface Comercio {
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
}

export interface Catalogo {
  id: string;
  comercio_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Categoria {
  id: string;
  catalogo_id: string;
  comercio_id: string;
  nombre: string;
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface Producto {
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
}

export interface Pedido {
  id: string;
  comercio_id: string;
  catalogo_id: string;
  items: Json;
  total: number;
  nombre_cliente: string | null;
  telefono_cliente: string | null;
  created_at: string;
}

export interface Suscripcion {
  id: string;
  comercio_id: string;
  plan: PlanTipo;
  estado: PlanEstado;
  mp_subscription_id: string | null;
  created_at: string;
  expira_at: string | null;
}

export const PLAN_LIMITES: Record<PlanTipo, { productos: number; catalogos: number }> = {
  basico: { productos: 30, catalogos: 1 },
  pro: { productos: Number.MAX_SAFE_INTEGER, catalogos: 3 },
  business: { productos: Number.MAX_SAFE_INTEGER, catalogos: Number.MAX_SAFE_INTEGER },
};
