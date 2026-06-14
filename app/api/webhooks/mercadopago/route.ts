import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

interface MPWebhookPayload {
  type: string;
  data?: { id?: string };
  action?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MPWebhookPayload = await request.json();

    if (body.type !== "subscription_preapproval") {
      return NextResponse.json({ ok: true });
    }

    const subscriptionId = body.data?.id;
    if (!subscriptionId) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

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

    const subscription = (await mpRes.json()) as {
      status: string;
      external_reference: string;
      reason: string;
      date_created: string;
      next_payment_date?: string;
    };

    const comercioId = subscription.external_reference;
    const mpStatus = subscription.status;
    const planNombre = subscription.reason?.toLowerCase().includes("pro")
      ? "pro"
      : subscription.reason?.toLowerCase().includes("business")
        ? "business"
        : "basico";

    if (mpStatus === "authorized") {
      await adminDb.collection("comercios").doc(comercioId).update({
        plan: planNombre,
        plan_expira_at: subscription.next_payment_date ?? null,
        updated_at: new Date().toISOString(),
      });

      const snap = await adminDb
        .collection("suscripciones")
        .where("mp_subscription_id", "==", subscriptionId)
        .limit(1)
        .get();

      const suscripcionData = {
        comercio_id: comercioId,
        plan: planNombre,
        estado: "activo",
        mp_subscription_id: subscriptionId,
        expira_at: subscription.next_payment_date ?? null,
      };

      if (snap.empty) {
        await adminDb.collection("suscripciones").add({
          ...suscripcionData,
          created_at: new Date().toISOString(),
        });
      } else {
        await snap.docs[0].ref.update(suscripcionData);
      }
    } else if (mpStatus === "cancelled" || mpStatus === "paused") {
      await adminDb.collection("comercios").doc(comercioId).update({
        plan: "basico",
        plan_expira_at: null,
        updated_at: new Date().toISOString(),
      });

      const snap = await adminDb
        .collection("suscripciones")
        .where("mp_subscription_id", "==", subscriptionId)
        .limit(1)
        .get();

      if (!snap.empty) {
        await snap.docs[0].ref.update({
          estado: mpStatus === "cancelled" ? "cancelado" : "vencido",
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook MercadoPago error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
