"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanTipo, UserStatus } from "@/types/database";

// Usa el cliente admin (service role) para el chequeo de rol también,
// así evita problemas de RLS en la tabla users.
// Lanza un error en lugar de redirect() para que el cliente lo pueda capturar.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const admin = createAdminClient();

  const { data: userRecord } = await admin
    .from("users")
    .select("role")
    .eq("email", user.email ?? "")
    .single();

  if (userRecord?.role !== "super_admin") throw new Error("Sin permisos de administrador");
  return admin;
}

// ── Usuarios ────────────────────────────────────────────────

export async function updateUserStatus(uid: string, status: UserStatus) {
  const admin = await requireAdmin();
  const { error } = await admin.from("users").update({ status }).eq("uid", uid);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}

// ── Planes ──────────────────────────────────────────────────

export type PlanFormData = {
  id: string;
  name: string;
  price: number;
  max_products: number;
  max_catalogs: number;
  max_images: number;
  max_branches: number;
};

export async function upsertPlan(form: PlanFormData) {
  const admin = await requireAdmin();
  const { id, name, price, ...limits } = form;
  const { error } = await admin.from("plans").upsert({ id, name, price, data: limits });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/planes");
}

export async function deletePlan(id: string) {
  const admin = await requireAdmin();
  const { error } = await admin.from("plans").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/planes");
}

// ── Solicitudes ─────────────────────────────────────────────

type ActionResult = { ok: true } | { ok: false; error: string };

export async function approveRequest(
  requestId: string,
  vendorId: string,
  planId: string
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const { data: updated, error: reqError } = await admin
      .from("plan_requests")
      .update({ status: "approved" })
      .eq("id", requestId)
      .select();

    if (reqError) return { ok: false, error: `Error al aprobar: ${reqError.message}` };
    if (!updated || updated.length === 0) {
      return { ok: false, error: `Solicitud no encontrada (id: ${requestId})` };
    }

    if (planId) {
      const solicitudData = (updated[0]?.data ?? {}) as Record<string, unknown>;
      const comercioId = solicitudData.comercio_id as string | undefined;

      if (comercioId) {
        const { error: comercioError } = await admin
          .from("comercios")
          .update({ plan: planId as PlanTipo })
          .eq("id", comercioId);
        if (comercioError) {
          return { ok: false, error: `Solicitud aprobada pero error actualizando plan: ${comercioError.message}` };
        }
      } else {
        await admin
          .from("comercios")
          .update({ plan: planId as PlanTipo })
          .eq("user_id", vendorId);
      }
    }

    revalidatePath("/admin/solicitudes");
    revalidatePath("/admin/comercios");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function rejectRequest(requestId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const { data: updated, error } = await admin
      .from("plan_requests")
      .update({ status: "rejected" })
      .eq("id", requestId)
      .select();
    if (error) return { ok: false, error: error.message };
    if (!updated || updated.length === 0) {
      return { ok: false, error: `Solicitud no encontrada (id: ${requestId})` };
    }
    revalidatePath("/admin/solicitudes");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

// ── Comercios ────────────────────────────────────────────────

export async function updateComercioPlan(comercioId: string, plan: PlanTipo) {
  const admin = await requireAdmin();
  const { error } = await admin.from("comercios").update({ plan }).eq("id", comercioId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/comercios");
}

export async function toggleComercioActivo(comercioId: string, activo: boolean) {
  const admin = await requireAdmin();
  const { error } = await admin.from("comercios").update({ activo }).eq("id", comercioId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/comercios");
}
