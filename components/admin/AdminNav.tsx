"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Store, Users, CreditCard, ClipboardList, Bell, MessageSquare, Wallet, LogOut, Shield, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/novedades", label: "Novedades", icon: Bell },
  { href: "/admin/mensajes", label: "Mensajes", icon: MessageSquare },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: ClipboardList },
  { href: "/admin/planes", label: "Planes", icon: CreditCard },
  { href: "/admin/cobros", label: "Cobros", icon: Wallet },
  { href: "/admin/comercios", label: "Negocios", icon: Store },
];

/**
 * `sinLeer` viaja como prop desde el layout, que ya consulta la base del lado
 * del servidor. Pedirlo otra vez desde el cliente duplicaría la consulta en
 * cada navegación del panel.
 */
interface Props {
  sinLeer?: number;
  mensajesSinLeer?: number;
}

/**
 * Contenido del menú, compartido por la barra lateral y el cajón de móvil.
 * Duplicarlo habría hecho que las dos versiones se desincronizaran en cuanto se
 * agregara una sección.
 */
function NavContenido({
  sinLeer = 0,
  mensajesSinLeer = 0,
  onNavegar,
}: Props & { onNavegar?: () => void }) {
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
    <div
      className="flex min-h-full flex-1 flex-col"
      onClick={(evento) => {
        if (onNavegar && (evento.target as HTMLElement).closest("a,button")) onNavegar();
      }}
    >
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
    </div>
  );
}

/** Barra lateral fija. Sólo desde `lg`: abajo el ancho no alcanza. */
export default function AdminNav(props: Props) {
  return (
    <aside className="hidden w-[220px] shrink-0 flex-col bg-nav text-muted-foreground lg:flex">
      <NavContenido {...props} />
    </aside>
  );
}

/**
 * Cabecera de móvil con el menú en un cajón.
 *
 * El panel admin tiene tablas anchas; con la barra lateral fija ocupando 220px
 * no quedaba ancho utilizable en un teléfono.
 */
export function AdminNavMovil(props: Props) {
  const [abierto, setAbierto] = useState(false);
  const pendientes = (props.sinLeer ?? 0) + (props.mensajesSinLeer ?? 0);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-nav px-3 py-2.5 lg:hidden">
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger asChild>
          <button
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-white"
            aria-label="Abrir menú"
          >
            <Menu className="size-6" aria-hidden="true" />
          </button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="w-[260px] overflow-y-auto border-nav-sub bg-nav p-0 text-muted-foreground"
        >
          <SheetTitle className="sr-only">Menú de administración</SheetTitle>
          <NavContenido {...props} onNavegar={() => setAbierto(false)} />
        </SheetContent>
      </Sheet>

      <p className="flex min-w-0 items-center gap-1.5">
        <Shield className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="text-base font-bold text-white">CataloGo</span>
        <span className="text-base font-bold text-primary">Admin</span>
      </p>

      {pendientes > 0 && (
        <span className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-2xs font-bold text-primary-foreground">
          {pendientes > 99 ? "99+" : pendientes}
        </span>
      )}
    </header>
  );
}
