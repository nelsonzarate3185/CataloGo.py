"use client";

import { useState } from "react";
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
import { formatGS } from "@/lib/utils";
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

  const puedeAgregar =
    limiteProductos >= ILIMITADO ||
    productos.filter((p) => p.disponible).length < limiteProductos;

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

    if (!nuevoEstado === false && plan === "basico") {
      const activos = productos.filter((p) => p.disponible && p.id !== producto.id).length;
      if (activos >= limiteProductos) {
        toast.error(`Límite del plan básico: ${limiteProductos} productos`);
        return;
      }
    }

    const { error } = await supabase
      .from("productos")
      .update({ disponible: nuevoEstado })
      .eq("id", producto.id);

    if (error) { toast.error("Error al actualizar"); return; }

    setProductos((prev) =>
      prev.map((p) => (p.id === producto.id ? { ...p, disponible: nuevoEstado } : p))
    );
    toast.success(nuevoEstado ? "Producto activado" : "Producto desactivado");
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (error) { toast.error("Error al eliminar"); return; }
    setProductos((prev) => prev.filter((p) => p.id !== id));
    toast.success("Producto eliminado");
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
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            if (!puedeAgregar) {
              toast.error(`Límite del plan básico: ${limiteProductos} productos activos`);
              return;
            }
            setEditando(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Agregar producto
        </button>
      </div>

      {productos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-gray-400 text-sm">
            No tenés productos aún.{" "}
            <button
              onClick={() => setModalOpen(true)}
              className="text-primary font-medium"
            >
              Agregar el primero
            </button>
          </p>
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
            <div className="space-y-2">
              {productos.map((producto) => (
                <SortableProductoRow
                  key={producto.id}
                  producto={producto}
                  onEdit={() => { setEditando(producto); setModalOpen(true); }}
                  onToggle={() => toggleDisponible(producto)}
                  onDelete={() => eliminar(producto.id)}
                />
              ))}
            </div>
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

  const estadoBg = producto.disponible ? "#e7f4ec" : "#fbe9ec";
  const estadoColor = producto.disponible ? "#1f8a52" : "#c4314b";
  const estadoLabel = producto.disponible ? "Activo" : "Sin stock";

  return (
    <div
      ref={setNodeRef}
      style={{ boxShadow: "0 1px 3px rgba(20,30,45,.06)", border: "1px solid #f0f1ec", ...style }}
      className="flex items-center gap-3 bg-white rounded-[12px] px-4 py-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {producto.imagen_url ? (
        <div className="w-11 h-11 rounded-[8px] overflow-hidden shrink-0 relative">
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className="w-11 h-11 rounded-[8px] shrink-0 flex items-center justify-center text-[11px] font-mono"
          style={{ background: "#f3f5f1", color: "#9aa6a0" }}
        >
          Sin foto
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14px] text-foreground leading-tight truncate">
          {producto.nombre}
        </p>
        <p className="text-[13px] font-bold mt-0.5" style={{ color: "#f6a623" }}>
          {formatGS(producto.precio)}
        </p>
      </div>

      {/* Badge de estado */}
      <span
        className="shrink-0 px-[10px] py-[3px] rounded-[20px] text-[12px] font-bold hidden sm:inline-flex"
        style={{ background: estadoBg, color: estadoColor }}
      >
        {estadoLabel}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggle}
          title={producto.disponible ? "Desactivar" : "Activar"}
          className="p-1.5 rounded-lg hover:bg-gray-100"
          style={{ color: producto.disponible ? "#1f8a52" : "#9aa6a0" }}
        >
          {producto.disponible ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
