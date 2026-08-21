/**
 * URL base de la aplicación para enlaces que salen del navegador.
 *
 * Existe porque usar `window.location.origin` ata el enlace al dominio desde el
 * que se navegaba en ese momento. En Vercel eso puede ser el alias de rama
 * (`proyecto-git-main-scope.vercel.app`) en vez de producción, y los correos de
 * recuperación terminan apuntando a un dominio que cambia si se renombra el
 * proyecto. Para OAuth es peor: el redirect URI tiene que estar autorizado en
 * el proveedor, y los alias de rama nunca lo están.
 *
 * Con `NEXT_PUBLIC_APP_URL` definida, los enlaces salen siempre al dominio
 * estable. Sin ella se conserva el comportamiento anterior.
 */
export function baseUrlCliente(): string {
  const configurada = process.env.NEXT_PUBLIC_APP_URL?.trim();

  // Se toma sólo el origen y se descarta cualquier ruta que traiga el valor.
  // La lista blanca de Supabase se escribe con comodín ("https://sitio/**") y
  // es fácil copiar esa forma acá; sin recortarla, el enlace de callback sale
  // como "https://sitio/**/api/auth/callback" y da 404.
  //
  // También se valida el esquema: cargada sin https:// produce un redirectTo
  // que el proveedor de OAuth rechaza. Ante cualquier valor inválido conviene
  // el origen real del navegador, que siempre es correcto.
  const origen = origenDe(configurada);
  if (origen) return origen;

  if (typeof window !== "undefined") return window.location.origin;

  return "";
}

/**
 * Origen (esquema + host + puerto) de un valor configurado, o null si no sirve
 * como base de enlaces. Descarta ruta, query y comodines.
 */
function origenDe(valor: string | undefined): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** URL absoluta del callback de autenticación, con destino posterior opcional. */
export function urlCallbackAuth(next?: string): string {
  const base = `${baseUrlCliente()}/api/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}
