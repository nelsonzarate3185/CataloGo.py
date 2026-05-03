import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nombre = user?.user_metadata?.nombre ?? user?.email ?? "Comerciante";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Hola, {nombre}
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Bienvenido a tu panel de CataloGo
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Productos", value: "0", href: "/dashboard/productos" },
          { label: "Catálogos", value: "0", href: "/dashboard/catalogos" },
          { label: "Pedidos hoy", value: "0", href: "/dashboard/pedidos" },
        ].map((stat) => (
          <a
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border p-5 hover:border-primary transition-colors"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {stat.value}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
