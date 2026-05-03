import Link from "next/link";
import { ArrowRight, QrCode, ShoppingCart, MessageCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-xl font-bold text-primary">CataloGo</span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Tu catálogo digital, listo en minutos
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Mostrá tus productos con precios en guaraníes, compartí por link o QR
          y recibí los pedidos directo en tu WhatsApp — sin comisiones.
        </p>
        <Link
          href="/registro"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 text-lg"
        >
          Crear mi catálogo gratis
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <ShoppingCart className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Catálogo organizado
            </h3>
            <p className="text-sm text-gray-600">
              Productos con foto, precio en Gs. y categorías. Tus clientes
              encuentran lo que buscan fácil.
            </p>
          </div>
          <div className="text-center p-6">
            <QrCode className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Link y QR listos
            </h3>
            <p className="text-sm text-gray-600">
              Compartí tu catálogo por link o imprimí el código QR para tu
              local.
            </p>
          </div>
          <div className="text-center p-6">
            <MessageCircle className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Pedidos por WhatsApp
            </h3>
            <p className="text-sm text-gray-600">
              El cliente elige, presiona &quot;Pedir&quot; y te llega el pedido
              formateado en WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Planes simples, en guaraníes
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Básico",
              price: "Gratis",
              features: ["Hasta 30 productos", "1 catálogo", "Link y QR"],
            },
            {
              name: "Pro",
              price: "Gs. 120.000/mes",
              features: [
                "Productos ilimitados",
                "3 catálogos",
                "Estadísticas",
              ],
              highlight: true,
            },
            {
              name: "Business",
              price: "Gs. 280.000/mes",
              features: [
                "Todo lo de Pro",
                "Dominio propio",
                "Sucursales ilimitadas",
              ],
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`p-6 rounded-xl border-2 ${
                plan.highlight
                  ? "border-primary bg-primary/5"
                  : "border-gray-200"
              }`}
            >
              <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
              <p className="text-2xl font-bold text-primary mt-2 mb-4">
                {plan.price}
              </p>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-primary">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
