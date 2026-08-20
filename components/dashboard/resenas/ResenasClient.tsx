"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Trash2, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Resena } from "@/types/database";

interface ResenaConProducto extends Resena {
  productos: { nombre: string; id: string } | null;
}

interface Props {
  resenas: ResenaConProducto[];
  comercioId: string;
  slug: string;
  moderadaInicial: boolean;
}

export default function ResenasClient({
  resenas: iniciales,
  comercioId,
  slug,
  moderadaInicial,
}: Props) {
  const supabase = createClient();
  const [resenas, setResenas] = useState(iniciales);
  const [moderadas, setModeradas] = useState(moderadaInicial);
  const [guardandoPreferencia, setGuardandoPreferencia] = useState(false);

  const pendientes = resenas.filter((r) => !r.aprobada);
  const publicadas = resenas.filter((r) => r.aprobada);

  async function cambiarModeracion(valor: boolean) {
    setGuardandoPreferencia(true);
    const { error } = await supabase
      .from("comercios")
      .update({ resenas_moderadas: valor })
      .eq("id", comercioId);
    setGuardandoPreferencia(false);

    if (error) {
      toast.error("No pudimos guardar la preferencia");
      return;
    }
    setModeradas(valor);
    toast.success(
      valor
        ? "Las reseñas nuevas van a esperar tu aprobación"
        : "Las reseñas nuevas se publican al instante"
    );
  }

  async function cambiarEstado(id: string, aprobada: boolean) {
    const { error } = await supabase.from("resenas").update({ aprobada }).eq("id", id);
    if (error) {
      toast.error("No pudimos actualizar la reseña");
      return;
    }
    setResenas((prev) => prev.map((r) => (r.id === id ? { ...r, aprobada } : r)));
    toast.success(aprobada ? "Reseña publicada" : "Reseña ocultada");
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta reseña? No se puede deshacer.")) return;
    const { error } = await supabase.from("resenas").delete().eq("id", id);
    if (error) {
      toast.error("No pudimos eliminar la reseña");
      return;
    }
    setResenas((prev) => prev.filter((r) => r.id !== id));
    toast.success("Reseña eliminada");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="moderadas"
            checked={moderadas}
            disabled={guardandoPreferencia}
            onCheckedChange={(v) => cambiarModeracion(v === true)}
          />
          <div>
            <Label htmlFor="moderadas" className="cursor-pointer">
              Revisar las reseñas antes de publicarlas
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Las reseñas son anónimas: cualquiera puede dejar una sin crear cuenta.
              Activá esto si recibís reseñas falsas o de la competencia.
            </p>
          </div>
        </div>
      </div>

      {pendientes.length > 0 && (
        <section>
          <h2 className="mb-3">
            Pendientes{" "}
            <Badge className="rounded-sm bg-cat-ambar-fondo text-cat-ambar hover:bg-cat-ambar-fondo">
              {pendientes.length}
            </Badge>
          </h2>
          <ul className="space-y-2">
            {pendientes.map((r) => (
              <FilaResena
                key={r.id}
                resena={r}
                slug={slug}
                onAprobar={() => cambiarEstado(r.id, true)}
                onEliminar={() => eliminar(r.id)}
              />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3">Publicadas</h2>
        {publicadas.length === 0 ? (
          <p className="rounded-lg border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            Todavía no hay reseñas publicadas.
          </p>
        ) : (
          <ul className="space-y-2">
            {publicadas.map((r) => (
              <FilaResena
                key={r.id}
                resena={r}
                slug={slug}
                onOcultar={() => cambiarEstado(r.id, false)}
                onEliminar={() => eliminar(r.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilaResena({
  resena,
  slug,
  onAprobar,
  onOcultar,
  onEliminar,
}: {
  resena: ResenaConProducto;
  slug: string;
  onAprobar?: () => void;
  onOcultar?: () => void;
  onEliminar: () => void;
}) {
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-bold">{resena.nombre}</span>
        <Rating valor={resena.calificacion} size="sm" soloEstrellas />
        <time dateTime={resena.created_at} className="text-xs text-muted-foreground">
          {new Date(resena.created_at).toLocaleDateString("es-PY")}
        </time>
      </div>

      {resena.productos && (
        <Link
          href={`/c/${slug}/p/${resena.productos.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 block text-xs text-link hover:underline"
        >
          {resena.productos.nombre}
        </Link>
      )}

      {resena.comentario && (
        <p className="mt-2 whitespace-pre-line text-base leading-relaxed">
          {resena.comentario}
        </p>
      )}

      <Separator className="my-3" />

      <div className="flex gap-2">
        {onAprobar && (
          <Button size="sm" onClick={onAprobar}>
            <Check className="size-4" aria-hidden="true" />
            Publicar
          </Button>
        )}
        {onOcultar && (
          <Button variant="outline" size="sm" onClick={onOcultar}>
            <EyeOff className="size-4" aria-hidden="true" />
            Ocultar
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onEliminar}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Eliminar
        </Button>
      </div>
    </li>
  );
}
