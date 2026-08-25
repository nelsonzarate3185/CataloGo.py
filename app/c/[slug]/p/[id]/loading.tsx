/** Esqueleto de la ficha de producto. */
export default function CargandoProducto() {
  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
      <div className="mb-4 h-4 w-64 rounded bg-muted" aria-hidden="true" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_18rem]">
        <div className="aspect-square rounded-lg bg-muted" aria-hidden="true" />

        <div className="space-y-3" aria-hidden="true">
          <div className="h-8 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-10 w-1/2 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-5/6 rounded bg-muted" />
        </div>

        <div className="h-64 rounded-lg border border-border bg-muted" aria-hidden="true" />
      </div>

      <p className="sr-only" role="status">
        Cargando el producto…
      </p>
    </main>
  );
}
