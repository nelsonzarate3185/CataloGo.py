export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCatalogoPorSlug } from "@/lib/catalogo";
import {
  filtrarProductos,
  marcasDisponibles,
  rangoPrecios,
  porcentajeDescuento,
  construirUrl,
  esOrdenValido,
  ORDENES,
} from "@/lib/productos";
import ProductoCard from "@/components/catalogo/ProductoCard";
import FiltrosPanel from "@/components/catalogo/FiltrosPanel";
import FiltrosMobile from "@/components/catalogo/FiltrosMobile";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("comercios")
    .select("nombre, descripcion, logo_url")
    .eq("slug", slug)
    .eq("activo", true)
    .single();

  if (!data) return { title: "Catálogo no encontrado" };

  const comercio = data as { nombre: string; descripcion: string | null; logo_url: string | null };
  const title = `${comercio.nombre} — Catálogo digital`;
  const description =
    comercio.descripcion ??
    `Mirá el catálogo de ${comercio.nombre} y hacé tu pedido por WhatsApp.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: comercio.logo_url ? [comercio.logo_url] : [],
      type: "website",
    },
    twitter: { card: "summary", title, description },
  };
}

/** Toma el primer valor cuando un parámetro llega repetido en la URL. */
function unico(valor: string | string[] | undefined): string | undefined {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v?.trim() ? v : undefined;
}

function aEntero(valor: string | undefined): number | undefined {
  if (valor === undefined) return undefined;
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) ? n : undefined;
}

export default async function CatalogoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const catalogo = await getCatalogoPorSlug(slug);

  if (!catalogo) notFound();

  const parametros = {
    q: unico(sp.q),
    categoria: unico(sp.categoria),
    marca: unico(sp.marca),
    min: unico(sp.min),
    max: unico(sp.max),
    ofertas: unico(sp.ofertas),
    orden: unico(sp.orden),
  };

  const ordenSolicitado = parametros.orden;
  const orden = esOrdenValido(ordenSolicitado) ? ordenSolicitado : undefined;

  const categorias = [...catalogo.categorias]
    .filter((c) => c.activo)
    .sort((a, b) => a.orden - b.orden);
  const disponibles = catalogo.productos.filter((p) => p.disponible);

  const productos = filtrarProductos(catalogo.productos, {
    q: parametros.q,
    categoria: parametros.categoria,
    marca: parametros.marca,
    precioMin: aEntero(parametros.min),
    precioMax: aEntero(parametros.max),
    soloOfertas: Boolean(parametros.ofertas),
    orden,
  });

  const marcas = marcasDisponibles(disponibles);
  const rango = rangoPrecios(disponibles);
  const hayOfertas = disponibles.some((p) => porcentajeDescuento(p) > 0);

  const categoriaActiva = categorias.find((c) => c.id === parametros.categoria);
  const chips = construirChips({ slug, parametros, categoriaActiva: categoriaActiva?.nombre });

  const panel = (
    <FiltrosPanel
      slug={slug}
      parametros={parametros}
      categorias={categorias}
      marcas={marcas}
      rango={rango}
      hayOfertas={hayOfertas}
    />
  );

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
      <div className="flex gap-6">
        <aside className="hidden w-56 shrink-0 lg:block">{panel}</aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate">
                {parametros.q
                  ? `Resultados para "${parametros.q}"`
                  : categoriaActiva?.nombre ?? "Todos los productos"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {productos.length}{" "}
                {productos.length === 1 ? "resultado" : "resultados"}
                {orden && orden !== "relevancia" && ` · ${ORDENES[orden]}`}
              </p>
            </div>

            <FiltrosMobile activos={chips.length}>{panel}</FiltrosMobile>
          </div>

          {chips.length > 0 && (
            <ul className="mb-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.etiqueta}>
                  <Link href={chip.href}>
                    <Badge
                      variant="secondary"
                      className="gap-1 rounded-sm py-1 font-normal"
                    >
                      {chip.etiqueta}
                      <X className="size-3" aria-hidden="true" />
                      <span className="sr-only">Quitar filtro</span>
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {productos.length === 0 ? (
            <div className="rounded-lg bg-card px-6 py-16 text-center">
              <p className="font-heading text-lg font-bold">
                No encontramos productos
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {parametros.q
                  ? `Nada coincide con "${parametros.q}".`
                  : "Probá quitando algún filtro."}
              </p>
              <Link
                href={`/c/${slug}`}
                className="mt-4 inline-block text-sm text-link hover:underline"
              >
                Ver todo el catálogo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {productos.map((producto) => (
                <ProductoCard key={producto.id} slug={slug} producto={producto} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/** Chips de filtros activos, cada uno enlazando a la URL que lo quita. */
function construirChips({
  slug,
  parametros,
  categoriaActiva,
}: {
  slug: string;
  parametros: Record<string, string | undefined>;
  categoriaActiva?: string;
}) {
  const chips: { etiqueta: string; href: string }[] = [];

  if (parametros.categoria && categoriaActiva) {
    chips.push({
      etiqueta: categoriaActiva,
      href: construirUrl(slug, parametros, { categoria: undefined }),
    });
  }
  if (parametros.marca) {
    chips.push({
      etiqueta: parametros.marca,
      href: construirUrl(slug, parametros, { marca: undefined }),
    });
  }
  if (parametros.ofertas) {
    chips.push({
      etiqueta: "En oferta",
      href: construirUrl(slug, parametros, { ofertas: undefined }),
    });
  }
  if (parametros.min || parametros.max) {
    chips.push({
      etiqueta: "Precio acotado",
      href: construirUrl(slug, parametros, { min: undefined, max: undefined }),
    });
  }

  return chips;
}
