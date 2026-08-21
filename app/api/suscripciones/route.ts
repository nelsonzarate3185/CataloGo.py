import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlanTipo } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { plan }: { plan: PlanTipo } = await request.json();

  if (plan === "basico") {
    return NextResponse.json({ error: "El plan básico es gratuito" }, { status: 400 });
  }

  const { data: comercio } = await supabase
    .from("comercios")
    .select("id, plan")
    .eq("user_id", user.id)
    .single();

  if (!comercio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  if (comercio.plan === plan) {
    return NextResponse.json({ error: "Ya tenés este plan activo" }, { status: 400 });
  }

  // Verificar si ya hay una solicitud pendiente para este negocio.
  // Se pide un array y no maybeSingle: con más de una fila pendiente,
  // maybeSingle devuelve error y el código anterior lo descartaba, seguía de
  // largo e intentaba insertar igual.
  const { data: pendientes, error: errorPendientes } = await supabase
    .from("plan_requests")
    .select("id")
    .eq("vendor_id", user.id)
    .eq("status", "pending")
    .limit(1);

  if (errorPendientes) {
    return NextResponse.json(
      { error: `No pudimos verificar tus solicitudes: ${errorPendientes.message}` },
      { status: 500 }
    );
  }

  if (pendientes && pendientes.length > 0) {
    return NextResponse.json(
      { error: "Ya tenés una solicitud de cambio de plan pendiente. El administrador la procesará pronto." },
      { status: 409 }
    );
  }

  // Crear la solicitud de plan
  const requestId = crypto.randomUUID();
  const { error } = await supabase
    .from("plan_requests")
    .insert({
      id: requestId,
      vendor_id: user.id,
      status: "pending",
      data: {
        plan_id: plan,
        current_plan: comercio.plan,
        comercio_id: comercio.id,
      },
    });

  if (error) {
    // Se devuelve el mensaje de la base y no uno genérico. El anterior
    // ocultaba la causa y obligaba a diagnosticar a ciegas; esta ruta la usa
    // el dueño autenticado desde su panel, no un visitante.
    return NextResponse.json(
      {
        error: `No pudimos crear la solicitud: ${error.message}`,
        codigo: error.code,
        detalle: error.details ?? null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, plan });
}
