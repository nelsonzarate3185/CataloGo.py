"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { marcasDisponibles, porcentajeDescuento } from "@/lib/productos";
import type { Producto, Catalogo, Categoria, PlanTipo } from "@/types/database";
import { ILIMITADO } from "@/types/database";
import ProductoModal from "./ProductoModal";

interface Props {
  productos: Producto[];
  catalogos: Pick<Catalogo, "id" | "nombre">[];
  categorias: Categoria[];
  comercioId: string;
  plan: PlanTipo;
  limiteProductos: number;
  limiteImagenes: number;
}

export default function ProductosClient({
  productos: initialProductos,
  catalogos,
  categorias,
  comercioId,
  plan,
  limiteProductos,
  limiteImagenes,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [productos, setProductos] = useState(initialProductos);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const marcasExistentes = useMemo(() => marcasDisponibles(productos), [productos]);

  const activos = productos.filter((p) => p.disponible).length;
  const puedeAgregar = limiteProductos >= ILIMITADO || activos < limiteProductos;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = productos.findIndex((p) => p.id === active.id);
    const newIndex = productos.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(productos, oldIndex, newIndex).map((p, i) => ({
      ...p,
      orden: i,
    }));
    setProductos(reordered);

    await Promise.all(
      reordered.map((p) =>
        supabase.from("productos").update({ orden: p.orden }).eq("id", p.id)
      )
    );
  }

  async function toggleDisponible(producto: Producto) {
    const nuevoEstado = !producto.disponible;

    // Sólo activar puede chocar contra el límite del plan; desactivar siempre
    // está permitido.
    if (nuevoEstado && limiteProductos < ILIMITADO) {
      const otrosActivos = productos.filter(
        (p) => p.disponible && p.id !== producto.id
      ).length;
      if (otrosActivos >= limiteProductos) {
        toast.error(`Límite del plan ${plan}: ${limiteProductos} productos activos`);
        return;
      }
    }

    const { error } = await supabase
      .from("productos")
      .update({ disponible: nuevoEstado })
      .eq("id", producto.id);

    // Publicar un producto puede consumir cupo de cambios del plan; el motivo
    // viene en el mensaje de la base.
    if (error) { toast.error(error.message); return; }

    setProductos((prev) =>
      prev.map((p) => (p.id === producto.id ? { ...p, disponible: nuevoEstado } : p))
    );
    toast.success(nuevoEstado ? "Producto activado" : "Producto desactivado");
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (error) { toast.error(`No pudimos eliminar: ${error.message}`); return; }
    setProductos((prev) => prev.filter((p) => p.id !== id));
    toast.success("Producto eliminado");
  }

  function abrirNuevo() {
    if (!puedeAgregar) {
      toast.error(`Límite del plan ${plan}: ${limiteProductos} productos activos`);
      return;
    }
    setEditando(null);
    setModalOpen(true);
  }

  function handleSaved(producto: Producto, isNew: boolean) {
    if (isNew) {
      setProductos((prev) => [...prev, producto]);
    } else {
      setProductos((prev) => prev.map((p) => (p.id === producto.id ? producto : p)));
    }
    setModalOpen(false);
    setEditando(null);
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {activos} {activos === 1 ? "activo" : "activos"}
          {limiteProductos < ILIMITADO && ` de ${limiteProductos}`}
        </p>
        <Button onClick={abrirNuevo}>
          <Plus className="size-4" aria-hidden="true" />
          Agregar producto
        </Button>
      </div>

      {productos.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">No tenés productos aún.</p>
          <Button variant="link" onClick={abrirNuevo} className="mt-1">
            Agregar el primero
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={productos.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {productos.map((producto) => (
                <SortableProductoRow
                  key={producto.id}
                  producto={producto}
                  onEdit={() => { setEditando(producto); setModalOpen(true); }}
                  onToggle={() => toggleDisponible(producto)}
                  onDelete={() => eliminar(producto.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {modalOpen && (
        <ProductoModal
          producto={editando}
          catalogos={catalogos}
          categorias={categorias}
          comercioId={comercioId}
          limiteImagenes={limiteImagenes}
          marcasExistentes={marcasExistentes}
          onClose={() => { setModalOpen(false); setEditando(null); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

function SortableProductoRow({
  producto,
  onEdit,
  onToggle,
  onDelete,
}: {
  producto: Producto;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: producto.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const descuento = porcentajeDescuento(producto);
  const sinStock = typeof producto.stock === "number" && producto.stock <= 0;
  const stockBajo =
    typeof producto.stock === "number" && producto.stock > 0 && producto.stock <= 5;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden="true" />
        <span className="sr-only">Reordenar {producto.nombre}</span>
      </button>

      <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
        {producto.imagen_url ? (
          <Image
            src={producto.imagen_url}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-2xs text-muted-foreground">
            Sin foto
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {producto.marca && (
          <p className="text-2xs uppercase tracking-wide text-muted-foreground">
            {producto.marca}
          </p>
        )}
        <p className="truncate text-base font-medium leading-tight">{producto.nombre}</p>
        <Price
          precio={producto.precio}
          precioAnterior={producto.precio_anterior}
          size="sm"
          className="mt-0.5"
        />
      </div>

      <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
        {descuento > 0 && (
          <Badge className="rounded-sm bg-deal text-white hover:bg-deal">
            -{descuento}%
          </Badge>
        )}
        {producto.destacado && (
          <Badge className="rounded-sm bg-primary text-primary-foreground hover:bg-primary">
            Destacado
          </Badge>
        )}
        {sinStock ? (
          <Badge variant="destructive" className="rounded-sm">Agotado</Badge>
        ) : stockBajo ? (
          <Badge variant="outline" className="rounded-sm text-deal">
            Quedan {producto.stock}
          </Badge>
        ) : null}
        <Badge
          variant="outline"
          className={
            producto.disponible ? "rounded-sm text-success" : "rounded-sm text-muted-foreground"
          }
        >
          {producto.disponible ? "Activo" : "Oculto"}
        </Badge>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onToggle}>
          {producto.disponible ? (
            <Eye className="size-4 text-success" aria-hidden="true" />
          ) : (
            <EyeOff className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="sr-only">
            {producto.disponible ? "Ocultar" : "Mostrar"} {producto.nombre}
          </span>
        </Button>

        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden="true" />
          <span className="sr-only">Editar {producto.nombre}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          <span className="sr-only">Eliminar {producto.nombre}</span>
        </Button>
      </div>
    </li>
  );
}
