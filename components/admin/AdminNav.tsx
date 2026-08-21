"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Store, Users, CreditCard, ClipboardList, Bell, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/novedades", label: "Novedades", icon: Bell },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: ClipboardList },
  { href: "/admin/planes", label: "Planes", icon: CreditCard },
  { href: "/admin/comercios", label: "Negocios", icon: Store },
];

/**
 * `sinLeer` viaja como prop desde el layout, que ya consulta la base del lado
 * del servidor. Pedirlo otra vez desde el cliente duplicaría la consulta en
 * cada navegación del panel.
 */
export default function AdminNav({ sinLeer = 0 }: { sinLeer?: number }) {
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
    <aside className="w-[220px] bg-nav text-muted-foreground flex flex-col min-h-screen shrink-0">
      <div className="px-5 pt-6 pb-5 border-b border-nav-sub">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-bold text-white text-[15px]">CataloGo</span>
          <span className="text-primary font-bold text-[15px]">Admin</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Superadministrador</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors",
                active ? "bg-primary text-white" : "text-muted-foreground hover:bg-nav/90"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6 pt-4 border-t border-nav-sub space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-muted-foreground hover:bg-nav/90 transition-colors"
        >
          ← Volver al dashboard
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-muted-foreground hover:bg-nav/90 transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
