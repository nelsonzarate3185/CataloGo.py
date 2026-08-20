"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Envoltorio de los filtros para pantallas chicas.
 *
 * Recibe el panel ya renderizado en el servidor como `children`, así el filtro
 * sigue siendo enlaces y no se duplica la lógica.
 */
export default function FiltrosMobile({
  children,
  activos,
}: {
  children: React.ReactNode;
  activos: number;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        <Button variant="outline" size="touch" className="lg:hidden">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filtros
          {activos > 0 && (
            <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-2xs font-bold text-primary-foreground">
              {activos}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[85vw] max-w-sm overflow-y-auto"
        onClick={(evento) => {
          // Los filtros son enlaces: al elegir uno hay que cerrar el panel.
          if ((evento.target as HTMLElement).closest("a")) setAbierto(false);
        }}
      >
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="mt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
