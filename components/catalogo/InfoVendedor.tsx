import Image from "next/image";
import { MapPin, MessageCircle, Store } from "lucide-react";
import { whatsappUrl, formatWhatsApp } from "@/lib/whatsapp";
import type { CatalogoConRelaciones } from "@/types/catalogo";

interface Props {
  comercio: CatalogoConRelaciones["comercios"];
}

/**
 * Datos del vendedor al pie del catálogo.
 *
 * Va en el layout para aparecer en las tres vistas del comprador: quien duda de
 * a quién le está comprando suele hacerlo mirando un producto o con el carrito
 * ya armado, no al entrar.
 *
 * El teléfono es un enlace a WhatsApp y no texto plano: en este mercado nadie
 * copia un número para pegarlo, y la dirección abre el mapa por el mismo
 * motivo.
 */
export default function InfoVendedor({ comercio }: Props) {
  const tieneDireccion = Boolean(comercio.direccion?.trim());

  return (
    <footer className="mt-10 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-3 py-8 sm:px-5">
        <h2 className="mb-4">Sobre el vendedor</h2>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0">
            {comercio.logo_url ? (
              <span className="relative block size-16 overflow-hidden rounded-full border border-border">
                <Image
                  src={comercio.logo_url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </span>
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-muted">
                <Store className="size-7 text-muted-foreground" aria-hidden="true" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-bold">{comercio.nombre}</p>

            {comercio.descripcion?.trim() && (
              <p className="mt-1 max-w-2xl whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                {comercio.descripcion}
              </p>
            )}

            <dl className="mt-4 space-y-3">
              {tieneDireccion && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Dirección</dt>
                    <dd>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          comercio.direccion!
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base text-link hover:underline"
                      >
                        {comercio.direccion}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-muted-foreground">WhatsApp</dt>
                  <dd>
                    <a
                      href={whatsappUrl(comercio.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base text-link hover:underline"
                    >
                      {formatWhatsApp(comercio.whatsapp)}
                    </a>
                  </dd>
                </div>
              </div>
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Los pedidos se coordinan directamente con {comercio.nombre} por
              WhatsApp. CataloGo no participa del pago ni de la entrega.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
