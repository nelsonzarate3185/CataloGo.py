/**
 * Lectura y validación de la configuración pública de Supabase.
 *
 * Existe porque el mensaje original ("Invalid supabaseUrl: Must be a valid HTTP
 * or HTTPS URL") no dice qué variable está mal ni qué valor tiene, y aparece
 * recién al hacer clic en un botón. Nombrar la variable y mostrar el valor
 * convierte un error opaco en una instrucción.
 */

function esUrlHttpValida(valor: string): boolean {
  try {
    const { protocol } = new URL(valor);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export interface ConfigSupabase {
  url: string;
  anonKey: string;
}

/**
 * Devuelve la configuración validada.
 *
 * Lanza con un mensaje accionable si falta o está mal formada. Las variables
 * `NEXT_PUBLIC_*` se incrustan en el bundle al construir, así que corregirlas
 * en el panel de hosting no tiene efecto hasta un build nuevo: el mensaje lo
 * recuerda, porque es la causa más frecuente de que el error persista después
 * de "arreglarlo".
 */
export function leerConfigSupabase(): ConfigSupabase {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL. Cargala en el hosting y volvé a construir: " +
        "las variables NEXT_PUBLIC_* se incrustan en el bundle durante el build."
    );
  }

  if (!esUrlHttpValida(url)) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL tiene un valor inválido: "${url}". ` +
        "Tiene que empezar con https:// (ej: https://tu-proyecto.supabase.co). " +
        "Después de corregirla hay que volver a construir: las variables " +
        "NEXT_PUBLIC_* se incrustan en el bundle durante el build."
    );
  }

  if (!anonKey) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY. Cargala en el hosting y volvé a construir."
    );
  }

  return { url, anonKey };
}
