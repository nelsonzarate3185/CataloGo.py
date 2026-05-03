import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CatalogoPublico from "@/components/catalogo/CatalogoPublico";
import type { CatalogoConRelaciones } from "@/types/catalogo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("catalogos")
    .select("nombre, descripcion, stores(nombre)")
    .eq("slug", slug)
    .eq("activo", true)
    .single();

  if (!data) return { title: "Catálogo no encontrado" };

  const catalogo = data as unknown as {
    nombre: string;
    descripcion: string | null;
    stores: { nombre: string };
  };

  return {
    title: `${catalogo.nombre} — ${catalogo.stores.nombre}`,
    description:
      catalogo.descripcion ??
      `Catálogo digital de ${catalogo.stores.nombre}`,
  };
}

export default async function CatalogoPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("catalogos")
    .select(
      `
      *,
      stores ( id, nombre, telefono, logo_url ),
      categorias ( * ),
      productos ( * )
    `
    )
    .eq("slug", slug)
    .eq("activo", true)
    .single();

  if (!data) notFound();

  const catalogo = data as unknown as CatalogoConRelaciones;

  return <CatalogoPublico catalogo={catalogo} />;
}
