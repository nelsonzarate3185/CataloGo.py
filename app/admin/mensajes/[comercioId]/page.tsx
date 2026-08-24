export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import Hilo from "@/components/mensajes/Hilo";
import type { Mensaje } from "@/types/database";

interface Props {
  params: Promise<{ comercioId: string }>;
}

export default async function HiloAdminPage({ params }: Props) {
  const { comercioId } = await params;

  // Cliente admin, como el resto del panel. La policy de lectura pública de
  // comercios es `to anon` para no exponer user_id ni plan a un comerciante
  // logueado, así que el superadmin —que es `authenticated`— no puede leer con
  // su sesión el comercio de otro: RLS le filtra la fila y la página caía en
  // notFound(). El layout ya verificó que quien mira es superadmin.
  const supabase = createAdminClient();

  const { data: comercio } = await supabase
    .from("comercios")
    .select("id, nombre, slug, plan")
    .eq("id", comercioId)
    .maybeSingle();

  if (!comercio) notFound();

  const { data, error } = await supabase
    .from("mensajes")
    .select("*")
    .eq("comercio_id", comercioId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Error cargando el hilo: ${error.message}`);

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/mensajes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-link hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a mensajes
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{comercio.nombre}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan {comercio.plan} ·{" "}
          <Link
            href={`/c/${comercio.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link hover:underline"
          >
            ver su tienda
          </Link>
        </p>
      </div>

      <Hilo
        comercioId={comercio.id}
        autor="admin"
        mensajes={(data ?? []) as Mensaje[]}
        ayuda="Tu respuesta le llega al vendedor en su panel."
      />
    </div>
  );
}
