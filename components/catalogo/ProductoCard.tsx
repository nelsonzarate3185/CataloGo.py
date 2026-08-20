import Image from "next/image";
import Link from "next/link";
import { Price } from "@/components/ui/price";
import { Rating } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";
import BotonAgregar from "./BotonAgregar";
import { porcentajeDescuento, sePuedeComprar } from "@/lib/productos";
import type { Producto } from "@/types/database";

interface Props {
  slug: string;
  producto: Producto;
}

export default function ProductoCard({ slug, producto }: Props) {
  const descuento = porcentajeDescuento(producto);
  const comprable = sePuedeComprar(producto);
  const stockBajo =
    typeof producto.stock === "number" && producto.stock > 0 && producto.stock <= 5;
  const fotosExtra = Array.isArray(producto.imagenes_adicionales)
    ? producto.imagenes_adicionales.length
    : 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg bg-card shadow-card transition-shadow hover:shadow-card-md">
      <Link
        href={`/c/${slug}/p/${producto.id}`}
        className="relative block aspect-square bg-muted"
      >
        {producto.imagen_url ? (
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
            Sin foto
          </span>
        )}

        {descuento > 0 && (
          <Badge className="absolute left-2 top-2 rounded-sm bg-deal text-white hover:bg-deal">
            -{descuento}%
          </Badge>
        )}

        {producto.destacado && descuento === 0 && (
          <Badge className="absolute left-2 top-2 rounded-sm bg-primary text-primary-foreground hover:bg-primary">
            Más vendido
          </Badge>
        )}

        {fotosExtra > 0 && (
          <span className="absolute bottom-2 right-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-2xs font-bold text-white">
            +{fotosExtra} fotos
          </span>
        )}

        {!comprable && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-sm bg-black/75 px-2 py-1 text-xs font-bold text-white">
              Sin stock
            </span>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {producto.marca && (
          <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            {producto.marca}
          </span>
        )}

        <h3 className="text-sm font-normal">
          <Link
            href={`/c/${slug}/p/${producto.id}`}
            className="line-clamp-2 hover:text-link hover:underline"
          >
            {producto.nombre}
          </Link>
        </h3>

        {producto.resenas_count > 0 && (
          <Rating
            valor={producto.calificacion_promedio}
            cantidad={producto.resenas_count}
            size="sm"
          />
        )}

        <div className="mt-auto space-y-2 pt-1">
          <Price
            precio={producto.precio}
            precioAnterior={producto.precio_anterior}
            size="md"
          />

          {stockBajo && (
            <p className="text-xs font-medium text-deal">
              Quedan {producto.stock}
            </p>
          )}

          <BotonAgregar slug={slug} producto={producto} />
        </div>
      </div>
    </article>
  );
}
