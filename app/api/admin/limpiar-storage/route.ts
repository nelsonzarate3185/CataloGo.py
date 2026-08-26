import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Barrido de imágenes huérfanas del Storage.
 *
 * El trigger de la base borra las imágenes al borrar su producto, pero opera
 * sobre `storage.objects`. Esta ruta usa la API de Storage, que es la
 * autoridad sobre los archivos en sí, y sirve para dos cosas: recoger lo que
 * el trigger no alcanzó y confirmar que no quedó nada colgado.
 *
 * Por defecto sólo informa. Borra únicamente con `?aplicar=1`: es una
 * operación sin vuelta atrás sobre archivos de clientes.
 */

/** Tope de objetos por página que devuelve la API de Storage. */
const POR_PAGINA = 1000;

/** Objetos por llamada de borrado, para no armar peticiones enormes. */
const LOTE_BORRADO = 100;

const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

type Admin = ReturnType<typeof createAdminClient>;

async function esSuperAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("role")
    .eq("email", user.email ?? "")
    .single();

  return data?.role === "super_admin";
}

/** Rutas completas de todos los objetos de un bucket. */
async function listarBucket(admin: Admin, bucket: string): Promise<string[]> {
  const rutas: string[] = [];

  // El Storage es plano pero se navega por carpetas: primero los directorios
  // de cada comercio, después su contenido.
  const { data: carpetas, error } = await admin.storage
    .from(bucket)
    .list("", { limit: POR_PAGINA });

  if (error) throw new Error(`No se pudo listar ${bucket}: ${error.message}`);

  for (const carpeta of carpetas ?? []) {
    // Una entrada sin id es un directorio; con id es un archivo suelto.
    if (carpeta.id !== null) {
      rutas.push(carpeta.name);
      continue;
    }

    let desplazamiento = 0;
    for (;;) {
      const { data: archivos, error: errorArchivos } = await admin.storage
        .from(bucket)
        .list(carpeta.name, { limit: POR_PAGINA, offset: desplazamiento });

      if (errorArchivos) {
        throw new Error(`No se pudo listar ${bucket}/${carpeta.name}: ${errorArchivos.message}`);
      }
      if (!archivos || archivos.length === 0) break;

      for (const archivo of archivos) rutas.push(`${carpeta.name}/${archivo.name}`);
      if (archivos.length < POR_PAGINA) break;
      desplazamiento += POR_PAGINA;
    }
  }

  return rutas;
}

function idProductoDe(ruta: string): string | null {
  return new RegExp(`^[^/]+/(${UUID})`).exec(ruta)?.[1] ?? null;
}

function idComercioDe(ruta: string): string | null {
  return new RegExp(`^(${UUID})/`).exec(ruta)?.[1] ?? null;
}

async function borrarEnLotes(admin: Admin, bucket: string, rutas: string[]) {
  for (let i = 0; i < rutas.length; i += LOTE_BORRADO) {
    const lote = rutas.slice(i, i + LOTE_BORRADO);
    const { error } = await admin.storage.from(bucket).remove(lote);
    if (error) throw new Error(`Error borrando en ${bucket}: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  if (!(await esSuperAdmin())) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const aplicar = request.nextUrl.searchParams.get("aplicar") === "1";
  const admin = createAdminClient();

  try {
    const [rutasProductos, rutasLogos, { data: productos }, { data: comercios }] =
      await Promise.all([
        listarBucket(admin, "productos"),
        listarBucket(admin, "logos"),
        admin.from("productos").select("id"),
        admin.from("comercios").select("id"),
      ]);

    const idsProductos = new Set((productos ?? []).map((p) => p.id));
    const idsComercios = new Set((comercios ?? []).map((c) => c.id));

    // Un nombre que no sigue la convención no se toca: no se puede afirmar de
    // quién es, y borrar por las dudas es peor que dejar un archivo de más.
    const sinReconocer: string[] = [];
    const huerfanasProductos: string[] = [];
    const huerfanasLogos: string[] = [];

    for (const ruta of rutasProductos) {
      const id = idProductoDe(ruta);
      if (!id) { sinReconocer.push(`productos/${ruta}`); continue; }
      if (!idsProductos.has(id)) huerfanasProductos.push(ruta);
    }

    for (const ruta of rutasLogos) {
      const id = idComercioDe(ruta);
      if (!id) { sinReconocer.push(`logos/${ruta}`); continue; }
      if (!idsComercios.has(id)) huerfanasLogos.push(ruta);
    }

    if (aplicar) {
      await borrarEnLotes(admin, "productos", huerfanasProductos);
      await borrarEnLotes(admin, "logos", huerfanasLogos);
    }

    return NextResponse.json({
      aplicado: aplicar,
      revisados: { productos: rutasProductos.length, logos: rutasLogos.length },
      huerfanas: {
        productos: huerfanasProductos.length,
        logos: huerfanasLogos.length,
      },
      sinReconocer: sinReconocer.slice(0, 50),
      ejemplos: huerfanasProductos.slice(0, 10),
      nota: aplicar
        ? "Archivos eliminados."
        : "Sólo informe. Repetir con ?aplicar=1 para borrar.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
