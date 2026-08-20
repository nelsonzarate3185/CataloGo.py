import Link from "next/link";
import { construirUrl, ORDENES } from "@/lib/productos";
import { formatGS } from "@/lib/utils";
import type { Categoria } from "@/types/database";

interface Props {
  slug: string;
  parametros: Record<string, string | undefined>;
  categorias: Categoria[];
  marcas: string[];
  rango: { min: number; max: number };
  hayOfertas: boolean;
}

/**
 * Filtros del listado.
 *
 * Son enlaces, no controles de formulario: cada filtro es una URL propia, así
 * que se puede compartir por WhatsApp y funciona sin JavaScript. Se renderiza
 * en el servidor.
 */
export default function FiltrosPanel({
  slug,
  parametros,
  categorias,
  marcas,
  rango,
  hayOfertas,
}: Props) {
  const tramos = tramosDePrecio(rango);

  return (
    <div className="space-y-5">
      {hayOfertas && (
        <Seccion titulo="Ofertas">
          <OpcionFiltro
            href={construirUrl(slug, parametros, {
              ofertas: parametros.ofertas ? undefined : "1",
            })}
            activa={Boolean(parametros.ofertas)}
          >
            Solo productos en oferta
          </OpcionFiltro>
        </Seccion>
      )}

      {categorias.length > 0 && (
        <Seccion titulo="Categoría">
          <OpcionFiltro
            href={construirUrl(slug, parametros, { categoria: undefined })}
            activa={!parametros.categoria}
          >
            Todas
          </OpcionFiltro>
          {categorias.map((categoria) => (
            <OpcionFiltro
              key={categoria.id}
              href={construirUrl(slug, parametros, { categoria: categoria.id })}
              activa={parametros.categoria === categoria.id}
            >
              {categoria.nombre}
            </OpcionFiltro>
          ))}
        </Seccion>
      )}

      {marcas.length > 0 && (
        <Seccion titulo="Marca">
          <OpcionFiltro
            href={construirUrl(slug, parametros, { marca: undefined })}
            activa={!parametros.marca}
          >
            Todas
          </OpcionFiltro>
          {marcas.map((marca) => (
            <OpcionFiltro
              key={marca}
              href={construirUrl(slug, parametros, { marca })}
              activa={parametros.marca === marca}
            >
              {marca}
            </OpcionFiltro>
          ))}
        </Seccion>
      )}

      {tramos.length > 0 && (
        <Seccion titulo="Precio">
          <OpcionFiltro
            href={construirUrl(slug, parametros, { min: undefined, max: undefined })}
            activa={!parametros.min && !parametros.max}
          >
            Cualquiera
          </OpcionFiltro>
          {tramos.map((tramo) => (
            <OpcionFiltro
              key={tramo.etiqueta}
              href={construirUrl(slug, parametros, {
                min: tramo.min,
                max: tramo.max,
              })}
              activa={
                parametros.min === String(tramo.min ?? "") ||
                (!!tramo.max && parametros.max === String(tramo.max))
              }
            >
              {tramo.etiqueta}
            </OpcionFiltro>
          ))}
        </Seccion>
      )}

      <Seccion titulo="Ordenar por">
        {Object.entries(ORDENES).map(([valor, etiqueta]) => (
          <OpcionFiltro
            key={valor}
            href={construirUrl(slug, parametros, {
              orden: valor === "relevancia" ? undefined : valor,
            })}
            activa={(parametros.orden ?? "relevancia") === valor}
          >
            {etiqueta}
          </OpcionFiltro>
        ))}
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 font-heading text-base font-bold">{titulo}</h3>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

function OpcionFiltro({
  href,
  activa,
  children,
}: {
  href: string;
  activa: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={activa ? "true" : undefined}
        className={
          activa
            ? "block rounded-sm py-1.5 text-sm font-bold text-foreground"
            : "block rounded-sm py-1.5 text-sm text-link hover:underline"
        }
      >
        {children}
      </Link>
    </li>
  );
}

/**
 * Cuatro tramos de precio derivados del catálogo real.
 *
 * Se calculan sobre el rango del comercio en vez de usar cortes fijos: un
 * kiosco y una mueblería no comparten escala de precios.
 */
function tramosDePrecio(rango: { min: number; max: number }) {
  if (rango.max <= rango.min) return [];

  const paso = Math.ceil((rango.max - rango.min) / 4);
  const cortes = [1, 2, 3].map((n) => rango.min + paso * n);

  return [
    { etiqueta: `Hasta ${formatGS(cortes[0])}`, min: undefined, max: cortes[0] },
    { etiqueta: `${formatGS(cortes[0])} — ${formatGS(cortes[1])}`, min: cortes[0], max: cortes[1] },
    { etiqueta: `${formatGS(cortes[1])} — ${formatGS(cortes[2])}`, min: cortes[1], max: cortes[2] },
    { etiqueta: `Más de ${formatGS(cortes[2])}`, min: cortes[2], max: undefined },
  ];
}
