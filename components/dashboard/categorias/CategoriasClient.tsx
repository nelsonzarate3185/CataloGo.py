"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Catalogo, Categoria } from "@/types/database";

interface Props {
  catalogos: Pick<Catalogo, "id" | "nombre">[];
  categorias: Categoria[];
}

export default function CategoriasClient({ catalogos, categorias: init }: Props) {
  const supabase = createClient();
  const [categorias, setCategorias] = useState(init);
  const [catalogoActivo, setCatalogoActivo] = useState(catalogos[0]?.id ?? "");
  const [nuevaNombre, setNuevaNombre] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState("");
  const [loading, setLoading] = useState(false);

  const filtradas = categorias.filter((c) => c.catalogo_id === catalogoActivo);

  async function crear() {
    if (!nuevaNombre.trim()) return;
    setLoading(true);
    const orden = filtradas.length;
    const { data, error } = await supabase
      .from("categorias")
      .insert({
        catalogo_id: catalogoActivo,
        nombre: nuevaNombre.trim(),
        orden,
        activo: true,
      })
      .select()
      .single();
    setLoading(false);
    if (error || !data) { toast.error("Error al crear la categoría"); return; }
    setCategorias((prev) => [...prev, data]);
    setNuevaNombre("");
    toast.success("Categoría creada");
  }

  async function guardarEdicion(id: string) {
    if (!editandoNombre.trim()) return;
    const { error } = await supabase
      .from("categorias")
      .update({ nombre: editandoNombre.trim() })
      .eq("id", id);
    if (error) { toast.error("Error al actualizar"); return; }
    setCategorias((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nombre: editandoNombre.trim() } : c))
    );
    setEditandoId(null);
    toast.success("Categoría actualizada");
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar categoría? Los productos quedarán sin categoría.")) return;
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) { toast.error("Error al eliminar"); return; }
    setCategorias((prev) => prev.filter((c) => c.id !== id));
    toast.success("Categoría eliminada");
  }

  if (catalogos.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border text-sm text-gray-400">
        Primero creá un catálogo desde el panel de configuración.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de catálogo */}
      <div className="flex gap-2 flex-wrap">
        {catalogos.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCatalogoActivo(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              catalogoActivo === cat.id
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Lista de categorías */}
      <div className="bg-white rounded-xl border divide-y">
        {filtradas.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            No hay categorías en este catálogo.
          </p>
        )}
        {filtradas.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
            {editandoId === cat.id ? (
              <>
                <input
                  value={editandoNombre}
                  onChange={(e) => setEditandoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && guardarEdicion(cat.id)}
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <button
                  onClick={() => guardarEdicion(cat.id)}
                  className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditandoId(null)}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800">{cat.nombre}</span>
                <button
                  onClick={() => {
                    setEditandoId(cat.id);
                    setEditandoNombre(cat.nombre);
                  }}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => eliminar(cat.id)}
                  className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ))}

        {/* Formulario nueva categoría */}
        <div className="flex items-center gap-2 px-4 py-3">
          <input
            value={nuevaNombre}
            onChange={(e) => setNuevaNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && crear()}
            placeholder="Nueva categoría..."
            className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={crear}
            disabled={loading || !nuevaNombre.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
