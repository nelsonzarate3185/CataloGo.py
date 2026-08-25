"use client";

/**
 * Redimensionado de imágenes en el navegador, antes de subirlas.
 *
 * El formulario aceptaba archivos de hasta 10 MB y los subía tal cual. En 4G
 * paraguayo eso es más de un minuto por foto, y después el comprador descarga
 * esa misma imagen para ver una miniatura de 200px. El costo lo pagan las dos
 * puntas de la transacción.
 *
 * Se hace en el cliente y no en el servidor porque así el archivo pesado nunca
 * viaja: el ahorro está en la subida, que es la mitad lenta de una conexión
 * móvil.
 */

/** Lado mayor, en píxeles, al que se reduce una foto de producto. */
export const LADO_PRODUCTO = 1200;

/** Los logos se muestran chicos; 400px alcanza incluso en pantallas densas. */
export const LADO_LOGO = 400;

const CALIDAD = 0.82;

/**
 * Reduce una imagen manteniendo su proporción y la devuelve como WebP.
 *
 * No agranda: una imagen ya pequeña se devuelve sin tocar, para no inflarla ni
 * degradarla recomprimiendo.
 *
 * Si algo falla —un formato que el navegador no decodifica, un canvas
 * bloqueado— se devuelve el archivo original. Subir una foto pesada es peor
 * que no subirla, pero mucho mejor que perder el producto.
 */
export async function reducirImagen(archivo: File, ladoMaximo: number): Promise<File> {
  // Los SVG no son mapas de bits: pasarlos por canvas los rasteriza y arruina.
  if (archivo.type === "image/svg+xml") return archivo;

  try {
    const bitmap = await createImageBitmap(archivo);

    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    if (escala === 1) {
      bitmap.close();
      return archivo;
    }

    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return archivo;
    }

    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", CALIDAD)
    );

    if (!blob) return archivo;

    // Si el resultado no es más chico, no vale la pena cambiar de formato.
    if (blob.size >= archivo.size) return archivo;

    const nombre = archivo.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], nombre, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return archivo;
  }
}

/** Tamaño legible, para mostrarle al usuario cuánto se ahorró. */
export function formatearPeso(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
