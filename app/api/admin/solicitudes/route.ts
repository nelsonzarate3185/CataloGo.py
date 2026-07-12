import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanTipo } from "@/types/database";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: userRecord } = await admin
    .from("users")
    .select("role")
    .eq("email", user.email ?? "")
    .single();

  if (userRecord?.role !== "super_admin") return null;
  return admin;
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await request.json() as {
    requestId: string;
    action: "approve" | "reject";
    planId?: string;
    comercioId?: string;
    vendorId?: string;
  };

  const { requestId, action, planId, comercioId, vendorId } = body;

  if (!requestId || !action) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  const { error: updateError } = await admin
    .from("plan_requests")
    .update({ status: newStatus })
    .eq("id", requestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Si aprueba, actualizar el plan del comercio
  if (action === "approve" && planId) {
    if (comercioId) {
      const { error: planError } = await admin
        .from("comercios")
        .update({ plan: planId as PlanTipo })
        .eq("id", comercioId);
      if (planError) {
        return NextResponse.json(
          { error: `Solicitud aprobada pero error actualizando plan: ${planError.message}` },
          { status: 500 }
        );
      }
    } else if (vendorId) {
      await admin
        .from("comercios")
        .update({ plan: planId as PlanTipo })
        .eq("user_id", vendorId);
    }
  }

  return NextResponse.json({ success: true, status: newStatus });
}
