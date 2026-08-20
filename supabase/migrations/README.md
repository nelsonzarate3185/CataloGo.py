# Migraciones

Hasta el rediseño de agosto de 2026 el esquema se aplicaba a mano desde el SQL
Editor de Supabase y no quedaba registro en el repositorio. Esta carpeta existe
para que cada cambio de esquema quede versionado junto al código que lo consume.

## Convención

Un archivo por migración, nombrado `YYYYMMDDHHMMSS_descripcion_en_snake_case.sql`.
Es el formato que espera la CLI de Supabase, de modo que si más adelante se
adopta `supabase db push` los archivos ya sirven sin renombrar.

Cada migración debe:

- Ser **idempotente** (`if not exists`, guardas `do $$ ... end $$` para
  constraints). Se corren a mano y es fácil correr una dos veces.
- Ir envuelta en `begin; ... commit;`.
- Documentar en comentarios *por qué* se toma cada decisión, no sólo qué hace.
- Incluir al final, comentadas, las consultas de verificación posterior.

## Cómo aplicar una migración

No hay CLI de Supabase configurada en el proyecto. El procedimiento actual es:

1. Abrir el SQL Editor del proyecto en Supabase.
2. Pegar el contenido del archivo y ejecutarlo.
3. Correr las consultas de verificación del pie del archivo y revisar la salida.
4. Actualizar `types/database.ts` con las columnas nuevas si todavía no lo está.

El paso 4 no es opcional: `types/database.ts` se mantiene a mano y es la única
fuente de tipos del cliente de Supabase. Si el tipo declara una columna que la
base no tiene, TypeScript compila y la aplicación falla en runtime.

## Estado

| Migración | Aplicada en producción |
|---|---|
| `20260820000000_productos_precio_anterior_stock_marca.sql` | ⬜ pendiente |

Marcar la casilla al aplicarla.
