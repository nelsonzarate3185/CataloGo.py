import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Rol declarado por una clave de Supabase con formato JWT.
 *
 * Devuelve null si la clave no es un JWT (las claves nuevas tipo `sb_secret_…`
 * no lo son) para no rechazar formatos válidos que no se pueden inspeccionar.
 */
function rolDeLaClave(clave: string): string | null {
  const partes = clave.split(".");
  if (partes.length !== 3) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(partes[1], "base64url").toString("utf8")
    ) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * Cliente con service role, que omite RLS.
 *
 * Valida que la clave sea efectivamente la service role. Poner la anon key en
 * `SUPABASE_SERVICE_ROLE_KEY` no produce ningún error visible: el cliente se
 * construye igual, las lecturas siguen funcionando si hay políticas permisivas,
 * y sólo fallan las escrituras — en silencio, porque RLS filtra filas sin
 * lanzar error. Un UPDATE bloqueado devuelve cero filas, indistinguible de un
 * registro inexistente.
 *
 * Ese fallo silencioso ya costó cuatro intentos de arreglo en la aprobación de
 * solicitudes de plan, buscando en el código un problema que era de
 * configuración. Mejor fallar fuerte y temprano.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error("Supabase admin env vars missing");

  const rol = rolDeLaClave(key);
  if (rol !== null && rol !== "service_role") {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY contiene una clave con rol "${rol}", no "service_role". ` +
        `Copiala de Supabase → Settings → API → service_role (no la anon public). ` +
        `Con la clave equivocada el panel admin lee bien pero no puede escribir: ` +
        `RLS bloquea los UPDATE sin devolver ningún error.`
    );
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
