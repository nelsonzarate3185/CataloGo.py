import { adminDb } from "@/lib/firebase/admin";
import type { PlanTipo } from "@/types/database";
import { PLAN_LIMITES } from "@/types/database";

/** Devuelve true si el comercio puede agregar un producto más */
export async function puedeAgregarProducto(
  comercioId: string,
  plan: PlanTipo
): Promise<boolean> {
  const limite = PLAN_LIMITES[plan].productos;
  if (limite === Number.MAX_SAFE_INTEGER) return true;

  const snap = await adminDb
    .collection("productos")
    .where("comercio_id", "==", comercioId)
    .where("disponible", "==", true)
    .count()
    .get();

  return snap.data().count < limite;
}

/** Devuelve true si el comercio puede crear otro catálogo */
export async function puedeAgregarCatalogo(
  comercioId: string,
  plan: PlanTipo
): Promise<boolean> {
  const limite = PLAN_LIMITES[plan].catalogos;
  if (limite === Number.MAX_SAFE_INTEGER) return true;

  const snap = await adminDb
    .collection("catalogos")
    .where("comercio_id", "==", comercioId)
    .where("activo", "==", true)
    .count()
    .get();

  return snap.data().count < limite;
}
