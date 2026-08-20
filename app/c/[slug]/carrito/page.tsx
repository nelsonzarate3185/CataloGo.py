export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalogoPorSlug } from "@/lib/catalogo";
import CarritoContenido from "@/components/catalogo/CarritoContenido";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Tu carrito",
  // El carrito es privado del navegador: no tiene nada que indexar.
  robots: { index: false, follow: false },
};

export default async function CarritoPage({ params }: Props) {
  const { slug } = await params;
  const catalogo = await getCatalogoPorSlug(slug);

  if (!catalogo) notFound();

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/c/${slug}`}>{catalogo.comercios.nombre}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Carrito</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="mb-4">Tu pedido</h1>

      <CarritoContenido
        slug={slug}
        catalogoId={catalogo.id}
        comercio={catalogo.comercios}
      />
    </main>
  );
}
