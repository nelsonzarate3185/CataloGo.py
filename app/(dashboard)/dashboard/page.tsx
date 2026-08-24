import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { baseUrlServidor, urlCatalogo } from "@/lib/urls";
import Link from "next/link";
import { AlertTriangle, Package, ShoppingBag, Star, TrendingUp, ExternalLink } from "lucide-react";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import { PLAN_LIMITES } from "@/types/database";
import { cn, formatGS } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comercio } = await supabase
    .from("comercios")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!comercio) redirect("/registro");

  const { data: catalogo } = await supabase
    .from("catalogos")
    .select("id")
    .eq("comercio_id", comercio.id)
    .eq("activo", true)
    .limit(1)
    .single();

  const ahora = new Date();
  const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const hoy = new Date(ahora.setHours(0, 0, 0, 0)).toISOString();

  const inicioSemana = new Date(ahora);
  inicioSemana.setDate(inicioSemana.getDate() - 6);
  inicioSemana.setHours(0, 0, 0, 0);

  const [productosRes, pedidosRes, pedidosHoyRes, pedidosRecientesRes, pedidosSemanaRes] = await Promise.all([
    supabase
      .from("productos")
      .select("id", { count: "exact", head: true })
      .eq("comercio_id", comercio.id)
      .eq("disponible", true),
    supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("comercio_id", comercio.id)
      .gte("created_at", hace30Dias),
    supabase
      .from("pedidos")
      .select("total", { count: "exact" })
      .eq("comercio_id", comercio.id)
      .gte("created_at", hoy),
    supabase
      .from("pedidos")
      .select("id, created_at, total, nombre_cliente")
      .eq("comercio_id", comercio.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("pedidos")
      .select("created_at, total")
      .eq("comercio_id", comercio.id)
      .gte("created_at", inicioSemana.toISOString()),
  ]);

  const totalProductos = productosRes.count ?? 0;
  const totalPedidos = pedidosRes.count ?? 0;
  const pedidosHoy = pedidosHoyRes.count ?? 0;
  const ventasHoy = (pedidosHoyRes.data ?? []).reduce((s, p) => s + (p.total ?? 0), 0);
  const limiteProductos = PLAN_LIMITES[comercio.plan].productos;

  const DIAS_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(inicioSemana);
    fecha.setDate(fecha.getDate() + i);
    const dayStr = fecha.toISOString().slice(0, 10);
    const ventas = (pedidosSemanaRes.data ?? [])
      .filter((p) => p.created_at.slice(0, 10) === dayStr)
      .reduce((s, p) => s + (p.total ?? 0), 0);
    return { label: DIAS_LABELS[fecha.getDay()], total: ventas, isToday: i === 6 };
  });
  const totalVentasSemana = diasSemana.reduce((s, d) => s + d.total, 0);
  const maxVentaDia = Math.max(...diasSemana.map((d) => d.total), 1);
  const porcentajeUso =
    limiteProductos === Infinity ? 0 : (totalProductos / limiteProductos) * 100;
  const reqHeaders = await headers();
  const appUrl = baseUrlServidor(reqHeaders);
  const catalogoUrl = urlCatalogo(appUrl, comercio.slug);

  const fechaHoy = new Date().toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const metrics = [
    {
      label: "Ventas de hoy",
      value: ventasHoy > 0 ? formatGS(ventasHoy) : "Gs. 0",
      delta: `${pedidosHoy} pedido${pedidosHoy !== 1 ? "s" : ""} hoy`,
      icon: TrendingUp,
      color: "text-brand-green",
    },
    {
      label: "Pedidos (30 días)",
      value: String(totalPedidos),
      delta: "últimos 30 días",
      icon: ShoppingBag,
      color: "text-brand-blue",
      href: "/dashboard/pedidos",
    },
    {
      label: "Productos activos",
      value: String(totalProductos),
      delta: limiteProductos === Infinity ? "ilimitados" : `de ${limiteProductos} del plan`,
      icon: Package,
      color: "text-primary",
      href: "/dashboard/productos",
    },
    {
      label: "Plan actual",
      value: comercio.plan.charAt(0).toUpperCase() + comercio.plan.slice(1),
      delta: "Ver mis planes",
      icon: Star,
      color: "text-destructive",
      href: "/dashboard/configuracion#plan",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-extrabold text-foreground sm:text-2xl">
            Buen día, {comercio.nombre} 👋
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1 capitalize">
            Resumen de tu tienda — {fechaHoy}
          </p>
        </div>
        {catalogo && (
          <Link
            href={`/c/${comercio.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-[9px] bg-white border border-sage-300 text-[13.5px] font-bold text-foreground hover:border-primary transition-colors shadow-card"
          >
            Ver mi tienda pública
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Banner upgrade */}
      {comercio.plan === "basico" && porcentajeUso >= 80 && (
        <div className="mb-5 flex items-start gap-3 bg-cat-ambar-fondo border border-cat-ambar/30 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-cat-ambar shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-cat-ambar">
              Usás {totalProductos} de {limiteProductos} productos del plan gratuito
            </p>
            <p className="text-xs text-cat-ambar mt-0.5">
              Pasate al Plan Pro para productos ilimitados.
            </p>
          </div>
          <Link
            href="/dashboard/configuracion#plan"
            className="shrink-0 text-xs font-bold text-cat-ambar underline"
          >
            Ver planes
          </Link>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {metrics.map(({ label, value, delta, icon: Icon, color, href }) => {
          const card = (
            <div className="bg-white rounded-[14px] p-[18px] shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] text-muted-foreground font-semibold">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="font-heading text-[26px] font-extrabold text-foreground my-1">
                {value}
              </div>
              <div className={`text-[12.5px] font-bold ${color}`}>{delta}</div>
            </div>
          );
          return href ? (
            <Link key={label} href={href} className="hover:scale-[1.01] transition-transform">
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </div>

      {/* Gráfico semanal + pedidos recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Ventas de la semana — gráfico de barras */}
        <div className="bg-white rounded-[14px] p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-[16px] font-extrabold text-foreground">
              Ventas de la semana
            </h3>
            <span className="text-[13px] text-muted-foreground">
              Total: {formatGS(totalVentasSemana)}
            </span>
          </div>
          <div className="flex items-end gap-2 h-[160px] pt-2">
            {diasSemana.map(({ label, total, isToday }) => {
              const heightPx = maxVentaDia > 0 ? Math.max((total / maxVentaDia) * 140, total > 0 ? 6 : 3) : 3;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-[6px] transition-all"
                    style={{
                      height: `${heightPx}px`,
                      background: isToday ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    }}
                  />
                  <span
                    className={cn(
                      "text-2xs font-semibold",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Link catálogo debajo del gráfico */}
          {catalogo && (
            <div className="mt-4 pt-4 border-t border-sage-200">
              <p className="text-[12px] text-muted-foreground mb-1.5">Link de tu tienda</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {catalogoUrl}
                </code>
                <CopyLinkButton url={catalogoUrl} />
              </div>
              {limiteProductos !== Infinity && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{totalProductos} de {limiteProductos} productos</span>
                    <span>{Math.round(porcentajeUso)}%</span>
                  </div>
                  <div className="h-1.5 bg-sage-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pedidos recientes */}
        <div className="bg-white rounded-[14px] p-5 shadow-card">
          <h3 className="font-heading text-[16px] font-extrabold text-foreground mb-4">
            Pedidos recientes
          </h3>
          {(pedidosRecientesRes.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aún no recibiste pedidos.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {(pedidosRecientesRes.data ?? []).map((pedido) => (
                <div
                  key={pedido.id}
                  className="flex items-center justify-between py-[11px]"
                >
                  <div>
                    <p className="text-[14px] font-bold text-foreground">
                      {pedido.nombre_cliente ?? "Cliente"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{pedido.id.slice(0, 8)} ·{" "}
                      {new Date(pedido.created_at).toLocaleDateString("es-PY")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-bold text-foreground">
                      {pedido.total ? formatGS(pedido.total) : "—"}
                    </p>
                    <span
                      className="text-[11.5px] font-bold text-success"
                    >
                      Recibido
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/dashboard/pedidos"
            className="block mt-3 text-center text-[13px] font-semibold hover:underline text-link"
          >
            Ver todos los pedidos ›
          </Link>
        </div>
      </div>
    </div>
  );
}

