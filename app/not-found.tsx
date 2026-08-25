import Link from "next/link";

/**
 * 404 propio.
 *
 * La pantalla por defecto de Next está en inglés y no ofrece salida. Acá el
 * visitante suele llegar desde un enlace viejo de WhatsApp o un QR impreso, así
 * que lo primero es explicarle que el enlace puede haber cambiado.
 */
export default function NoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="font-heading text-3xl font-bold">No encontramos esta página</p>

      <p className="mt-3 max-w-md text-base text-muted-foreground">
        El enlace puede haber cambiado o la tienda ya no está disponible. Si
        llegaste desde un código QR o un mensaje viejo, pedile el enlace nuevo al
        comercio.
      </p>

      <Link
        href="/"
        className="mt-6 inline-flex min-h-[44px] items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
