"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X, Upload } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { formatGS } from "@/lib/utils";
import type { Producto, Catalogo, Categoria } from "@/types/database";

const schema = z.object({
  nombre: z.string().min(1, "Requerido"),
  descripcion: z.string().optional(),
  precio: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  catalogo_id: z.string().min(1, "Seleccioná un catálogo"),
  categoria_id: z.string().optional(),
  disponible: z.boolean(),
  destacado: z.boolean(),
});

type Form = z.infer<typeof schema>;

interface Props {
  producto: Producto | null;
  catalogos: Pick<Catalogo, "id" | "nombre">[];
  categorias: Categoria[];
  comercioId: string;
  onClose: () => void;
  onSaved: (producto: Producto, isNew: boolean) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProductoModal({
  producto,
  catalogos,
  categorias,
  comercioId,
  onClose,
  onSaved,
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string | null>(
    producto?.imagen_url ?? null
  );
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: producto?.nombre ?? "",
      descripcion: producto?.descripcion ?? "",
      precio: producto?.precio ?? 0,
      catalogo_id: producto?.catalogo_id ?? catalogos[0]?.id ?? "",
      categoria_id: producto?.categoria_id ?? "",
      disponible: producto?.disponible ?? true,
      destacado: producto?.destacado ?? false,
    },
  });

  const catalogoSeleccionado = watch("catalogo_id");
  const categoriasFiltradas = categorias.filter(
    (c) => c.catalogo_id === catalogoSeleccionado
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG o WEBP");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("La imagen no puede superar 10MB");
      return;
    }
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
  }

  async function uploadImagen(productoId: string): Promise<string | null> {
    if (!imagenFile) return producto?.imagen_url ?? null;

    const ext = imagenFile.name.split(".").pop();
    const path = `${comercioId}/${productoId}.${ext}`;

    const { error } = await supabase.storage
      .from("productos")
      .upload(path, imagenFile, { upsert: true });

    if (error) {
      toast.error("Error al subir la imagen: " + error.message);
      return null;
    }

    const { data } = supabase.storage.from("productos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function onSubmit(data: Form) {
    setLoading(true);
    try {
      const isNew = !producto;

      if (isNew) {
        // Crear primero para obtener el ID
        const { data: created, error } = await supabase
          .from("productos")
          .insert({
            comercio_id: comercioId,
            catalogo_id: data.catalogo_id,
            categoria_id: data.categoria_id || null,
            nombre: data.nombre,
            descripcion: data.descripcion || null,
            precio: data.precio,
            disponible: data.disponible,
            destacado: data.destacado,
          })
          .select()
          .single();

        if (error || !created) {
          toast.error("Error al crear el producto");
          return;
        }

        const imagen_url = await uploadImagen(created.id);

        if (imagen_url && imagen_url !== created.imagen_url) {
          await supabase
            .from("productos")
            .update({ imagen_url })
            .eq("id", created.id);
        }

        toast.success("Producto creado");
        onSaved({ ...created, imagen_url: imagen_url ?? created.imagen_url }, true);
      } else {
        const imagen_url = await uploadImagen(producto.id);

        const { data: updated, error } = await supabase
          .from("productos")
          .update({
            catalogo_id: data.catalogo_id,
            categoria_id: data.categoria_id || null,
            nombre: data.nombre,
            descripcion: data.descripcion || null,
            precio: data.precio,
            disponible: data.disponible,
            destacado: data.destacado,
            imagen_url: imagen_url ?? producto.imagen_url,
          })
          .eq("id", producto.id)
          .select()
          .single();

        if (error || !updated) {
          toast.error("Error al actualizar el producto");
          return;
        }

        toast.success("Producto actualizado");
        onSaved(updated, false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">
            {producto ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagen del producto
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl cursor-pointer hover:border-primary transition-colors overflow-hidden"
            >
              {imagenPreview ? (
                <div className="relative h-40">
                  <Image
                    src={imagenPreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Upload className="w-6 h-6" />
                  <p className="text-xs">
                    JPG, PNG o WEBP · máx 10MB
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Catálogo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catálogo *
            </label>
            <select
              {...register("catalogo_id")}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {catalogos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {errors.catalogo_id && (
              <p className="text-xs text-red-500 mt-1">
                {errors.catalogo_id.message}
              </p>
            )}
          </div>

          {/* Categoría */}
          {categoriasFiltradas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría (opcional)
              </label>
              <select
                {...register("categoria_id")}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Sin categoría</option>
                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              {...register("nombre")}
              type="text"
              placeholder="Ej: Coca-Cola 2L"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.nombre && (
              <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              {...register("descripcion")}
              rows={2}
              placeholder="Descripción corta del producto..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio (Gs.) *
            </label>
            <input
              {...register("precio")}
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.precio && (
              <p className="text-xs text-red-500 mt-1">{errors.precio.message}</p>
            )}
            {watch("precio") > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {formatGS(watch("precio"))}
              </p>
            )}
          </div>

          {/* Switches */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register("disponible")}
                type="checkbox"
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-gray-700">Disponible</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register("destacado")}
                type="checkbox"
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-gray-700">Destacado</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
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
  );
}
