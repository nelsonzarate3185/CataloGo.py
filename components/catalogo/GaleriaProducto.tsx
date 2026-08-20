"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  nombre: string;
  imagenes: string[];
}

/**
 * Galería de la ficha de producto: imagen grande más miniaturas.
 *
 * Las miniaturas son botones y no enlaces porque no cambian de URL; sólo
 * cambian cuál se muestra.
 */
export default function GaleriaProducto({ nombre, imagenes }: Props) {
  const [activa, setActiva] = useState(0);

  if (imagenes.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
        Sin foto
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {imagenes.length > 1 && (
        <ul className="flex shrink-0 gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
          {imagenes.map((url, indice) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setActiva(indice)}
                aria-current={indice === activa ? "true" : undefined}
                className={cn(
                  "relative size-14 overflow-hidden rounded-md border-2 transition-colors",
                  indice === activa
                    ? "border-primary"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
                <span className="sr-only">Ver imagen {indice + 1} de {nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative aspect-square flex-1 overflow-hidden rounded-lg bg-card">
        <Image
          src={imagenes[activa]}
          alt={nombre}
          fill
          sizes="(max-width: 640px) 100vw, 40vw"
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
