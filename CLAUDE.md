# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build (standalone output)
npm run start    # Start production server
npm run lint     # ESLint via Next.js
npm run tokens   # Rebuild app/tokens.css from tokens/tokens.json
```

There are no tests in this project.

## Architecture

**CataloGo** is a Next.js 14 App Router SaaS that lets small businesses create digital catalogs, share them via a public URL, and receive orders through WhatsApp.

### Route groups

- `app/(auth)/` — login, registro, recuperar, actualizar-password (unauthenticated)
- `app/(dashboard)/` — protected dashboard; layout fetches the `comercio` from Firestore and redirects to `/registro` if none exists
- `app/c/[slug]/` — public catalog viewer, server-rendered, no auth
- `app/api/` — session management, QR generation, subscriptions, MercadoPago webhook

### Authentication flow

Firebase Auth is used for identity, but sessions are managed via an HttpOnly cookie (`__session`):

1. Client calls `signInWithEmailAndPassword` (Firebase client SDK)
2. Gets an `idToken` and POSTs it to `/api/auth/session`
3. Server creates a Firebase session cookie (5-day TTL) and sets it as `__session`
4. `middleware.ts` verifies `__session` on every request using `adminAuth.verifySessionCookie`

Two Firebase SDK entry points:
- `lib/firebase/client.ts` — client-side (`auth`, `db`, `storage`)
- `lib/firebase/admin.ts` — server-side (`adminAuth`, `adminDb`, `adminStorage`). Also exports `getServerUser()`, `fromDoc<T>()`, and `fromDocs<T>()` which convert Firestore snapshots to typed objects (Timestamps → ISO strings)

### Firestore data model

Collections: `comercios` → `catalogos` → `categorias` + `productos`. Also `pedidos` and `suscripciones`.

- Each `comercio` belongs to one Firebase `user_id` and has a unique `slug` (the public URL key)
- `categorias` and `productos` are children of a `catalogo`
- `pedidos` are created publicly (no auth) by catalog visitors
- `suscripciones` are written only by the MercadoPago webhook (Firestore rules deny client writes)

### Plans and limits

Defined in `types/database.ts` (`PLAN_LIMITES`):
- `basico`: 30 products, 1 catalog
- `pro`: unlimited products, 3 catalogs
- `business`: unlimited everything

### Firestore security rules

`firestore.rules` enforces ownership via the `esDueno(comercioId)` helper function that checks `user_id` matches the authenticated user. Public reads require `activo == true` (comercios/catalogos) or `disponible == true` (productos).

### Environment variables

Client (public):
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Server only:
```
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY        # newlines as \n
MERCADOPAGO_ACCESS_TOKEN
```

On Cloud Run, admin SDK uses Application Default Credentials (no `FIREBASE_PRIVATE_KEY` needed).

### Deployment

Built as `output: "standalone"` for Docker/Cloud Run. Container runs on port 8080. Images from `firebasestorage.googleapis.com` are whitelisted in `next.config.mjs`.

### Known migration artifacts

The codebase was migrated from Supabase to Firebase. `lib/planes.ts` and `app/api/webhooks/mercadopago/route.ts` still reference Supabase clients and are not yet updated. The Dockerfile also has stale Supabase build args.
