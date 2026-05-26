import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { adminDb, fromDoc, fromDocs } from "@/lib/firebase/admin";
import CatalogoPublico from "@/components/catalogo/CatalogoPublico";
import type { CatalogoConRelaciones } from "@/types/catalogo";
import type { Comercio, Catalogo, Categoria, Producto } from "@/types/database";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const snap = await adminDb
    .collection("comercios")
    .where("slug", "==", slug)
    .where("activo", "==", true)
    .limit(1)
    .get();

  if (snap.empty) return { title: "Catálogo no encontrado" };

  const comercio = fromDoc<Comercio>(snap.docs[0])!;
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
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CatalogoPage({ params }: Props) {
  const { slug } = await params;

  const comercioSnap = await adminDb
    .collection("comercios")
    .where("slug", "==", slug)
    .where("activo", "==", true)
    .limit(1)
    .get();

  if (comercioSnap.empty) notFound();

  const comercio = fromDoc<Comercio>(comercioSnap.docs[0])!;

  const catalogoSnap = await adminDb
    .collection("catalogos")
    .where("comercio_id", "==", comercio.id)
    .where("activo", "==", true)
    .limit(1)
    .get();

  if (catalogoSnap.empty) notFound();

  const catalogoBase = fromDoc<Catalogo>(catalogoSnap.docs[0])!;

  const [categoriasSnap, productosSnap] = await Promise.all([
    adminDb
      .collection("categorias")
      .where("catalogo_id", "==", catalogoBase.id)
      .where("activo", "==", true)
      .get(),
    adminDb
      .collection("productos")
      .where("catalogo_id", "==", catalogoBase.id)
      .where("disponible", "==", true)
      .get(),
  ]);

  const catalogo: CatalogoConRelaciones = {
    ...catalogoBase,
    comercios: {
      id: comercio.id,
      nombre: comercio.nombre,
      whatsapp: comercio.whatsapp,
      logo_url: comercio.logo_url,
      plan: comercio.plan,
    },
    categorias: fromDocs<Categoria>(categoriasSnap),
    productos: fromDocs<Producto>(productosSnap),
  };

  return <CatalogoPublico catalogo={catalogo} />;
}
