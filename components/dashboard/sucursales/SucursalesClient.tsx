"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Sucursal } from "@/types/database";

const schema = z.object({
  nombre: z.string().min(1, "Requerido"),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
});

type Form = z.infer<typeof schema>;

interface Props {
  sucursales: Sucursal[];
  comercioId: string;
  limite: number;
}

export default function SucursalesClient({ sucursales: initialSucursales, comercioId, limite }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [sucursales, setSucursales] = useState(initialSucursales);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Sucursal | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activas = sucursales.filter((s) => s.activo).length;
  const puedeAgregar = activas < limite;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: "", direccion: "", telefono: "" },
  });

  function openNueva() {
    setEditando(null);
    reset({ nombre: "", direccion: "", telefono: "" });
    setModalOpen(true);
  }

  function openEditar(s: Sucursal) {
    setEditando(s);
    reset({ nombre: s.nombre, direccion: s.direccion ?? "", telefono: s.telefono ?? "" });
    setModalOpen(true);
  }

  async function onSubmit(data: Form) {
    setLoading(true);
    try {
      if (editando) {
        const { data: updated, error } = await supabase
          .from("sucursales")
          .update({
            nombre: data.nombre,
            direccion: data.direccion || null,
            telefono: data.telefono || null,
          })
          .eq("id", editando.id)
          .select()
          .single();

        if (error || !updated) { toast.error("Error al actualizar"); return; }
        setSucursales((prev) => prev.map((s) => (s.id === editando.id ? updated : s)));
        toast.success("Sucursal actualizada");
      } else {
        const { data: created, error } = await supabase
          .from("sucursales")
          .insert({
            comercio_id: comercioId,
            nombre: data.nombre,
            direccion: data.direccion || null,
            telefono: data.telefono || null,
          })
          .select()
          .single();

        if (error || !created) { toast.error("Error al crear"); return; }
        setSucursales((prev) => [...prev, created]);
        toast.success("Sucursal creada");
      }
      setModalOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleEliminar(id: string) {
    setDeletingId(id);
    const { error } = await supabase
      .from("sucursales")
      .update({ activo: false })
      .eq("id", id);
    setDeletingId(null);
    if (error) { toast.error("Error al eliminar"); return; }
    setSucursales((prev) => prev.map((s) => (s.id === id ? { ...s, activo: false } : s)));
    toast.success("Sucursal eliminada");
    router.refresh();
  }

  const sucursalesActivas = sucursales.filter((s) => s.activo);

  return (
    <>
      <div className="space-y-4 max-w-2xl">
        {sucursalesActivas.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No tenés sucursales registradas.</p>
          </div>
        ) : (
          sucursalesActivas.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{s.nombre}</p>
                {s.direccion && (
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {s.direccion}
                  </p>
                )}
                {s.telefono && (
                  <p className="text-sm text-gray-500 mt-0.5">📞 {s.telefono}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEditar(s)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEliminar(s.id)}
                  disabled={deletingId === s.id}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}

        <button
          onClick={openNueva}
          disabled={!puedeAgregar}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full justify-center"
          style={puedeAgregar ? { borderColor: "#f6a623", color: "#f6a623" } : {}}
        >
          <Plus className="w-4 h-4" />
          {puedeAgregar ? "Agregar sucursal" : `Límite alcanzado (${limite} sucursales)`}
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">
                {editando ? "Editar sucursal" : "Nueva sucursal"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  {...register("nombre")}
                  type="text"
                  placeholder="Ej: Sucursal Centro"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección (opcional)</label>
                <input
                  {...register("direccion")}
                  type="text"
                  placeholder="Ej: Av. España 123, Asunción"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
                <input
                  {...register("telefono")}
                  type="tel"
                  placeholder="Ej: 021123456"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
