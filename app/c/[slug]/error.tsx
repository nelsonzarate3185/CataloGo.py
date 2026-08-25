"use client";

import { useEffect } from "react";

/**
 * Error dentro del catálogo.
 *
 * Se separa del límite general para conservar el encabezado del comercio: el
 * comprador sigue viendo de qué tienda se trata y puede volver al listado sin
 * salir del catálogo.
 */
export default function ErrorCatalogo({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[catalogo] ", error.digest ?? "", error.message);
  }, [error]);

  return (
    <main className="mx-auto max-w-7xl px-3 py-16 text-center sm:px-5">
      <p className="font-heading text-xl font-bold">
        No pudimos cargar el catálogo
      </p>

      <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
        Puede ser un problema momentáneo de conexión. Probá de nuevo.
      </p>

      <button
        onClick={reset}
        className="mt-6 inline-flex min-h-[44px] items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
      >
        Reintentar
      </button>
    </main>
  );
}
