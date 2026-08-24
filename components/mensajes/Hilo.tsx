"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AutorMensaje, Mensaje } from "@/types/database";

interface Props {
  comercioId: string;
  /** Con qué etiqueta escribe quien está mirando. */
  autor: AutorMensaje;
  mensajes: Mensaje[];
  /** Texto de ayuda encima del campo de escritura. */
  ayuda?: string;
}

/**
 * Conversación entre un comercio y el superadmin.
 *
 * El mismo componente sirve a los dos lados: lo único que cambia es con qué
 * etiqueta se firma. Duplicarlo por rol habría hecho que las dos vistas se
 * desincronizaran en cuanto se tocara una.
 */
export default function Hilo({ comercioId, autor, mensajes: iniciales, ayuda }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [mensajes, setMensajes] = useState(iniciales);
  const [cuerpo, setCuerpo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  // Los mensajes que le llegaron a quien mira son los del otro lado.
  const contraparte: AutorMensaje = autor === "admin" ? "vendedor" : "admin";

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length]);

  useEffect(() => {
    const sinLeer = iniciales
      .filter((m) => m.autor === contraparte && m.leido_at === null)
      .map((m) => m.id);

    if (sinLeer.length === 0) return;

    async function marcar(ids: string[]) {
      const { error } = await supabase
        .from("mensajes")
        .update({ leido_at: new Date().toISOString() })
        .in("id", ids);

      if (error) {
        // No se descarta el error: si RLS lo rechaza, el contador queda
        // clavado para siempre y sin esta señal no habría forma de saberlo.
        toast.error(`No pudimos marcar como leído: ${error.message}`);
        return;
      }

      // El contador del panel se calcula en el layout, del lado del servidor.
      // Sin este refresco el badge sigue mostrando el valor previo aunque el
      // mensaje ya esté leído.
      router.refresh();
    }

    void marcar(sinLeer);
  }, [iniciales, contraparte, supabase, router]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const texto = cuerpo.trim();
    if (!texto) return;

    setEnviando(true);
    const { data, error } = await supabase
      .from("mensajes")
      .insert({ comercio_id: comercioId, autor, cuerpo: texto })
      .select()
      .single();
    setEnviando(false);

    if (error || !data) {
      toast.error(`No pudimos enviar el mensaje: ${error?.message ?? "sin detalle"}`);
      return;
    }

    setMensajes((prev) => [...prev, data as Mensaje]);
    setCuerpo("");
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      <div className="max-h-[55vh] min-h-[240px] flex-1 space-y-3 overflow-y-auto p-4">
        {mensajes.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Todavía no hay mensajes. Escribí el primero.
          </p>
        ) : (
          mensajes.map((mensaje) => {
            const mio = mensaje.autor === autor;
            return (
              <div key={mensaje.id} className={cn("flex", mio ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2",
                    mio
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-line text-base leading-relaxed">
                    {mensaje.cuerpo}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-2xs",
                      mio ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {mensaje.autor === "admin" ? "CataloGo" : "Vos"}
                    {!mio && mensaje.autor === "vendedor" && " (el comercio)"}
                    {" · "}
                    {new Date(mensaje.created_at).toLocaleString("es-PY")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={finRef} />
      </div>

      <form onSubmit={enviar} className="border-t border-border p-4">
        {ayuda && <p className="mb-2 text-xs text-muted-foreground">{ayuda}</p>}

        <label htmlFor="mensaje-cuerpo" className="sr-only">
          Escribí tu mensaje
        </label>
        <textarea
          id="mensaje-cuerpo"
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Escribí tu consulta…"
          className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm"
        />

        <div className="mt-2 flex justify-end">
          <Button type="submit" size="touch" disabled={enviando || !cuerpo.trim()}>
            <Send className="size-4" aria-hidden="true" />
            {enviando ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
