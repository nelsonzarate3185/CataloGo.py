import { notFound } from "next/navigation";
import { getCatalogoPorSlug } from "@/lib/catalogo";
import CatalogoHeader from "@/components/catalogo/CatalogoHeader";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

/**
 * Envoltorio de todas las vistas del comprador.
 *
 * Fija el modo claro con `data-theme` porque el catálogo público se sirve
 * siempre en claro, igual que la tienda de Amazon, independientemente de la
 * preferencia guardada para el dashboard.
 */
export default async function CatalogoLayout({ params, children }: Props) {
  const { slug } = await params;
  const catalogo = await getCatalogoPorSlug(slug);

  if (!catalogo) notFound();

  return (
    <div className="min-h-screen bg-background">
      <CatalogoHeader
        slug={slug}
        comercio={catalogo.comercios}
        nombreCatalogo={catalogo.nombre}
      />
      {children}
    </div>
  );
}
