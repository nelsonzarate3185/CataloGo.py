import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PlanTipo } from "@/types/database";
import { PLAN_LIMITES, ILIMITADO } from "@/types/database";

interface BaseArgs {
  supabase: SupabaseClient<Database>;
  comercioId: string;
  plan: PlanTipo;
}

export async function puedeAgregarProducto({ supabase, comercioId, plan }: BaseArgs): Promise<boolean> {
  const limite = PLAN_LIMITES[plan].productos;
  if (limite >= ILIMITADO) return true;

  const { count } = await supabase
    .from("productos")
    .select("id", { count: "exact", head: true })
    .eq("comercio_id", comercioId)
    .eq("disponible", true);

  return (count ?? 0) < limite;
}

export async function puedeAgregarCatalogo({ supabase, comercioId, plan }: BaseArgs): Promise<boolean> {
  const limite = PLAN_LIMITES[plan].catalogos;
  if (limite >= ILIMITADO) return true;

  const { count } = await supabase
    .from("catalogos")
    .select("id", { count: "exact", head: true })
    .eq("comercio_id", comercioId)
    .eq("activo", true);

  return (count ?? 0) < limite;
}

export async function puedeAgregarSucursal({ supabase, comercioId, plan }: BaseArgs): Promise<boolean> {
  const limite = PLAN_LIMITES[plan].sucursales;
  if (limite >= ILIMITADO) return true;
  if (limite === 0) return false;

  const { count } = await supabase
    .from("sucursales")
    .select("id", { count: "exact", head: true })
    .eq("comercio_id", comercioId)
    .eq("activo", true);

  return (count ?? 0) < limite;
}
