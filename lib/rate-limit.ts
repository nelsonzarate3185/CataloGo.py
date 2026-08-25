/**
 * Límite de frecuencia en memoria, por instancia.
 *
 * Alcance honesto: la memoria no se comparte entre instancias del servidor, así
 * que el tope real es el configurado multiplicado por la cantidad de instancias
 * activas. Sirve para frenar un bucle o un raspado torpe, no a un atacante
 * decidido con muchas IPs.
 *
 * Se eligió así porque la alternativa —contar en la base— agrega una escritura
 * por request a un endpoint público, que es justamente lo que se quiere evitar.
 * Donde el conteo tiene que ser exacto, como en las reseñas, sí se usa la base.
 */

interface Ventana {
  cuenta: number;
  reinicioEn: number;
}

const ventanas = new Map<string, Ventana>();

/** Cada cuántas peticiones se hace limpieza de claves vencidas. */
const CADA_CUANTAS_LIMPIAR = 500;
let contadorLlamadas = 0;

/**
 * Descarta las ventanas vencidas.
 *
 * Sin esto el Map crece indefinidamente: cada IP nueva deja una entrada que
 * nunca se libera, y una instancia de larga vida terminaría acumulando memoria.
 */
function limpiar(ahora: number) {
  for (const [clave, ventana] of Array.from(ventanas.entries())) {
    if (ventana.reinicioEn <= ahora) ventanas.delete(clave);
  }
}

export interface ResultadoLimite {
  permitido: boolean;
  /** Segundos hasta que se libere el cupo. Sólo útil si `permitido` es false. */
  reintentarEn: number;
}

export function consumir(
  clave: string,
  maximo: number,
  ventanaSegundos: number
): ResultadoLimite {
  const ahora = Date.now();

  if (++contadorLlamadas % CADA_CUANTAS_LIMPIAR === 0) limpiar(ahora);

  const actual = ventanas.get(clave);

  if (!actual || actual.reinicioEn <= ahora) {
    ventanas.set(clave, { cuenta: 1, reinicioEn: ahora + ventanaSegundos * 1000 });
    return { permitido: true, reintentarEn: 0 };
  }

  if (actual.cuenta >= maximo) {
    return {
      permitido: false,
      reintentarEn: Math.ceil((actual.reinicioEn - ahora) / 1000),
    };
  }

  actual.cuenta += 1;
  return { permitido: true, reintentarEn: 0 };
}

/** IP del solicitante según las cabeceras del proxy. */
export function ipDe(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "desconocida";
  return request.headers.get("x-real-ip") ?? "desconocida";
}
