"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  productoId: string;
  nombreProducto: string;
}

export default function ResenaForm({ productoId, nombreProducto }: Props) {
  const router = useRouter();
  const [calificacion, setCalificacion] = useState(0);
  const [hover, setHover] = useState(0);
  const [nombre, setNombre] = useState("");
  const [comentario, setComentario] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);

    if (calificacion === 0) {
      setError("Elegí una puntuación de 1 a 5 estrellas.");
      return;
    }

    setEnviando(true);

    const respuesta = await fetch("/api/resenas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        producto_id: productoId,
        nombre,
        calificacion,
        comentario: comentario || undefined,
        sitio_web: sitioWeb || undefined,
      }),
    });

    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);

    if (!respuesta.ok) {
      setError(datos.error ?? "No pudimos guardar tu reseña.");
      return;
    }

    setExito(
      datos.moderada
        ? "¡Gracias! Tu reseña se va a publicar cuando el comercio la revise."
        : "¡Gracias! Tu reseña ya está publicada."
    );
    setCalificacion(0);
    setNombre("");
    setComentario("");
    router.refresh();
  }

  if (exito) {
    return (
      <p role="status" className="rounded-lg bg-success/10 px-4 py-3 text-base text-success">
        {exito}
      </p>
    );
  }

  const mostrada = hover || calificacion;

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <fieldset>
        <legend className="mb-1.5 text-base font-medium">
          Tu puntuación para {nombreProducto}
        </legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCalificacion(n)}
              onMouseEnter={() => setHover(n)}
              aria-pressed={calificacion === n}
              className="rounded-sm p-1"
            >
              <Star
                className={cn(
                  "size-7",
                  n <= mostrada ? "fill-star text-star" : "text-star/35"
                )}
                aria-hidden="true"
              />
              <span className="sr-only">
                {n} {n === 1 ? "estrella" : "estrellas"}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="resena-nombre">Tu nombre *</Label>
        <Input
          id="resena-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          minLength={2}
          maxLength={60}
          placeholder="Ej: María G."
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Se muestra junto a tu reseña. No hace falta crear cuenta.
        </p>
      </div>

      <div>
        <Label htmlFor="resena-comentario">Comentario (opcional)</Label>
        <textarea
          id="resena-comentario"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="¿Qué te pareció?"
          className="mt-1 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm"
        />
      </div>

      {/* Campo trampa: invisible para una persona, lo rellenan los bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label htmlFor="sitio-web">Dejá este campo vacío</label>
        <input
          id="sitio-web"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={sitioWeb}
          onChange={(e) => setSitioWeb(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="touch" disabled={enviando}>
        {enviando ? "Enviando…" : "Publicar reseña"}
      </Button>
    </form>
  );
}
