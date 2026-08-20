"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, MapPin } from "lucide-react";
import { useItemsCarrito, totalUnidades } from "@/lib/carrito";
import { useMontado } from "@/hooks/useMontado";
import type { CatalogoConRelaciones } from "@/types/catalogo";

interface Props {
  slug: string;
  comercio: CatalogoConRelaciones["comercios"];
  nombreCatalogo: string;
  busquedaInicial?: string;
}

export default function CatalogoHeader({
  slug,
  comercio,
  nombreCatalogo,
  busquedaInicial = "",
}: Props) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const items = useItemsCarrito(slug);
  const montado = useMontado();
  const unidades = totalUnidades(items);

  function buscar(evento: React.FormEvent) {
    evento.preventDefault();
    const q = busqueda.trim();
    router.push(q ? `/c/${slug}?q=${encodeURIComponent(q)}` : `/c/${slug}`);
  }

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-nav text-nav-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-5">
          <Link
            href={`/c/${slug}`}
            className="flex min-w-0 shrink-0 items-center gap-2 rounded-md py-1"
          >
            {comercio.logo_url ? (
              <span className="relative size-9 shrink-0 overflow-hidden rounded-full border-2 border-white/20">
                <Image
                  src={comercio.logo_url}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </span>
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground">
                {comercio.nombre.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate font-heading text-base font-bold leading-tight">
                {comercio.nombre}
              </span>
              <span className="block truncate text-2xs text-white/70">
                {nombreCatalogo}
              </span>
            </span>
          </Link>

          <form onSubmit={buscar} role="search" className="flex h-10 flex-1 overflow-hidden rounded-md">
            <label htmlFor="buscador-catalogo" className="sr-only">
              Buscar productos en {comercio.nombre}
            </label>
            <input
              id="buscador-catalogo"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos…"
              className="min-w-0 flex-1 bg-white px-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="flex w-12 shrink-0 items-center justify-center bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Search className="size-5" aria-hidden="true" />
              <span className="sr-only">Buscar</span>
            </button>
          </form>

          <Link
            href={`/c/${slug}/carrito`}
            className="flex shrink-0 items-center gap-2 rounded-md px-1 py-1"
          >
            <span className="relative">
              <ShoppingCart className="size-7" strokeWidth={1.8} aria-hidden="true" />
              {montado && unidades > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-2xs font-bold text-primary-foreground">
                  {unidades}
                </span>
              )}
            </span>
            <span className="hidden pb-0.5 text-sm font-bold sm:block">Carrito</span>
            <span className="sr-only">
              {montado && unidades > 0
                ? `Ver carrito, ${unidades} ${unidades === 1 ? "artículo" : "artículos"}`
                : "Ver carrito, vacío"}
            </span>
          </Link>
        </div>
      </div>

      {comercio.direccion && (
        <div className="bg-nav-sub text-nav-sub-foreground">
          <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-3 py-1.5 text-xs sm:px-5">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Retirá en {comercio.direccion}</span>
          </div>
        </div>
      )}
    </header>
  );
}
