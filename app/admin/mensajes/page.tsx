export const dynamic = "force-dynamic";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Mensaje } from "@/types/database";

export default async function BandejaAdminPage() {
  // Con el cliente admin: hace falta cruzar todos los comercios, y el layout ya
  // verificó que quien mira es superadmin.
  const admin = createAdminClient();

  const [{ data: mensajes, error }, { data: comercios }] = await Promise.all([
    admin.from("mensajes").select("*").order("created_at", { ascending: false }).limit(1000),
    admin.from("comercios").select("id, nombre, plan"),
  ]);

  if (error) throw new Error(`Error cargando los mensajes: ${error.message}`);

  const nombres = new Map((comercios ?? []).map((c) => [c.id, c]));

  // Se agrupa en memoria en vez de con una consulta agregada: son pocos
  // comercios y así el último mensaje y el conteo salen del mismo recorrido.
  const hilos = new Map<
    string,
    { ultimo: Mensaje; sinLeer: number }
  >();

  for (const mensaje of (mensajes ?? []) as Mensaje[]) {
    const hilo = hilos.get(mensaje.comercio_id);
    const sinLeer =
      mensaje.autor === "vendedor" && mensaje.leido_at === null ? 1 : 0;

    if (!hilo) {
      // El primero que aparece es el más reciente: la consulta viene ordenada.
      hilos.set(mensaje.comercio_id, { ultimo: mensaje, sinLeer });
    } else {
      hilo.sinLeer += sinLeer;
    }
  }

  const ordenados = Array.from(hilos.entries()).sort((a, b) => {
    // Lo que espera respuesta va primero; después, lo más reciente.
    if (a[1].sinLeer !== b[1].sinLeer) return b[1].sinLeer - a[1].sinLeer;
    return b[1].ultimo.created_at.localeCompare(a[1].ultimo.created_at);
  });

  const pendientes = ordenados.filter(([, h]) => h.sinLeer > 0).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Mensajes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ordenados.length} conversaciones
          {pendientes > 0 && (
            <span className="ml-2 font-semibold text-primary">
              · {pendientes} esperando respuesta
            </span>
          )}
        </p>
      </div>

      {ordenados.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Ningún vendedor escribió todavía.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {ordenados.map(([comercioId, hilo]) => {
            const comercio = nombres.get(comercioId);
            return (
              <li key={comercioId}>
                <Link
                  href={`/admin/mensajes/${comercioId}`}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-base font-medium">
                      {comercio?.nombre ?? "Comercio eliminado"}
                      {hilo.sinLeer > 0 && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-2xs font-bold text-primary-foreground">
                          {hilo.sinLeer} sin leer
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {hilo.ultimo.autor === "admin" ? "Vos: " : ""}
                      {hilo.ultimo.cuerpo}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(hilo.ultimo.created_at).toLocaleString("es-PY")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
