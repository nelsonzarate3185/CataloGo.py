"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Límite de error de la aplicación.
 *
 * Sin esto, cualquier excepción muestra la pantalla por defecto de Next, en
 * inglés y sin salida. El botón de reintento importa: buena parte de los
 * fallos acá son de red o de una consulta que expiró, y volver a intentar
 * resuelve sin que el usuario tenga que recargar a mano.
 */
export default function ErrorApp({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Queda en los registros del servidor para poder diagnosticarlo. El digest
    // es lo que permite cruzarlo con la traza real, que Next no expone al
    // navegador por seguridad.
    console.error("[error] ", error.digest ?? "", error.message);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="font-heading text-2xl font-bold">Algo salió mal</p>

      <p className="mt-3 max-w-md text-base text-muted-foreground">
        No pudimos cargar esta página. Suele ser un problema momentáneo de
        conexión.
      </p>

      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">
          Código de referencia: {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-card px-5 font-medium"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
