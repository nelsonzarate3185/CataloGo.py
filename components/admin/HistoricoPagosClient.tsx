"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGS, cn } from "@/lib/utils";

export interface PagoHistorico {
  id: string;
  comercio_id: string;
  comercio_nombre: string;
  monto: number;
  plan: string;
  fecha_pago: string;
  periodo_desde: string;
  periodo_hasta: string;
  metodo: string | null;
  nota: string | null;
  registrado_por: string | null;
}

interface Props {
  pagos: PagoHistorico[];
  comercios: { id: string; nombre: string }[];
  /** Primer día del mes en curso, calculado en el servidor. */
  desdeInicial: string;
  hastaInicial: string;
}

/** Etiqueta legible de un mes 'YYYY-MM'. */
function nombreMes(clave: string): string {
  const [anio, mes] = clave.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, 1)).toLocaleDateString("es-PY", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function HistoricoPagosClient({
  pagos,
  comercios,
  desdeInicial,
  hastaInicial,
}: Props) {
  const [comercioId, setComercioId] = useState("");
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);

  const filtrados = useMemo(
    () =>
      pagos.filter((p) => {
        if (comercioId && p.comercio_id !== comercioId) return false;
        // Comparación de cadenas ISO: para 'YYYY-MM-DD' el orden alfabético y
        // el cronológico coinciden, así que no hace falta construir fechas.
        if (desde && p.fecha_pago < desde) return false;
        if (hasta && p.fecha_pago > hasta) return false;
        return true;
      }),
    [pagos, comercioId, desde, hasta]
  );

  const total = filtrados.reduce((s, p) => s + p.monto, 0);

  const porMes = useMemo(() => {
    const acc = new Map<string, { total: number; cantidad: number }>();
    for (const p of filtrados) {
      const clave = p.fecha_pago.slice(0, 7);
      const actual = acc.get(clave) ?? { total: 0, cantidad: 0 };
      actual.total += p.monto;
      actual.cantidad += 1;
      acc.set(clave, actual);
    }
    return Array.from(acc.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtrados]);

  const maxMes = Math.max(1, ...porMes.map(([, m]) => m.total));

  function exportarCsv() {
    const filas = [
      ["Fecha", "Negocio", "Plan", "Monto", "Metodo", "Periodo desde", "Periodo hasta", "Nota", "Registrado por"],
      ...filtrados.map((p) => [
        p.fecha_pago,
        p.comercio_nombre,
        p.plan,
        String(p.monto),
        p.metodo ?? "",
        p.periodo_desde,
        p.periodo_hasta,
        p.nota ?? "",
        p.registrado_por ?? "",
      ]),
    ];

    // Se entrecomilla todo y se duplican las comillas internas: un nombre con
    // coma partiría la fila en dos columnas.
    const csv = filas
      .map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // BOM para que Excel en Windows reconozca UTF-8 y no rompa los acentos.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `pagos-${desde || "inicio"}-a-${hasta || "hoy"}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Link
        href="/admin/cobros"
        className="mb-4 inline-flex items-center gap-1 text-sm text-link hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a cobros
      </Link>

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="f-comercio">Negocio</Label>
            <select
              id="f-comercio"
              value={comercioId}
              onChange={(e) => setComercioId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-sm"
            >
              <option value="">Todos</option>
              {comercios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="f-desde">Desde</Label>
            <Input
              id="f-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="f-hasta">Hasta</Label>
            <Input
              id="f-hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              setComercioId("");
              setDesde("");
              setHasta("");
            }}
            className="text-sm text-link hover:underline"
          >
            Ver todo el histórico
          </button>

          <Button variant="outline" size="sm" onClick={exportarCsv} disabled={filtrados.length === 0}>
            <Download className="size-4" aria-hidden="true" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tarjeta etiqueta="Total cobrado" valor={formatGS(total)} />
        <Tarjeta etiqueta="Pagos" valor={String(filtrados.length)} />
        <Tarjeta
          etiqueta="Promedio por pago"
          valor={filtrados.length > 0 ? formatGS(Math.round(total / filtrados.length)) : "—"}
        />
      </div>

      {porMes.length > 0 && (
        <section className="mb-6 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3">Ingresos por mes</h2>
          <ul className="space-y-2.5">
            {porMes.map(([clave, mes]) => (
              <li key={clave} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm capitalize text-muted-foreground">
                  {nombreMes(clave)}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(mes.total / maxMes) * 100}%` }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                  {mes.cantidad} {mes.cantidad === 1 ? "pago" : "pagos"}
                </span>
                <span className="w-28 shrink-0 text-right text-sm font-bold tabular-nums">
                  {formatGS(mes.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {filtrados.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No hay pagos en este rango.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Negocio</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Período cubierto</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    {new Date(p.fecha_pago).toLocaleDateString("es-PY", { timeZone: "UTC" })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/mensajes/${p.comercio_id}`}
                      className="font-medium text-link hover:underline"
                    >
                      {p.comercio_nombre}
                    </Link>
                    {p.nota && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.nota}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{p.plan}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.periodo_desde).toLocaleDateString("es-PY", { timeZone: "UTC" })}
                    {" — "}
                    {new Date(p.periodo_hasta).toLocaleDateString("es-PY", { timeZone: "UTC" })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.metodo ?? "—"}</td>
                  <td className={cn("px-4 py-3 text-right font-bold tabular-nums")}>
                    {formatGS(p.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tarjeta({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="mt-1 font-heading text-xl font-bold">{valor}</p>
    </div>
  );
}
