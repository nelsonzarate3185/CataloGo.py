/**
 * Esqueleto del listado mientras carga.
 *
 * Reproduce la grilla real —dos columnas en móvil, cinco en escritorio— para
 * que al llegar los productos nada se mueva de lugar. Un spinner centrado
 * ocuparía otra altura y produciría un salto visible.
 */
export default function CargandoCatalogo() {
  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
      <div className="flex gap-6">
        <aside className="hidden w-56 shrink-0 space-y-5 lg:block" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
              <div className="h-3 w-3/5 rounded bg-muted" />
            </div>
          ))}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3 h-6 w-48 rounded bg-muted" aria-hidden="true" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg bg-card shadow-card">
                <div className="aspect-square bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="h-5 w-1/2 rounded bg-muted" />
                  <div className="h-9 w-full rounded-pill bg-muted" />
                </div>
              </div>
            ))}
          </div>

          <p className="sr-only" role="status">
            Cargando productos…
          </p>
        </div>
      </div>
    </main>
  );
}
