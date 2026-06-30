export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CatalogoPublico from "@/components/catalogo/CatalogoPublico";
import type { CatalogoConRelaciones } from "@/types/catalogo";

interface Props {
  params: Promise<{ slug: string }>;
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
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CatalogoPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: comercioData } = await supabase
    .from("comercios")
    .select("id, nombre, whatsapp, logo_url, plan, activo, direccion")
    .eq("slug", slug)
    .eq("activo", true)
    .single();

  if (!comercioData) notFound();

  const [catalogosRes] = await Promise.all([
    supabase
      .from("catalogos")
      .select(`
        *,
        categorias ( * ),
        productos ( * )
      `)
      .eq("comercio_id", comercioData.id)
      .eq("activo", true)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  const catalogoRaw = catalogosRes.data?.[0];
  if (!catalogoRaw) notFound();

  const catalogo = {
    ...catalogoRaw,
    comercios: comercioData,
  } as unknown as CatalogoConRelaciones;

  return <CatalogoPublico catalogo={catalogo} />;
}
