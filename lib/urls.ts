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
  if (configurada) return configurada.replace(/\/$/, "");

  if (typeof window !== "undefined") return window.location.origin;

  return "";
}

/** URL absoluta del callback de autenticación, con destino posterior opcional. */
export function urlCallbackAuth(next?: string): string {
  const base = `${baseUrlCliente()}/api/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}
