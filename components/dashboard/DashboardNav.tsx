"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingBag,
  QrCode,
  Settings,
  LogOut,
  ExternalLink,
  Plus,
  MapPin,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { PlanTipo } from "@/types/database";

const navItems = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/productos", label: "Mis productos", icon: Package },
  { href: "/dashboard/categorias", label: "Categorías", icon: Tag },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/dashboard/qr", label: "Mi QR", icon: QrCode },
  { href: "/dashboard/configuracion", label: "Mi tienda", icon: Settings },
];

interface Props {
  comercioNombre: string;
  comercioSlug: string;
  comercioPlan: PlanTipo;
  isSuperAdmin?: boolean;
}

const claseItem =
  "flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-semibold transition-colors";

export default function DashboardNav({
  comercioNombre,
  comercioSlug,
  comercioPlan,
  isSuperAdmin,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="flex min-h-screen w-[230px] shrink-0 flex-col bg-nav text-nav-foreground/80">
      <div className="px-5 pb-5 pt-6">
        <p className="flex items-baseline gap-px">
          <span className="font-heading text-lg font-bold text-white">Catalo</span>
          <span className="font-heading text-lg font-bold text-primary">Go</span>
          <span className="ml-1 text-2xs font-bold text-white/50">Vendedores</span>
        </p>
        <p className="mt-1 truncate text-xs text-white/60">{comercioNombre}</p>
      </div>

      <nav aria-label="Panel del comercio" className="flex-1 space-y-0.5 px-3">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                claseItem,
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-nav-sub hover:text-white"
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}

        {comercioPlan === "business" && (
          <Link
            href="/dashboard/sucursales"
            aria-current={isActive("/dashboard/sucursales") ? "page" : undefined}
            className={cn(
              claseItem,
              isActive("/dashboard/sucursales")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-nav-sub hover:text-white"
            )}
          >
            <MapPin className="size-[18px] shrink-0" aria-hidden="true" />
            Sucursales
          </Link>
        )}

        {isSuperAdmin && (
          <Link
            href="/admin"
            aria-current={isActive("/admin") ? "page" : undefined}
            className={cn(
              claseItem,
              "mt-2 border border-primary/40",
              isActive("/admin")
                ? "bg-primary text-primary-foreground"
                : "text-primary hover:bg-primary/10"
            )}
          >
            <Shield className="size-[18px] shrink-0" aria-hidden="true" />
            Consola Admin
          </Link>
        )}
      </nav>

      <div className="mt-4 space-y-1 border-t border-nav-sub px-3 pb-6 pt-4">
        <Link
          href={`/c/${comercioSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(claseItem, "hover:bg-nav-sub hover:text-white")}
        >
          <ExternalLink className="size-[18px] shrink-0" aria-hidden="true" />
          Ver mi tienda pública
        </Link>

        <button
          onClick={handleLogout}
          className={cn(claseItem, "w-full hover:bg-nav-sub hover:text-white")}
        >
          <LogOut className="size-[18px] shrink-0" aria-hidden="true" />
          Cerrar sesión
        </button>

        {/* Apunta a la lista, donde vive el botón de alta: no existe una ruta
            /dashboard/productos/nuevo. */}
        <Link
          href="/dashboard/productos"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-nav-sub py-2.5 text-sm font-bold text-white transition-colors hover:bg-nav-sub/80"
        >
          <Plus className="size-4" aria-hidden="true" />
          Publicar producto
        </Link>
      </div>
    </aside>
  );
}
