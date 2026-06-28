import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PlanTipo } from "@/types/database";
import { PLAN_LIMITES } from "@/types/database";

interface CheckProductoLimitArgs {
  supabase: SupabaseClient<Database>;
  comercioId: string;
  plan: PlanTipo;
}

/** Devuelve true si el comercio puede agregar un producto más */
export async function puedeAgregarProducto({
  supabase,
  comercioId,
  plan,
}: CheckProductoLimitArgs): Promise<boolean> {
  const limite = PLAN_LIMITES[plan].productos;
  if (limite === Infinity) return true;

  const { count } = await supabase
    .from("productos")
    .select("id", { count: "exact", head: true })
    .eq("comercio_id", comercioId)
    .eq("disponible", true);

  return (count ?? 0) < limite;
}

interface CheckCatalogoLimitArgs {
  supabase: SupabaseClient<Database>;
  comercioId: string;
  plan: PlanTipo;
}

/** Devuelve true si el comercio puede crear otro catálogo */
export async function puedeAgregarCatalogo({
  supabase,
  comercioId,
  plan,
}: CheckCatalogoLimitArgs): Promise<boolean> {
  const limite = PLAN_LIMITES[plan].catalogos;
  if (limite === Infinity) return true;

  const { count } = await supabase
    .from("catalogos")
    .select("id", { count: "exact", head: true })
    .eq("comercio_id", comercioId)
    .eq("activo", true);

  return (count ?? 0) < limite;
}
