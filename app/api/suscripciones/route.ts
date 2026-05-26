import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, fromDoc } from "@/lib/firebase/admin";
import type { Comercio, PlanTipo } from "@/types/database";

const PRECIOS_MP: Record<Exclude<PlanTipo, "basico">, { monto: number; nombre: string }> = {
  pro: { monto: 120000, nombre: "CataloGo Pro" },
  business: { monto: 280000, nombre: "CataloGo Business" },
};

export async function POST(request: NextRequest) {
  const session = request.cookies.get("__session")?.value;
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { plan }: { plan: PlanTipo } = await request.json();

  if (plan === "basico") {
    return NextResponse.json({ error: "El plan básico es gratuito" }, { status: 400 });
  }

  const comercioSnap = await adminDb
    .collection("comercios")
    .where("user_id", "==", uid)
    .limit(1)
    .get();

  if (comercioSnap.empty) {
    return NextResponse.json({ error: "Comercio no encontrado" }, { status: 404 });
  }

  const comercio = fromDoc<Comercio>(comercioSnap.docs[0])!;
  const precioInfo = PRECIOS_MP[plan as Exclude<PlanTipo, "basico">];

  const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracion`,
      reason: precioInfo.nombre,
      external_reference: comercio.id,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: precioInfo.monto,
        currency_id: "PYG",
      },
      status: "pending",
    }),
  });

  if (!mpRes.ok) {
    const err = await mpRes.text();
    console.error("MercadoPago error:", err);
    return NextResponse.json({ error: "Error al crear suscripción" }, { status: 502 });
  }

  const data = await mpRes.json() as { init_point: string };
  return NextResponse.json({ url: data.init_point });
}
