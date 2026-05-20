import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface MPWebhookPayload {
  type: string;
  data?: { id?: string };
  action?: string;
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body: MPWebhookPayload = await request.json();

    // Solo procesar eventos de suscripciones
    if (body.type !== "subscription_preapproval") {
      return NextResponse.json({ ok: true });
    }

    const subscriptionId = body.data?.id;
    if (!subscriptionId) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    // Consultar estado en MercadoPago
    const mpRes = await fetch(
      `https://api.mercadopago.com/preapproval/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (!mpRes.ok) {
      return NextResponse.json({ error: "MP error" }, { status: 502 });
    }

    const subscription = await mpRes.json() as {
      status: string;
      external_reference: string;
      reason: string;
      date_created: string;
      next_payment_date?: string;
    };

    const comercioId = subscription.external_reference;
    const mpStatus = subscription.status; // authorized, paused, cancelled
    const planNombre = subscription.reason?.toLowerCase().includes("pro")
      ? "pro"
      : subscription.reason?.toLowerCase().includes("business")
        ? "business"
        : "basico";

    if (mpStatus === "authorized") {
      // Activar plan
      await supabaseAdmin.from("comercios").update({
        plan: planNombre,
        plan_expira_at: subscription.next_payment_date ?? null,
      }).eq("id", comercioId);

      await supabaseAdmin.from("suscripciones").upsert(
        {
          comercio_id: comercioId,
          plan: planNombre,
          estado: "activo",
          mp_subscription_id: subscriptionId,
          expira_at: subscription.next_payment_date ?? null,
        },
        { onConflict: "mp_subscription_id" }
      );
    } else if (mpStatus === "cancelled" || mpStatus === "paused") {
      // Desactivar plan → volver a básico
      await supabaseAdmin.from("comercios").update({
        plan: "basico",
        plan_expira_at: null,
      }).eq("id", comercioId);

      await supabaseAdmin.from("suscripciones")
        .update({ estado: mpStatus === "cancelled" ? "cancelado" : "vencido" })
        .eq("mp_subscription_id", subscriptionId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook MercadoPago error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
