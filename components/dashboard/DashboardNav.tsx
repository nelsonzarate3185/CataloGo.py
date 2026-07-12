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

export default function DashboardNav({ comercioNombre, comercioSlug, comercioPlan, isSuperAdmin }: Props) {
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
    <aside className="w-[230px] bg-navy-950 text-[#c5d0db] flex flex-col min-h-screen shrink-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-baseline gap-[2px]">
          <span className="font-heading text-[19px] text-white">Catalo</span>
          <span className="font-heading text-[19px] text-primary">Go</span>
          <span className="text-[11px] text-[#8aa0b6] font-bold ml-1">Vendedores</span>
        </div>
        <p className="text-[12px] text-[#7a8694] mt-1 truncate">{comercioNombre}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-[11px] px-3 py-[10px] rounded-[9px] text-[14px] font-semibold transition-colors",
                active
                  ? "bg-primary text-navy-950"
                  : "text-[#c5d0db] hover:bg-navy-800"
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
              {label}
            </Link>
          );
        })}

        {comercioPlan === "business" && (
          <Link
            href="/dashboard/sucursales"
            className={cn(
              "flex items-center gap-[11px] px-3 py-[10px] rounded-[9px] text-[14px] font-semibold transition-colors",
              isActive("/dashboard/sucursales")
                ? "bg-primary text-navy-950"
                : "text-[#c5d0db] hover:bg-navy-800"
            )}
          >
            <MapPin className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
            Sucursales
          </Link>
        )}

        {isSuperAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-[11px] px-3 py-[10px] rounded-[9px] text-[14px] font-semibold transition-colors mt-2 border border-orange-500/30",
              isActive("/admin")
                ? "bg-orange-500 text-white"
                : "text-orange-400 hover:bg-orange-500/10"
            )}
          >
            <Shield className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
            Consola Admin
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-6 pt-4 space-y-1 border-t border-navy-800 mt-4">
        <Link
          href={`/c/${comercioSlug}`}
          target="_blank"
          className="flex items-center gap-[11px] px-3 py-[10px] rounded-[9px] text-[14px] font-semibold text-[#c5d0db] hover:bg-navy-800 transition-colors"
        >
          <ExternalLink className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
          Ver mi tienda pública
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-[11px] px-3 py-[10px] rounded-[9px] text-[14px] font-semibold text-[#c5d0db] hover:bg-navy-800 transition-colors w-full"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
          Cerrar sesión
        </button>

        <Link
          href="/dashboard/productos/nuevo"
          className="flex items-center justify-center gap-2 mt-3 w-full py-[11px] rounded-[9px] bg-navy-800 text-white text-[13.5px] font-bold hover:bg-navy-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Publicar producto
        </Link>
      </div>
    </aside>
  );
}
