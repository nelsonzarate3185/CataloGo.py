"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanTipo, UserStatus } from "@/types/database";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRecord } = await supabase
    .from("users")
    .select("role")
    .eq("email", user.email ?? "")
    .single();

  if (userRecord?.role !== "super_admin") redirect("/dashboard");
  return createAdminClient();
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
  const { error } = await admin.from("plans").upsert({
    id,
    name,
    price,
    data: limits,
  });
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

export async function approveRequest(requestId: string, vendorId: string, planId: string) {
  const admin = await requireAdmin();

  const { error: reqError } = await admin
    .from("plan_requests")
    .update({ status: "approved" })
    .eq("id", requestId);
  if (reqError) throw new Error(reqError.message);

  // Intentar actualizar el plan en comercios (vendor_id puede coincidir con user_id)
  if (planId) {
    await admin
      .from("comercios")
      .update({ plan: planId as PlanTipo })
      .eq("user_id", vendorId);
  }

  revalidatePath("/admin/solicitudes");
  revalidatePath("/admin/comercios");
}

export async function rejectRequest(requestId: string) {
  const admin = await requireAdmin();
  const { error } = await admin
    .from("plan_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/solicitudes");
}

// ── Comercios ────────────────────────────────────────────────

export async function updateComercioPlan(comercioId: string, plan: PlanTipo) {
  const admin = await requireAdmin();
  const { error } = await admin
    .from("comercios")
    .update({ plan })
    .eq("id", comercioId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/comercios");
}

export async function toggleComercioActivo(comercioId: string, activo: boolean) {
  const admin = await requireAdmin();
  const { error } = await admin
    .from("comercios")
    .update({ activo })
    .eq("id", comercioId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/comercios");
}
