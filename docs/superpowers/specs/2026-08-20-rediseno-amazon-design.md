# Rediseño Amazon — Diseño general y sub-proyecto #1

Fecha: 2026-08-20
Estado: los seis sub-proyectos implementados. Migración de reseñas pendiente de aplicar.

## Objetivo

Rediseñar la interfaz de CataloGo tomando como referencia Amazon, con foco
principal en el catálogo público del comprador (`/c/[slug]`).

Decisiones tomadas con el usuario:

- Alcance: toda la aplicación (comprador, dashboard, admin, landing).
- Datos: rediseño de UI **más** campos nuevos de producto **más** sistema de
  reseñas.
- Navegación: multi-página, con URL propia por producto.
- Cierre de compra: se mantiene WhatsApp directo. No se reintroduce pasarela de
  pago (MercadoPago fue removido a propósito en `c736ff2`).

## Descomposición

El pedido abarca seis subsistemas independientes. Cada uno tiene su propio ciclo
de diseño, plan e implementación.

| # | Sub-proyecto | Depende de | Peso |
|---|---|---|---|
| 1 | Sistema de diseño base: tokens y primitivos | — | S |
| 2 | Migración de esquema: `precio_anterior`, `stock`, `marca` | — | S |
| 3 | Catálogo comprador multi-página | 1, 2 | L |
| 4 | Dashboard: carga de campos nuevos y rediseño | 1, 2 | M |
| 5 | Reseñas y valoraciones | 1, 3 | L |
| 6 | Landing y panel admin | 1 | M |

### Riesgo abierto en el sub-proyecto #5

El rol `viewer` no tiene login: el comprador entra al catálogo público sin
cuenta. Amazon apoya sus reseñas en compras verificadas de usuarios
identificados. Sin cuentas, las alternativas son reseñas anónimas con
rate-limit por IP (spameable), reseñas atadas al pedido mediante un link
enviado por WhatsApp (verificable, encaja con el flujo actual), o reseñas
moderadas por el dueño desde el dashboard. Se decide al llegar al #5.

---

## Sub-proyecto #1 — Sistema de diseño base

### Problema

No existe `components.json` ni `components/ui/`: shadcn nunca se inicializó. Las
dependencias de Radix, `cva` y `tailwind-merge` están instaladas, pero cada
componente define sus propios botones con colores hex en atributos `style`
inline. `CatalogoPublico.tsx` tiene 535 líneas con `#f6a623` repetido siete
veces. Esto contradice la regla de `CLAUDE.md` de no hardcodear colores y hace
que los cinco sub-proyectos restantes reinventen los mismos elementos.

### Paleta

La paleta actual ya apunta a Amazon pero se desvía en el fondo: `#e9ebe4` es
verde salvia, mientras Amazon usa gris frío `#EAEDED`. En una grilla densa de
producto el verde tiñe las fotos y comunica "wellness" en vez de "marketplace".

Se alinean las superficies a Amazon y **se conserva el naranja de marca**
`#f6a623`, que está a un paso del `#FFA41C` de Amazon. El amarillo `#FFD814`
queda reservado al CTA de agregar al carrito.

| Token | Hex | HSL | Uso |
|---|---|---|---|
| `--background` | `#EAEDED` | `180 8% 92%` | Fondo general |
| `--foreground` | `#0F1111` | `180 6% 6%` | Texto principal |
| `--card` | `#FFFFFF` | `0 0% 100%` | Tarjetas de producto |
| `--border` | `#D5D9D9` | `180 5% 84%` | Bordes |
| `--nav` | `#131921` | `214 27% 10%` | Header principal |
| `--nav-sub` | `#232F3E` | `213 28% 19%` | Barra de categorías |
| `--primary` | `#F6A623` | `37 92% 55%` | Naranja de marca |
| `--cta` | `#FFD814` | `50 100% 54%` | Botón agregar al carrito |
| `--link` | `#007185` | `189 100% 26%` | Enlaces |
| `--deal` | `#CC0C39` | `346 89% 42%` | Precio de oferta, porcentaje |
| `--star` | `#FFA41C` | `36 100% 55%` | Valoraciones |
| `--success` | `#1F8A52` | `149 63% 33%` | Disponibilidad |
| `--muted-foreground` | `#565959` | `180 2% 34%` | Texto secundario |

Todas las combinaciones texto sobre fondo alcanzan al menos 4.5:1. `--link`
sobre blanco da 4.9:1.

`--radius` baja de `0.75rem` a `0.5rem`: 12px resulta demasiado redondeado
frente al lenguaje angular de Amazon. Se agrega `--radius-pill` para el CTA.

### Tipografía

Se conservan Plus Jakarta Sans y Public Sans, ya cargadas vía `next/font`. El
cambio es de uso: `globals.css` fuerza hoy `font-weight: 800` en todos los
encabezados. Amazon construye jerarquía por tamaño, no por peso. Los
encabezados pasan a `700` y se define una escala tipográfica en tokens que
reemplaza los valores sueltos tipo `text-[13.5px]` dispersos en los
componentes.

### Primitivos

`components.json` se crea a mano y los componentes se agregan con
`npx shadcn@latest add`. No se ejecuta `init`: la CLI v4 apunta a Tailwind v4 y
puede intentar migrar `tailwind.config.ts`, donde viven las extensiones
`navy`, `sage` y `brand`.

Primitivos: `button`, `input`, `label`, `badge`, `card`, `separator`,
`skeleton`, `sheet`, `dialog`, `dropdown-menu`, `select`, `checkbox`,
`radio-group`, `accordion`, `breadcrumb`, `tabs`, `tooltip`, `avatar`,
`pagination`.

Se agrega un componente propio, `<Price>`, que no existe en shadcn y consumen
el catálogo, la ficha de producto y el carrito. Formatea guaraníes, tacha el
precio anterior y calcula el porcentaje de descuento. `precioAnterior` es
opcional, de modo que el componente queda listo para el sub-proyecto #2 sin
romperse antes.

`<Rating>` queda fuera del #1 deliberadamente: sin la tabla de reseñas del #5
no tendría nada que renderizar.

### Modo oscuro

El catálogo público se sirve solo en modo claro, igual que la tienda de Amazon.
Esto reduce a la mitad la superficie de QA en la parte de mayor impacto
comercial. Dashboard y admin conservan el soporte existente vía `next-themes`.

### Archivos afectados

- `app/tokens.css` — paleta reescrita
- `app/globals.css` — escala tipográfica y peso de encabezados
- `tailwind.config.ts` — mapeo de tokens nuevos, conservando `navy`, `sage` y `brand`
- `components.json` — nuevo
- `components/ui/*` — primitivos generados
- `components/ui/price.tsx` — nuevo, propio

### Alcance explícitamente excluido

Este sub-proyecto no modifica el comportamiento de ningún componente existente.
`CatalogoPublico.tsx` sigue funcionando sin cambios porque usa hex inline; su
migración corresponde al sub-proyecto #3. El único efecto visible al terminar es
el cambio de fondo de verde salvia a gris frío.

### Verificación

- `npx tsc --noEmit` sin errores
- `npm run build` sin errores
- El catálogo público renderiza sin regresiones visuales más allá del fondo

---

## Sub-proyecto #2 — Migración de esquema

### Hallazgo previo

El repositorio no tenía infraestructura de migraciones: sin carpeta `supabase/`,
sin archivos `.sql`, sin CLI configurada. El esquema se venía aplicando a mano
desde el SQL Editor y `types/database.ts` se mantiene manualmente. Este
sub-proyecto establece la convención además de agregar las columnas. Ver
`supabase/migrations/README.md`.

### Columnas

| Columna | Tipo | Decisión |
|---|---|---|
| `precio_anterior` | `integer` nullable | Sin `CHECK` contra `precio`. Si queda menor o igual, `<Price>` no muestra el descuento. Un CHECK bloquearía al dueño mientras edita. |
| `stock` | `integer` nullable | NULL = el comercio no lleva control de stock; es el default de todos los productos existentes. `disponible` sigue siendo el interruptor maestro de compra. |
| `marca` | `text` nullable | Texto libre, no tabla propia: los planes van de 5 a 90 productos. El autocompletado sale de los valores ya cargados. |

Constraints de no-negatividad en `stock` y `precio_anterior`: a diferencia de la
comparación con `precio`, un valor negativo no es un estado intermedio de
edición legítimo.

Índice parcial `productos_comercio_marca_idx` sobre `(comercio_id, marca)` para
el filtro por marca del catálogo público.

### RLS

Agregar columnas a una tabla existente hereda las políticas vigentes; no hacen
falta políticas nuevas. La migración incluye al pie consultas contra `pg_class`
y `pg_policies` para verificar que RLS sigue activo.

### Limitación operativa

La migración no se puede aplicar desde el entorno de desarrollo: no hay
`.env.local` ni credenciales de Supabase. Debe ejecutarla el usuario en el SQL
Editor. Hasta entonces `types/database.ts` declara columnas que la base no
tiene, lo que compila pero falla en runtime al consultarlas. El sub-proyecto #3
no debe darse por terminado sin la migración aplicada.

---

## Sub-proyecto #3 — Catálogo comprador multi-página

### Rutas

| Ruta | Render | Propósito |
|---|---|---|
| `/c/[slug]` | Server | Listado con búsqueda, filtros y orden |
| `/c/[slug]/p/[id]` | Server | Ficha de producto con galería y caja de compra |
| `/c/[slug]/carrito` | Server + isla cliente | Carrito y envío por WhatsApp |

`layout.tsx` monta el header en las tres.

### Filtros en la URL

Búsqueda, categoría, marca, rango de precio, ofertas y orden viven en
`searchParams`, no en estado de React. El listado es Server Component y filtra
en el servidor.

Esto se eligió por tres razones: un filtro aplicado es una URL compartible por
WhatsApp, que es el canal del mercado; la grilla funciona sin JavaScript; y no
hace falta sincronizar estado con la barra de direcciones.

Los filtros se renderizan como enlaces, no como controles de formulario. En
pantallas chicas el mismo panel, ya renderizado en el servidor, se pasa como
`children` a un `Sheet` cliente, de modo que la lógica no se duplica.

### Filtrado en memoria

`filtrarProductos` opera sobre el array completo en vez de construir consultas a
Supabase. Los planes van de 5 a 90 productos y el catálogo ya se trae entero en
una consulta; filtrar en el servidor de aplicación evita un round-trip por cada
cambio de filtro. Si algún plan superara los pocos miles de productos habría que
revisar esta decisión.

Los tramos de precio se derivan del rango real del comercio en lugar de usar
cortes fijos: un kiosco y una mueblería no comparten escala.

### Separación de módulos

`lib/catalogo.ts` contiene sólo `getCatalogoPorSlug`, que importa el cliente
Supabase de servidor y por lo tanto `next/headers`. Toda la lógica pura
(filtros, orden, descuento, construcción de URLs) vive en `lib/productos.ts`,
sin imports de servidor, porque la consumen componentes cliente. Mezclarlas
rompe el build con "You're importing a component that needs next/headers".

`getCatalogoPorSlug` va envuelto en `cache()` de React para que el layout y la
página del mismo request compartan una sola consulta.

### Carrito

Pasó de `useState` local a un store de Zustand con persistencia en
`localStorage`, porque con páginas reales el estado tiene que sobrevivir a la
navegación. Se indexa por slug de comercio para que dos catálogos abiertos en el
mismo navegador no mezclen pedidos.

Todo lo que lee el carrito usa el hook `useMontado`: el servidor no puede
conocer `localStorage` y renderizarlo de entrada produce error de hidratación.

Al enviar el pedido, la URL de WhatsApp se arma **antes** de escribir en
`pedidos`. Si la escritura falla, el comprador igual puede mandar su mensaje: el
registro es métrica para el comercio, no un requisito de la compra.

### Accesibilidad

Objetivos táctiles de 44px vía el tamaño `touch` del botón, foco visible
heredado del #1, `aria-current` en filtros activos, `aria-live` en el contador
de cantidad, textos `sr-only` que desambiguan los botones repetidos de la grilla
("Agregar una unidad de X" en vez de sólo "+"), y `robots: noindex` en el
carrito.

### Estado de los campos del #2

La ficha y la tarjeta ya leen `precio_anterior`, `stock` y `marca`. Mientras la
migración no esté aplicada, esas consultas fallan en runtime. Ver la limitación
operativa del sub-proyecto #2.

### Eliminado

`components/catalogo/CatalogoPublico.tsx` (535 líneas) quedó sin referencias y
se borró. Su contenido está repartido en `CatalogoHeader`, `ProductoCard`,
`BotonAgregar`, `FiltrosPanel` y `CarritoContenido`.

---

## Sub-proyecto #4 — Dashboard

### Carga de los campos nuevos

`ProductoModal` incorpora `marca`, `precio_anterior` y `stock`.

El punto delicado es la validación numérica. `z.coerce.number()` convierte la
cadena vacía en `0`, lo que destruiría la distinción del sub-proyecto #2: en
`stock`, `0` significa "agotado" y `NULL` significa "no llevo control". Se
define `numeroOpcional` con `z.preprocess` para que el campo vacío llegue como
`null`.

El descuento se muestra en vivo mientras el dueño escribe. Si el precio anterior
no supera al precio, se avisa que no se mostrará oferta en lugar de bloquear el
guardado, en coherencia con la decisión de no poner `CHECK` en la base.

`marca` usa un `datalist` nativo alimentado por las marcas ya cargadas por el
comercio. Sin tabla de marcas, esto es lo que evita que "Coca-Cola" y "coca
cola" convivan como dos filtros distintos en el catálogo público.

### Rediseño

Los componentes del dashboard usaban `text-gray-*`, `bg-white` y hex en
atributos `style` inline. Se migraron a los tokens del sub-proyecto #1.

La única excepción deliberada es `QRClient`: el QR se genera en negro sobre
blanco porque el contraste máximo es requisito para que los lectores funcionen,
no una decisión estética. Queda documentado en el código.

`ProductoModal` pasó de un div posicionado a mano a `Dialog` de shadcn, con lo
que gana cierre por Escape, trampa de foco y rol de diálogo, que antes no
tenía.

### Defectos preexistentes corregidos

**Enlace roto.** El botón "Publicar producto" del nav lateral apuntaba a
`/dashboard/productos/nuevo`, ruta que no existe: sólo hay
`app/(dashboard)/dashboard/productos/page.tsx`. Daba 404. Ahora apunta a la
lista, donde vive el botón de alta.

**Condición ilegible en el control de límite de plan.** `ProductosClient` tenía
`if (!nuevoEstado === false && plan === "basico")`. La doble negación equivale a
`nuevoEstado === true`, así que funcionaba por accidente. Se reescribió como
`if (nuevoEstado && limiteProductos < ILIMITADO)`, que además corrige un segundo
problema: la condición original sólo miraba el plan `basico`, de modo que los
planes `pro` y `plus` no veían aplicado su límite al reactivar un producto.

### Fuera de alcance

Los paneles de `components/admin/` y la landing conservan sus colores
hardcodeados. Corresponden al sub-proyecto #6.

---

## Sub-proyecto #6 — Landing, panel admin y autenticación

Se incluyeron las cuatro páginas de `app/(auth)/` además de lo previsto: eran lo
único que quedaba fuera de los tokens y el usuario pidió toda la aplicación.

### Escala categórica

El panel admin usa color para codificar dos escalas: estado de comercio
(`active`, `pending_approval`, `blocked`, `blocked_unpaid`, `suspended`) y nivel
de plan. A diferencia del resto de la paleta, acá **el color es el dato**:
aplanarlo a un único token destruiría la distinción.

Se agregaron seis pares de tokens (`--cat-verde`, `--cat-ambar`, `--cat-rojo`,
`--cat-naranja`, `--cat-azul`, `--cat-violeta`, cada uno con su variante
`-fondo`), con valores propios para modo oscuro. El color siempre acompaña a una
etiqueta escrita: nunca informa por sí solo.

Los mapas de color estaban duplicados literalmente en cuatro archivos
(`app/admin/page.tsx`, `ComerciosAdminClient`, `SolicitudesAdminClient`,
`UsuariosAdminClient`), cada uno con su propia copia. Se centralizaron en
`components/admin/badges.tsx`, que exporta `EstadoBadge`, `SolicitudBadge`,
`PlanBadge` y el mapa `clasesCategoria`.

### Excepciones documentadas

Dos usos de color hex sobreviven a propósito:

- `QRClient`: el QR se genera negro sobre blanco porque el contraste máximo es
  requisito de los lectores, no una decisión estética.
- El SVG del logo de Google en `login`: son colores oficiales de marca.

Ambos están comentados en el código.

### Resultado

Cero clases de paleta Tailwind (`text-gray-*`, `bg-blue-*`, …) y cero hex
inline en `app/` y `components/`, salvo las dos excepciones anteriores.

### Riesgo introducido y corregido durante la migración

Reemplazar atributos `style` por `className` generó ocho elementos con dos
atributos `className`. En JSX eso no es un error de compilación: gana el último
y el primero se descarta en silencio, lo que habría borrado clases de layout. Se
detectaron por barrido con expresión regular y se fusionaron; los tres casos con
clase condicional se reescribieron con `cn()`. Un caso más grave: un `style={}`
quedó recibiendo un string de clases de Tailwind, que no habría aplicado nada.

---

## Sub-proyecto #5 — Reseñas y valoraciones

### Decisión sobre la verificación

El usuario optó por reseñas **anónimas con firma obligatoria**. Se deja
constancia de lo que eso implica: sin cuentas de comprador no existe
verificación de identidad. Cualquiera puede firmar con el nombre que quiera, y
una conexión nueva habilita una reseña nueva. El objetivo del diseño es
encarecer el abuso, no impedirlo, y comunicarle al comprador que las reseñas no
están verificadas.

### Alta por API route, no por RLS

La tabla `resenas` **no tiene policy de INSERT**. Las altas pasan por
`POST /api/resenas`, que usa la service role key. Dos razones: una policy de
insert pública es una puerta abierta a la inundación, y el rate limit necesita
la IP, que sólo existe del lado del servidor.

La route deriva `comercio_id` del `producto_id` en vez de aceptarlo del cliente:
un `comercio_id` recibido podría apuntar a otro tenant.

### Anti-abuso

- Índice único `(producto_id, ip_hash)`: una reseña por conexión y producto.
  Es el freno principal contra el review bombing de un producto puntual.
- Máximo de 5 reseñas por conexión y comercio en 24 horas.
- Campo trampa invisible; si viene relleno se responde 201 sin escribir nada,
  para no darle al bot la señal de que fue detectado.
- La IP se guarda como `sha256(ip + sal)`, nunca en crudo. La sal sale de
  `RESENAS_IP_SALT`, con `SUPABASE_SERVICE_ROLE_KEY` como respaldo para no
  sumar una variable de entorno obligatoria.

### Moderación configurable

`comercios.resenas_moderadas` decide si las reseñas nuevas se publican al
instante o esperan aprobación. El default es publicación inmediata, que es la
menor fricción y lo que se pidió. El dueño lo activa desde
`/dashboard/resenas` si empieza a recibir reseñas falsas o de la competencia.

Esto evita tener que elegir de antemano entre exposición al spam y fricción:
cada comercio decide según lo que le pase.

### Agregados desnormalizados

`productos.calificacion_promedio` y `productos.resenas_count` los mantiene un
trigger sobre `resenas`. Se desnormaliza a propósito: el catálogo público trae
todos los productos en una sola consulta y la grilla necesita mostrar
estrellas. Un join agregado obligaría a rehacer esa consulta y a paginar antes
de tiempo. El trigger también permite el orden "Mejor calificados".

En ese orden, los productos sin reseñas van al final y no al principio con un
promedio de 0.

### Accesibilidad

`<Rating>` rellena fracciones con un recorte por ancho en lugar de redondear,
para que 4.4 y 4.6 se distingan del número que los acompaña. El valor va además
en `title` y en texto para lectores de pantalla, porque la forma y el color no
se leen solos.

### Advertencia visible al comprador

La lista de reseñas dice explícitamente que son anónimas y que no verifican una
compra. Ocultarlo sería presentar como verificado algo que no lo es.
