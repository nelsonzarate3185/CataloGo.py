"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Store, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/comercios", label: "Negocios", icon: Store },
];

export default function AdminNav() {
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
    <aside className="w-[220px] bg-gray-900 text-gray-300 flex flex-col min-h-screen shrink-0">
      <div className="px-5 pt-6 pb-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-400" />
          <span className="font-bold text-white text-[16px]">Admin</span>
          <span className="text-orange-400 font-bold text-[16px]">CataloGo</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">Panel de superadministrador</p>
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
                active
                  ? "bg-orange-500 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6 pt-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-gray-300 hover:bg-gray-800 transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
