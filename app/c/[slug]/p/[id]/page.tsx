export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalogoPorSlug, getResenasProducto } from "@/lib/catalogo";
import { porcentajeDescuento, sePuedeComprar } from "@/lib/productos";
import GaleriaProducto from "@/components/catalogo/GaleriaProducto";
import BotonAgregar from "@/components/catalogo/BotonAgregar";
import ProductoCard from "@/components/catalogo/ProductoCard";
import { Price } from "@/components/ui/price";
import { Rating } from "@/components/ui/rating";
import ResenaForm from "@/components/catalogo/ResenaForm";
import ResenasLista from "@/components/catalogo/ResenasLista";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Producto } from "@/types/database";

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

/** Imagen principal más adicionales, sin vacíos ni duplicados. */
function imagenesDe(producto: Producto): string[] {
  const extra = Array.isArray(producto.imagenes_adicionales)
    ? (producto.imagenes_adicionales as unknown[]).filter(
        (u): u is string => typeof u === "string" && u.length > 0
      )
    : [];
  const todas = [producto.imagen_url, ...extra].filter(
    (u): u is string => typeof u === "string" && u.length > 0
  );
  return Array.from(new Set(todas));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const catalogo = await getCatalogoPorSlug(slug);
  const producto = catalogo?.productos.find((p) => p.id === id);

  if (!catalogo || !producto) return { title: "Producto no encontrado" };

  const title = `${producto.nombre} — ${catalogo.comercios.nombre}`;
  const description =
    producto.descripcion ??
    `${producto.nombre} en el catálogo de ${catalogo.comercios.nombre}. Pedí por WhatsApp.`;
  const imagenes = imagenesDe(producto);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: imagenes.slice(0, 1),
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProductoPage({ params }: Props) {
  const { slug, id } = await params;
  const catalogo = await getCatalogoPorSlug(slug);

  if (!catalogo) notFound();

  const producto = catalogo.productos.find((p) => p.id === id);
  if (!producto || !producto.disponible) notFound();

  const categoria = catalogo.categorias.find((c) => c.id === producto.categoria_id);
  const imagenes = imagenesDe(producto);
  const descuento = porcentajeDescuento(producto);
  const comprable = sePuedeComprar(producto);

  const resenas = await getResenasProducto(producto.id);

  const relacionados = catalogo.productos
    .filter(
      (p) =>
        p.id !== producto.id &&
        p.disponible &&
        (categoria ? p.categoria_id === producto.categoria_id : true)
    )
    .slice(0, 5);

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/c/${slug}`}>{catalogo.comercios.nombre}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {categoria && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/c/${slug}?categoria=${categoria.id}`}>
                    {categoria.nombre}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1">{producto.nombre}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_18rem]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <GaleriaProducto nombre={producto.nombre} imagenes={imagenes} />
        </div>

        <div className="min-w-0">
          {producto.marca && (
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
              {producto.marca}
            </p>
          )}

          <h1 className="font-heading text-2xl font-bold">{producto.nombre}</h1>

          {producto.resenas_count > 0 && (
            <a href="#resenas" className="mt-2 inline-flex hover:underline">
              <Rating
                valor={producto.calificacion_promedio}
                cantidad={producto.resenas_count}
              />
            </a>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {producto.destacado && (
              <Badge className="rounded-sm bg-primary text-primary-foreground hover:bg-primary">
                Más vendido
              </Badge>
            )}
            {descuento > 0 && (
              <Badge className="rounded-sm bg-deal text-white hover:bg-deal">
                Oferta -{descuento}%
              </Badge>
            )}
          </div>

          <Separator className="my-4" />

          <Price
            precio={producto.precio}
            precioAnterior={producto.precio_anterior}
            size="lg"
          />

          {producto.descripcion && (
            <>
              <Separator className="my-4" />
              <h2 className="mb-2">Descripción</h2>
              <p className="whitespace-pre-line text-base leading-relaxed text-foreground">
                {producto.descripcion}
              </p>
            </>
          )}
        </div>

        {/* Caja de compra */}
        <aside className="h-fit rounded-lg border border-border bg-card p-4 lg:sticky lg:top-24">
          <Price
            precio={producto.precio}
            precioAnterior={producto.precio_anterior}
            size="lg"
          />

          <p
            className={
              comprable
                ? "mt-2 text-base font-medium text-success"
                : "mt-2 text-base font-medium text-deal"
            }
          >
            {comprable ? "Disponible" : "Sin stock"}
          </p>

          {typeof producto.stock === "number" && producto.stock > 0 && producto.stock <= 5 && (
            <p className="mt-1 text-sm font-medium text-deal">
              Quedan solo {producto.stock}
            </p>
          )}

          <div className="mt-4">
            <BotonAgregar slug={slug} producto={producto} variante="full" />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            El pedido se envía por WhatsApp a {catalogo.comercios.nombre}. Coordinás
            pago y entrega directamente con el comercio.
          </p>

          {catalogo.comercios.direccion && (
            <>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground">
                Retiro en {catalogo.comercios.direccion}
              </p>
            </>
          )}
        </aside>
      </div>

      <section id="resenas" className="mt-10 max-w-3xl scroll-mt-24">
        <h2 className="mb-3">Reseñas</h2>
        <ResenasLista
          resenas={resenas}
          promedio={producto.calificacion_promedio}
          total={producto.resenas_count}
        />
        <h3 className="mb-2 mt-6">Dejá tu reseña</h3>
        <ResenaForm productoId={producto.id} nombreProducto={producto.nombre} />
      </section>

      {relacionados.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3">
            {categoria ? `Más en ${categoria.nombre}` : "Más productos"}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {relacionados.map((p) => (
              <ProductoCard key={p.id} slug={slug} producto={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
