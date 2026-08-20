import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Alta de reseñas anónimas.
 *
 * Pasa por API route y no por INSERT directo del cliente por dos razones: la
 * tabla no tiene policy de INSERT (una policy pública sería una puerta abierta
 * a la inundación), y el rate limit necesita la IP, que sólo existe del lado
 * del servidor.
 *
 * Límites de lo que esto puede lograr: sin cuentas de comprador no hay
 * verificación de identidad posible. Cualquiera puede firmar con el nombre que
 * quiera y una IP nueva permite una reseña nueva. El objetivo es encarecer el
 * abuso, no impedirlo.
 */

const schema = z.object({
  producto_id: z.string().uuid("Producto inválido"),
  nombre: z.string().trim().min(2, "Poné tu nombre").max(60, "Nombre demasiado largo"),
  calificacion: z.number().int().min(1).max(5),
  comentario: z.string().trim().max(1000, "Comentario demasiado largo").optional(),
  // Campo trampa: es invisible para una persona, así que si viene con algo
  // es un bot rellenando el formulario entero.
  sitio_web: z.string().max(0).optional(),
});

/** Máximo de reseñas por IP en un mismo comercio dentro de 24 horas. */
const MAX_POR_COMERCIO_DIA = 5;

function hashIp(ip: string): string {
  // La sal sale de una variable de servidor que ya es obligatoria. No se guarda
  // la IP en crudo en ningún momento: el hash sólo sirve para contar, nunca
  // para identificar a nadie.
  const sal = process.env.RESENAS_IP_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${ip}|${sal}`).digest("hex");
}

function ipDe(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const { producto_id, nombre, calificacion, comentario, sitio_web } = parsed.data;

  // El bot se lleva un 201 sin que se escriba nada: no le damos señal de que
  // fue detectado.
  if (sitio_web) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const admin = createAdminClient();

  // El producto define a qué comercio pertenece la reseña; no se acepta un
  // comercio_id del cliente, que podría apuntar a otro tenant.
  const { data: producto, error: errorProducto } = await admin
    .from("productos")
    .select("id, comercio_id, disponible")
    .eq("id", producto_id)
    .single();

  if (errorProducto || !producto || !producto.disponible) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const { data: comercio } = await admin
    .from("comercios")
    .select("resenas_moderadas, activo")
    .eq("id", producto.comercio_id)
    .single();

  if (!comercio?.activo) {
    return NextResponse.json({ error: "Comercio no disponible" }, { status: 404 });
  }

  const ip = ipDe(request);
  const ip_hash = ip ? hashIp(ip) : null;

  if (ip_hash) {
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("resenas")
      .select("id", { count: "exact", head: true })
      .eq("comercio_id", producto.comercio_id)
      .eq("ip_hash", ip_hash)
      .gte("created_at", desde);

    if ((count ?? 0) >= MAX_POR_COMERCIO_DIA) {
      return NextResponse.json(
        { error: "Ya dejaste varias reseñas hoy. Probá mañana." },
        { status: 429 }
      );
    }
  }

  const { error } = await admin.from("resenas").insert({
    comercio_id: producto.comercio_id,
    producto_id: producto.id,
    nombre,
    calificacion,
    comentario: comentario || null,
    aprobada: !comercio.resenas_moderadas,
    ip_hash,
  });

  if (error) {
    // El índice único (producto_id, ip_hash) es lo que impide reseñar dos veces
    // el mismo producto desde la misma conexión.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya dejaste una reseña en este producto." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "No pudimos guardar tu reseña." }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, moderada: comercio.resenas_moderadas },
    { status: 201 }
  );
}
