# CataloGo — Master Prompt para Claude Code

> Coloca este archivo como `CLAUDE.md` en la raíz del repositorio.

---

## 🧠 Contexto del Proyecto

**CataloGo** (`catalogopy.com`) es una plataforma SaaS B2B para pequeñas y medianas empresas paraguayas.  
Permite crear catálogos digitales de productos con pedidos vía WhatsApp, pensado para el mercado local donde WhatsApp es el canal comercial dominante.

**Estado actual:** Versión 2 en desarrollo activo.  
**Deploy:** Vercel (producción automática desde `main`).  
**Repo:** `https://github.com/nelsonzarate3185/CataloGo.py`

---

## 🏗️ Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript — modo `strict` siempre |
| Estilos | Tailwind CSS |
| Componentes | shadcn/ui |
| Auth | Supabase Auth (Google OAuth) |
| Base de datos | Supabase (PostgreSQL) |
| Imágenes | Supabase Storage (buckets `productos` y `logos`) |
| Pagos | Manuales, registrados por el superadmin |
| Deploy | Vercel |
| ORM / Queries | Supabase JS Client (sin Prisma) |

---

## 🗂️ Estructura de Carpetas (App Router)

```
/app
  /[tenant]          → catálogo público del negocio
  /dashboard         → panel del dueño del negocio
  /admin             → superadmin (solo rol superadmin)
  /api               → API routes de Next.js
/components
  /ui                → shadcn/ui primitives (no modificar)
  /catalog           → componentes del catálogo público
  /dashboard         → componentes del panel de negocio
  /admin             → componentes del superadmin
/lib
  /supabase          → cliente Supabase (server / client / middleware)
  /cloudinary        → helpers de upload
  /mercadopago       → helpers de pago
  /utils             → utilidades generales
/types               → tipos TypeScript globales
/hooks               → custom hooks de React
```

---

## 👥 Roles y Modelo de Acceso

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `superadmin` | Equipo de CataloGo | Panel `/admin`, aprueba planes, gestiona todos los negocios |
| `owner` | Dueño del negocio cliente | Panel `/dashboard`, gestiona su catálogo y productos |
| `viewer` | Cliente final | Solo vista pública del catálogo (`/[tenant]`), sin login |

**Regla crítica:** Nunca exponer datos de un tenant a otro. Siempre validar `business_id` en queries de Supabase. Usar RLS (Row Level Security) en todas las tablas.

---

## 🗄️ Esquema de Base de Datos (Tablas Principales)

```sql
businesses       → negocios registrados (tenant principal)
  id, owner_id, slug, name, plan_id, status, cloudinary_folder, ...

plans            → planes de suscripción
  id, name, max_products, max_categories, price_pyg, ...

plan_requests    → workflow de aprobación de planes
  id, business_id, plan_id, status (pending|approved|rejected), ...

categories       → categorías de productos por negocio
  id, business_id, name, position, ...

products         → productos del catálogo
  id, business_id, category_id, name, price, image_url, active, ...

orders           → pedidos generados vía WhatsApp
  id, business_id, items_json, customer_name, status, ...
```

---

## ✅ Convenciones de Código

### TypeScript
- Siempre `strict: true` — sin `any`, sin `as unknown`
- Preferir `type` sobre `interface` para modelos de datos
- Exportar tipos desde `/types/index.ts`
- Usar discriminated unions para estados complejos

### React / Next.js
- Componentes server-side por defecto; `"use client"` solo cuando sea necesario (interactividad, hooks de estado)
- Usar `React.FC` con tipado explícito de props
- Formularios con `react-hook-form` + `zod` para validación
- Fetching en Server Components con `async/await` directo
- Mutations con Server Actions o API Routes (no mezclar)

### Supabase
- Cliente server: `createServerComponentClient` (cookies de Next.js)
- Cliente client: `createClientComponentClient`
- **Siempre** encadenar `.eq('business_id', businessId)` en queries de datos de tenant
- Manejar errores de Supabase con el patrón `{ data, error }` — nunca ignorar `error`

```typescript
// Patrón correcto
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('business_id', businessId)
  .order('position')

if (error) throw new Error(`Error fetching products: ${error.message}`)
```

### Tailwind / shadcn
- Usar variantes de shadcn antes de crear componentes custom
- Mobile-first en todos los estilos
- Paleta de colores definida en `tailwind.config.ts` — no hardcodear colores hex
- Clases de Tailwind en orden: layout → spacing → typography → colors → effects

### Imágenes (Supabase Storage)
- Productos en el bucket `productos`, ruta `{comercio_id}/{producto_id}.ext`
- Logos en el bucket `logos`, ruta `{comercio_id}/logo.ext`
- **Siempre** pasar por `reducirImagen()` de `lib/imagenes.ts` antes de subir:
  reduce a 1200px (400px los logos) y convierte a WebP en el navegador. Sin
  eso se suben fotos de varios MB que el comprador después descarga.

---

## 🚀 Flujos de Negocio Clave

### 1. Onboarding de nuevo negocio
```
Registro (Google OAuth) → Crear business record → Seleccionar plan → 
plan_request (status: pending) → Superadmin aprueba → Plan activo → 
Dashboard habilitado
```

### 2. Gestión de catálogo
```
Owner crea categoría → Agrega productos (imagen a Supabase Storage) → 
Define precio en PYG → Activa/desactiva productos → 
Catálogo público disponible en /{slug}
```

### 3. Pedido vía WhatsApp
```
Cliente visita /{slug} → Selecciona productos → 
Genera mensaje de WhatsApp pre-armado → Envía al número del negocio → 
Owner gestiona pedido manualmente (o via panel)
```

### 4. Flujo de cobro (manual)
```
Comerciante solicita plan → plan_request (pending) → superadmin aprueba →
plan activo → el comerciante transfiere → el superadmin registra el pago en
/admin/cobros → un trigger actualiza comercios.plan_expira_at
```
No hay pasarela de pago. MercadoPago se removió en `c736ff2` y su webhook se
eliminó por ser código muerto con privilegios de service role.

---

## 🔐 Variables de Entorno

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # Solo en server-side

# App — obligatoria: fija el dominio de los QR y de los correos de recuperación
NEXT_PUBLIC_APP_URL=https://catalogo-orcin-nu.vercel.app

# Opcional: sal para hashear IPs en el rate limit de reseñas
RESENAS_IP_SALT=
```

**Regla:** Nunca exponer variables sin `NEXT_PUBLIC_` en el cliente.

---

## 🧪 Testing y Calidad

- Antes de cualquier cambio en flows de auth o pago: revisar que no se rompa el middleware de Supabase
- Para cambios en RLS: probar con usuario `owner` que no puede ver datos de otro tenant
- Linting: `eslint` + `prettier` antes de commit
- Builds: `next build` debe pasar sin errores de TypeScript

---

## 📋 Tareas Frecuentes (Quick Reference)

### Agregar una nueva feature al dashboard
1. Crear la Server Action o API route en `/app/api/` o `/app/dashboard/`
2. Crear el componente en `/components/dashboard/`
3. Validar con Zod el input
4. Proteger con check de `business_id` del usuario autenticado
5. Actualizar tipos en `/types/`

### Agregar campo a una tabla existente
1. Escribir la migration SQL en `supabase/migrations/`, idempotente
2. Actualizar el tipo TypeScript correspondiente
3. Actualizar RLS policies si aplica
4. Actualizar los queries afectados
5. **Si la columna es de `comercios` y la necesita el catálogo público:**
   agregar `grant select (columna) on public.comercios to anon;` en la misma
   migración, y sumarla a la función `comercio_publico`. El permiso de `anon`
   enumera columnas: una nueva no se hereda, y el catálogo falla con un error
   que no dice qué columna falta.

### Nuevo componente UI
1. Verificar si existe variante en shadcn/ui primero
2. Si es custom: crear en `/components/` con nombre descriptivo
3. Props tipadas explícitamente, sin `any`
4. Mobile-first

---

## 🚫 Lo que NO hacer

- No usar `useEffect` para data fetching — usar Server Components
- No subir imágenes sin pasarlas por `reducirImagen()` — se suben de varios MB
- No mezclar lógica de roles `superadmin` y `owner` en el mismo componente
- No hardcodear el número de WhatsApp — leer de `businesses.whatsapp_number`
- No hacer queries sin filtrar por `business_id` en tablas de tenant
- No exponer `SUPABASE_SERVICE_ROLE_KEY` en cliente
- No crear migraciones destructivas sin backup
- No usar `console.log` en producción — usar logger o eliminar
- No confiar en validaciones sólo del cliente para reglas de negocio: los
  límites de plan se aplican con un trigger en la base, porque el cliente es
  evitable desde la consola del navegador
- No leer `comercios` con el cliente de sesión desde vistas públicas: su
  política de lectura pública es `to anon`, así que un usuario autenticado que
  no sea el dueño no ve la fila. Usar la función `comercio_publico(slug)`

---

## 💡 Contexto de Mercado (Paraguay)

- Moneda: PYG (Guaraní) — precios siempre en PYG, sin decimales
- WhatsApp es el canal de ventas dominante para PyMEs paraguayas
- Conectividad mobile-first — optimizar para 4G, no asumir fibra
- MercadoPago es el gateway más usado localmente, pero CataloGo hoy cobra a mano (ver flujo de cobro)
- Usuarios no técnicos: UX debe ser extremadamente simple

---

## 🗣️ Instrucciones para Claude Code

1. **Idioma:** Responder siempre en español
2. **Antes de implementar:** Confirmar el enfoque si hay ambigüedad en el requerimiento
3. **Cambios de esquema:** Siempre generar el SQL de migration + actualizar tipos TS
4. **Seguridad primero:** Cualquier endpoint nuevo debe validar sesión y `business_id`
5. **No inventar:** Si falta contexto (ej: nombre exacto de una tabla), preguntar antes de asumir
6. **Commits:** Mensajes en español, formato `feat:`, `fix:`, `chore:`, `refactor:`
7. **Plan Mode:** Para features grandes (>3 archivos), presentar plan antes de ejecutar
8. **RLS siempre:** Toda tabla nueva necesita RLS policy desde el primer día
