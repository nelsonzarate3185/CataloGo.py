import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight, QrCode, ShoppingCart, MessageCircle, Star } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Navbar */}
      <nav className="bg-nav">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-[2px]">
            <span className="font-heading text-[22px] text-white">Catalo</span>
            <span className="font-heading text-[22px] text-primary">Go</span>
            <span className="text-[11px] text-white/50 font-bold ml-1">.py</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-[13.5px] font-semibold text-white/75 hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="px-4 py-2 text-[13.5px] font-extrabold rounded-[8px] transition-colors bg-primary text-primary-foreground"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-14">
        <div
          className="relative rounded-[14px] overflow-hidden px-10 py-14 bg-gradient-to-br from-nav via-nav-sub to-link"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 14px, rgba(255,255,255,0) 14px 28px)",
            }}
          />
          <div className="relative max-w-xl">
            <div
              className="inline-block px-3 py-1.5 rounded-full text-[12px] font-extrabold tracking-widest uppercase mb-5 bg-primary text-primary-foreground"
            >
              Para emprendedores paraguayos
            </div>
            <h1 className="font-heading text-[40px] leading-[1.08] font-extrabold text-white mb-4">
              Tu catálogo digital,<br />listo en minutos
            </h1>
            <p className="text-[16px] text-white/80 mb-7 max-w-md">
              Mostrá tus productos en guaraníes, compartí por link o QR y recibí los pedidos directo en tu WhatsApp — sin comisiones.
            </p>
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[10px] font-extrabold text-[15px] transition-opacity hover:opacity-90 bg-primary text-primary-foreground"
            >
              Crear mi catálogo gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-14">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: ShoppingCart,
              title: "Catálogo organizado",
              desc: "Productos con foto, precio en Gs. y categorías. Tus clientes encuentran lo que buscan fácil.",
              bg: "bg-cat-verde-fondo",
              iconColor: "text-cat-verde",
            },
            {
              icon: QrCode,
              title: "Link y QR listos",
              desc: "Compartí tu catálogo por link o imprimí el código QR para tu local o puesto.",
              bg: "bg-cat-azul-fondo",
              iconColor: "text-cat-azul",
            },
            {
              icon: MessageCircle,
              title: "Pedidos por WhatsApp",
              desc: "El cliente elige, presiona \"Pedir\" y te llega el pedido formateado en WhatsApp.",
              bg: "bg-cat-naranja-fondo",
              iconColor: "text-cat-naranja",
            },
          ].map(({ icon: Icon, title, desc, bg, iconColor }) => (
            <div
              key={title}
              className="bg-card rounded-[14px] p-6 shadow-card"
            >
              <div
                className={cn("mb-4 flex size-12 items-center justify-center rounded-lg", bg)}
              >
                <Icon className={cn("size-6", iconColor)} aria-hidden="true" />
              </div>
              <h3 className="font-heading text-[17px] font-extrabold text-foreground mb-2">{title}</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Planes */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="font-heading text-[28px] font-extrabold text-center text-foreground mb-10">
          Planes simples, en guaraníes
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              name: "Básico",
              price: "Gratis",
              sub: "Siempre gratis",
              features: ["5 productos", "1 catálogo", "1 imagen por producto", "Link y código QR"],
              cta: "Empezar gratis",
              highlight: false,
            },
            {
              name: "Pro",
              price: `Gs. ${new Intl.NumberFormat("es-PY").format(30000)}`,
              sub: "por mes",
              features: ["30 productos", "2 catálogos", "3 imágenes por producto", "Link y código QR"],
              cta: "Empezar",
              highlight: false,
            },
            {
              name: "Plus",
              price: `Gs. ${new Intl.NumberFormat("es-PY").format(120000)}`,
              sub: "por mes",
              features: ["90 productos", "3 catálogos", "3 imágenes por producto", "Estadísticas"],
              cta: "Empezar",
              highlight: true,
            },
            {
              name: "Business",
              price: `Gs. ${new Intl.NumberFormat("es-PY").format(200000)}`,
              sub: "por mes",
              features: ["Productos ilimitados", "Catálogos ilimitados", "5 imágenes/producto", "Hasta 5 sucursales"],
              cta: "Contactar",
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-lg bg-card p-6 shadow-card",
                plan.highlight && "outline outline-2 outline-primary"
              )}
            >
              {plan.highlight && (
                <div className="flex items-center gap-1.5 mb-3">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                  <span className="text-[11.5px] font-extrabold text-primary uppercase tracking-wider">
                    Más popular
                  </span>
                </div>
              )}
              <h3 className="font-heading text-[20px] font-extrabold text-foreground">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="font-heading text-[22px] font-extrabold text-foreground">{plan.price}</span>
                <span className="text-[13px] text-muted-foreground ml-1">{plan.sub}</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="text-[14px] text-muted-foreground flex gap-2">
                    <span className="text-brand-green font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/registro"
                className={cn(
                  "block rounded-pill py-3 text-center text-base font-extrabold transition-opacity hover:opacity-90",
                  plan.highlight
                    ? "bg-primary text-primary-foreground"
                    : "bg-nav-sub text-white"
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-nav">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-[2px]">
            <span className="font-heading text-[18px] text-white">Catalo</span>
            <span className="font-heading text-[18px] text-primary">Go</span>
            <span className="text-[10px] text-white/50 font-bold ml-1">.py</span>
          </div>
          <p className="text-[13px] text-white/60">
            © {new Date().getFullYear()} CataloGo — Para emprendedores del Paraguay
          </p>
          <div className="flex gap-4">
            <Link href="/login" className="text-[13px] text-white/70 hover:text-white transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="text-[13px] text-white/70 hover:text-white transition-colors">
              Registrarse
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
