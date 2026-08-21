"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatGS, cn } from "@/lib/utils";
import {
  estadoCobro,
  diasHastaVencimiento,
  proximoPeriodo,
  precioMensual,
  ETIQUETA_ESTADO,
  type EstadoCobro,
} from "@/lib/cobros";
import type { PlanTipo } from "@/types/database";

export interface FilaCobro {
  id: string;
  nombre: string;
  plan: PlanTipo;
  plan_expira_at: string | null;
  ultimo_pago: string | null;
  total_pagado: number;
}

interface Props {
  comercios: FilaCobro[];
  /** Fecha de referencia, calculada en el servidor para no depender del reloj del navegador. */
  hoyISO: string;
  registradoPor: string;
}

const CLASE_ESTADO: Record<EstadoCobro, string> = {
  gratuito: "bg-muted text-muted-foreground",
  al_dia: "bg-cat-verde-fondo text-cat-verde",
  por_vencer: "bg-cat-ambar-fondo text-cat-ambar",
  atrasado: "bg-cat-rojo-fondo text-cat-rojo",
  sin_pagos: "bg-cat-azul-fondo text-cat-azul",
};

const ORDEN_ESTADO: EstadoCobro[] = [
  "atrasado",
  "sin_pagos",
  "por_vencer",
  "al_dia",
  "gratuito",
];

export default function CobrosClient({ comercios, hoyISO, registradoPor }: Props) {
  const supabase = createClient();
  const hoy = useMemo(() => new Date(hoyISO), [hoyISO]);

  const [filas, setFilas] = useState(comercios);
  const [filtro, setFiltro] = useState<EstadoCobro | "todos">("todos");
  const [cobrando, setCobrando] = useState<FilaCobro | null>(null);

  const conEstado = useMemo(
    () =>
      filas
        .map((c) => ({ ...c, estado: estadoCobro(c.plan, c.plan_expira_at, hoy) }))
        // Lo que requiere acción primero.
        .sort((a, b) => ORDEN_ESTADO.indexOf(a.estado) - ORDEN_ESTADO.indexOf(b.estado)),
    [filas, hoy]
  );

  const conteo = useMemo(() => {
    const acc: Partial<Record<EstadoCobro, number>> = {};
    for (const c of conEstado) acc[c.estado] = (acc[c.estado] ?? 0) + 1;
    return acc;
  }, [conEstado]);

  const visibles = filtro === "todos" ? conEstado : conEstado.filter((c) => c.estado === filtro);

  const cobrablesVencidos = conEstado.filter(
    (c) => c.estado === "atrasado" || c.estado === "sin_pagos"
  );
  const montoEnRiesgo = cobrablesVencidos.reduce((s, c) => s + precioMensual(c.plan), 0);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Resumen etiqueta="Atrasados" valor={String(conteo.atrasado ?? 0)} destacar />
        <Resumen etiqueta="Por vencer" valor={String(conteo.por_vencer ?? 0)} />
        <Resumen etiqueta="Al día" valor={String(conteo.al_dia ?? 0)} />
        <Resumen etiqueta="Sin cobrar" valor={formatGS(montoEnRiesgo)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["todos", ...ORDEN_ESTADO] as const).map((valor) => (
          <button
            key={valor}
            onClick={() => setFiltro(valor)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              filtro === valor
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {valor === "todos" ? "Todos" : ETIQUETA_ESTADO[valor]}
            {valor !== "todos" && ` (${conteo[valor] ?? 0})`}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">Nada en este estado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Negocio</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Vence</th>
                <th className="px-4 py-3 font-medium">Último pago</th>
                <th className="px-4 py-3 font-medium">Total cobrado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibles.map((c) => {
                const dias = c.plan_expira_at ? diasHastaVencimiento(c.plan_expira_at, hoy) : null;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/mensajes/${c.id}`}
                        className="inline-flex items-center gap-1.5 font-medium text-link hover:underline"
                      >
                        {c.nombre}
                        <MessageSquare className="size-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{c.plan}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-2xs font-bold",
                          CLASE_ESTADO[c.estado]
                        )}
                      >
                        {ETIQUETA_ESTADO[c.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.plan_expira_at ? (
                        <>
                          {new Date(c.plan_expira_at).toLocaleDateString("es-PY")}
                          {dias !== null && (
                            <span className="ml-1 text-xs">
                              ({dias < 0 ? `${-dias} d. de atraso` : `en ${dias} d.`})
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.ultimo_pago
                        ? new Date(c.ultimo_pago).toLocaleDateString("es-PY")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatGS(c.total_pagado)}</td>
                    <td className="px-4 py-3 text-right">
                      {c.estado !== "gratuito" && (
                        <Button size="sm" onClick={() => setCobrando(c)}>
                          <Plus className="size-4" aria-hidden="true" />
                          Registrar pago
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cobrando && (
        <ModalPago
          comercio={cobrando}
          hoy={hoy}
          registradoPor={registradoPor}
          supabase={supabase}
          onClose={() => setCobrando(null)}
          onGuardado={(periodoHasta, monto) => {
            setFilas((prev) =>
              prev.map((f) =>
                f.id === cobrando.id
                  ? {
                      ...f,
                      plan_expira_at: periodoHasta,
                      ultimo_pago: new Date().toISOString(),
                      total_pagado: f.total_pagado + monto,
                    }
                  : f
              )
            );
            setCobrando(null);
          }}
        />
      )}
    </div>
  );
}

function Resumen({
  etiqueta,
  valor,
  destacar,
}: {
  etiqueta: string;
  valor: string;
  destacar?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4",
        destacar && valor !== "0" ? "border-cat-rojo/40" : "border-border"
      )}
    >
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="mt-1 font-heading text-xl font-bold">{valor}</p>
    </div>
  );
}

function ModalPago({
  comercio,
  hoy,
  registradoPor,
  supabase,
  onClose,
  onGuardado,
}: {
  comercio: FilaCobro;
  hoy: Date;
  registradoPor: string;
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
  onGuardado: (periodoHasta: string, monto: number) => void;
}) {
  const sugerido = proximoPeriodo(comercio.plan_expira_at, hoy);

  const [monto, setMonto] = useState(String(precioMensual(comercio.plan)));
  const [desde, setDesde] = useState(sugerido.desde);
  const [hasta, setHasta] = useState(sugerido.hasta);
  const [metodo, setMetodo] = useState("Transferencia");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();

    const montoNumero = Number.parseInt(monto, 10);
    if (!Number.isFinite(montoNumero) || montoNumero < 0) {
      toast.error("Ingresá un monto válido.");
      return;
    }
    if (hasta <= desde) {
      toast.error("El fin del período tiene que ser posterior al inicio.");
      return;
    }

    setGuardando(true);
    const { error } = await supabase.from("pagos").insert({
      comercio_id: comercio.id,
      monto: montoNumero,
      plan: comercio.plan,
      periodo_desde: desde,
      periodo_hasta: hasta,
      metodo: metodo.trim() || null,
      nota: nota.trim() || null,
      registrado_por: registradoPor,
    });
    setGuardando(false);

    if (error) {
      toast.error(`No pudimos registrar el pago: ${error.message}`);
      return;
    }

    toast.success(`Pago registrado. Vence el ${new Date(hasta).toLocaleDateString("es-PY")}.`);
    onGuardado(hasta, montoNumero);
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {comercio.nombre} · plan {comercio.plan}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={guardar} className="space-y-4">
          <div>
            <Label htmlFor="pago-monto">Monto (Gs.)</Label>
            <Input
              id="pago-monto"
              type="number"
              min="0"
              step="1"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Sugerido según el plan: {formatGS(precioMensual(comercio.plan))}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pago-desde">Período desde</Label>
              <Input
                id="pago-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pago-hasta">Vence el</Label>
              <Input
                id="pago-hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {comercio.plan_expira_at && new Date(comercio.plan_expira_at) > hoy
              ? "Tenía saldo a favor: el período nuevo arranca cuando termina el anterior."
              : "El período arranca hoy porque no hay vencimiento vigente."}
          </p>

          <div>
            <Label htmlFor="pago-metodo">Método</Label>
            <Input
              id="pago-metodo"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              placeholder="Transferencia, efectivo…"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="pago-nota">Nota (opcional)</Label>
            <Input
              id="pago-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nº de comprobante, banco…"
              className="mt-1"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando} className="flex-1">
              {guardando ? "Guardando…" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
