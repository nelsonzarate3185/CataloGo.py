export const dynamic = "force-dynamic";

import Link from "next/link";
import { History } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CobrosClient, { type FilaCobro } from "@/components/admin/CobrosClient";
import type { Pago, PlanTipo } from "@/types/database";

export default async function CobrosPage() {
  const admin = createAdminClient();
  const supabase = await createClient();

  const [{ data: user }, { data: comercios, error }, { data: pagos }] = await Promise.all([
    supabase.auth.getUser().then((r) => ({ data: r.data.user })),
    admin.from("comercios").select("id, nombre, plan, plan_expira_at, activo"),
    admin.from("pagos").select("comercio_id, monto, created_at"),
  ]);

  if (error) throw new Error(`Error cargando los comercios: ${error.message}`);

  // Total cobrado y fecha del último pago por comercio, en un solo recorrido.
  const resumen = new Map<string, { total: number; ultimo: string | null }>();
  for (const pago of (pagos ?? []) as Pick<Pago, "comercio_id" | "monto" | "created_at">[]) {
    const actual = resumen.get(pago.comercio_id) ?? { total: 0, ultimo: null };
    actual.total += pago.monto;
    if (!actual.ultimo || pago.created_at > actual.ultimo) actual.ultimo = pago.created_at;
    resumen.set(pago.comercio_id, actual);
  }

  const filas: FilaCobro[] = (comercios ?? [])
    // Un comercio dado de baja no se cobra.
    .filter((c) => c.activo)
    .map((c) => {
      const r = resumen.get(c.id);
      return {
        id: c.id,
        nombre: c.nombre,
        plan: c.plan as PlanTipo,
        plan_expira_at: c.plan_expira_at,
        ultimo_pago: r?.ultimo ?? null,
        total_pagado: r?.total ?? 0,
      };
    });

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Cobros</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suscripciones mensuales, vencimientos y atrasos. Los planes básicos
            son gratuitos y no se cobran.
          </p>
        </div>

        <Link
          href="/admin/cobros/historico"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <History className="size-4" aria-hidden="true" />
          Histórico
        </Link>
      </div>

      <CobrosClient
        comercios={filas}
        // La fecha viene del servidor: el reloj del navegador puede estar
        // desfasado y cambiaría quién figura como atrasado.
        hoyISO={new Date().toISOString()}
        registradoPor={user?.email ?? "admin"}
      />
    </div>
  );
}
