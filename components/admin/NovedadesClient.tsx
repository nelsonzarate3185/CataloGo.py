"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Store, UserPlus, Check, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EventoAdmin } from "@/types/database";

interface Props {
  eventos: EventoAdmin[];
}

/** Lee un campo de texto del jsonb sin romperse si viene otra cosa. */
function texto(datos: unknown, clave: string): string | null {
  if (typeof datos !== "object" || datos === null) return null;
  const valor = (datos as Record<string, unknown>)[clave];
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}

export default function NovedadesClient({ eventos: iniciales }: Props) {
  const supabase = createClient();
  const [eventos, setEventos] = useState(iniciales);
  const [guardando, setGuardando] = useState(false);

  const sinLeer = eventos.filter((e) => e.leido_at === null);

  async function marcarLeidos(ids: string[]) {
    if (ids.length === 0) return;
    setGuardando(true);

    const ahora = new Date().toISOString();
    const { error } = await supabase
      .from("eventos_admin")
      .update({ leido_at: ahora })
      .in("id", ids);

    setGuardando(false);

    if (error) {
      toast.error(`No pudimos marcar como leído: ${error.message}`);
      return;
    }

    setEventos((prev) =>
      prev.map((e) => (ids.includes(e.id) ? { ...e, leido_at: ahora } : e))
    );
  }

  if (eventos.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Todavía no hay novedades. Acá van a aparecer las cuentas y tiendas nuevas.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sinLeer.length > 0
            ? `${sinLeer.length} sin revisar`
            : "Todo revisado"}
        </p>
        {sinLeer.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={guardando}
            onClick={() => marcarLeidos(sinLeer.map((e) => e.id))}
          >
            <Check className="size-4" aria-hidden="true" />
            Marcar todo como leído
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {eventos.map((evento) => {
          const esTienda = evento.tipo === "tienda_creada";
          const Icono = esTienda ? Store : UserPlus;
          const noLeido = evento.leido_at === null;
          const slug = texto(evento.datos, "slug");

          return (
            <li
              key={evento.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-card p-4",
                noLeido ? "border-primary/40" : "border-border"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  esTienda
                    ? "bg-cat-verde-fondo text-cat-verde"
                    : "bg-cat-azul-fondo text-cat-azul"
                )}
              >
                <Icono className="size-4" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-base font-medium">
                  {esTienda ? "Tienda creada" : "Cuenta nueva"}
                  {noLeido && (
                    <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-2xs font-bold text-primary-foreground">
                      nuevo
                    </span>
                  )}
                </p>

                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {esTienda
                    ? [texto(evento.datos, "nombre"), texto(evento.datos, "plan")]
                        .filter(Boolean)
                        .join(" · ")
                    : [
                        texto(evento.datos, "email"),
                        texto(evento.datos, "proveedor"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(evento.created_at).toLocaleString("es-PY")}
                </p>

                {esTienda && slug && (
                  <Link
                    href={`/c/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-link hover:underline"
                  >
                    <ExternalLink className="size-3" aria-hidden="true" />
                    Ver la tienda
                  </Link>
                )}
              </div>

              {noLeido && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={guardando}
                  onClick={() => marcarLeidos([evento.id])}
                >
                  <Check className="size-4" aria-hidden="true" />
                  <span className="sr-only">Marcar como leído</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
