"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { formatGS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Producto, Catalogo, Categoria } from "@/types/database";

/**
 * Campo numérico opcional.
 *
 * Una cadena vacía tiene que llegar a la base como NULL, no como 0: en `stock`,
 * 0 significa "agotado" y NULL significa "no llevo control". `z.coerce.number()`
 * convierte "" en 0 y borraría esa distinción.
 */
const numeroOpcional = z.preprocess(
  (valor) =>
    valor === "" || valor === null || valor === undefined ? null : Number(valor),
  z
    .number({ invalid_type_error: "Ingresá un número" })
    .int("Sin decimales")
    .min(0, "No puede ser negativo")
    .nullable()
);

const schema = z.object({
  nombre: z.string().min(1, "Requerido"),
  descripcion: z.string().optional(),
  marca: z.string().optional(),
  precio: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  precio_anterior: numeroOpcional,
  stock: numeroOpcional,
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
  limiteImagenes: number;
  /** Marcas ya cargadas por el comercio, para autocompletar. */
  marcasExistentes: string[];
  onClose: () => void;
  onSaved: (producto: Producto, isNew: boolean) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function parseImagenesAdicionales(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter((v) => typeof v === "string") as string[];
}

export default function ProductoModal({
  producto,
  catalogos,
  categorias,
  comercioId,
  limiteImagenes,
  marcasExistentes,
  onClose,
  onSaved,
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [imagenPrincipalPreview, setImagenPrincipalPreview] = useState<string | null>(
    producto?.imagen_url ?? null
  );
  const [imagenPrincipalFile, setImagenPrincipalFile] = useState<File | null>(null);

  const [imagenesAdicionales, setImagenesAdicionales] = useState<string[]>(
    parseImagenesAdicionales(producto?.imagenes_adicionales)
  );
  const [imagenesAdicionalesFiles, setImagenesAdicionalesFiles] = useState<(File | null)[]>(
    () => parseImagenesAdicionales(producto?.imagenes_adicionales).map(() => null)
  );

  const fileRefPrincipal = useRef<HTMLInputElement>(null);
  const fileRefsAdicionales = useRef<(HTMLInputElement | null)[]>([]);

  const slotsAdicionales = limiteImagenes - 1;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: producto?.nombre ?? "",
      descripcion: producto?.descripcion ?? "",
      marca: producto?.marca ?? "",
      precio: producto?.precio ?? 0,
      precio_anterior: producto?.precio_anterior ?? null,
      stock: producto?.stock ?? null,
      catalogo_id: producto?.catalogo_id ?? catalogos[0]?.id ?? "",
      categoria_id: producto?.categoria_id ?? "",
      disponible: producto?.disponible ?? true,
      destacado: producto?.destacado ?? false,
    },
  });

  const catalogoSeleccionado = watch("catalogo_id");
  const categoriasFiltradas = categorias.filter((c) => c.catalogo_id === catalogoSeleccionado);

  const precio = Number(watch("precio")) || 0;
  const precioAnterior = Number(watch("precio_anterior")) || 0;
  const descuento =
    precioAnterior > precio ? Math.round(((precioAnterior - precio) / precioAnterior) * 100) : 0;

  function handlePrincipalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Solo JPG, PNG o WEBP"); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error("Máximo 10MB por imagen"); return; }
    setImagenPrincipalFile(file);
    setImagenPrincipalPreview(URL.createObjectURL(file));
  }

  function handleAdicionalChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Solo JPG, PNG o WEBP"); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error("Máximo 10MB por imagen"); return; }

    const preview = URL.createObjectURL(file);
    setImagenesAdicionales((prev) => {
      const next = [...prev];
      next[index] = preview;
      return next;
    });
    setImagenesAdicionalesFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  }

  function removeAdicional(index: number) {
    setImagenesAdicionales((prev) => prev.filter((_, i) => i !== index));
    setImagenesAdicionalesFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadImagen(productoId: string, file: File, slot: string): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${comercioId}/${productoId}${slot}.${ext}`;
    const { error } = await supabase.storage.from("productos").upload(path, file, { upsert: true });
    if (error) { toast.error("Error al subir imagen: " + error.message); return null; }
    const { data } = supabase.storage.from("productos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function buildImagenesAdicionales(productoId: string): Promise<string[]> {
    const result: string[] = [];
    for (let i = 0; i < imagenesAdicionales.length; i++) {
      const file = imagenesAdicionalesFiles[i];
      if (file) {
        const url = await uploadImagen(productoId, file, `-adicional-${i}`);
        if (url) result.push(url);
      } else if (imagenesAdicionales[i] && !imagenesAdicionales[i].startsWith("blob:")) {
        result.push(imagenesAdicionales[i]);
      }
    }
    return result;
  }

  async function onSubmit(data: Form) {
    setLoading(true);
    try {
      const isNew = !producto;

      const campos = {
        catalogo_id: data.catalogo_id,
        categoria_id: data.categoria_id || null,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        marca: data.marca?.trim() || null,
        precio: data.precio,
        precio_anterior: data.precio_anterior,
        stock: data.stock,
        disponible: data.disponible,
        destacado: data.destacado,
      };

      if (isNew) {
        const { data: created, error } = await supabase
          .from("productos")
          .insert({ comercio_id: comercioId, ...campos })
          .select()
          .single();

        if (error || !created) { toast.error("Error al crear el producto"); return; }

        const imagen_url = imagenPrincipalFile
          ? await uploadImagen(created.id, imagenPrincipalFile, "")
          : created.imagen_url;

        const adicionales = await buildImagenesAdicionales(created.id);

        await supabase.from("productos").update({
          imagen_url: imagen_url ?? null,
          imagenes_adicionales: adicionales,
        }).eq("id", created.id);

        toast.success("Producto creado");
        onSaved({ ...created, imagen_url: imagen_url ?? null, imagenes_adicionales: adicionales }, true);
      } else {
        const imagen_url = imagenPrincipalFile
          ? await uploadImagen(producto.id, imagenPrincipalFile, "")
          : producto.imagen_url;

        const adicionales = await buildImagenesAdicionales(producto.id);

        const { data: updated, error } = await supabase
          .from("productos")
          .update({
            ...campos,
            imagen_url: imagen_url ?? producto.imagen_url,
            imagenes_adicionales: adicionales,
          })
          .eq("id", producto.id)
          .select()
          .single();

        if (error || !updated) { toast.error("Error al actualizar el producto"); return; }
        toast.success("Producto actualizado");
        onSaved(updated, false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{producto ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Imagen principal */}
          <div>
            <Label className="mb-2 block">Imagen principal</Label>
            <button
              type="button"
              onClick={() => fileRefPrincipal.current?.click()}
              className="w-full overflow-hidden rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary"
            >
              {imagenPrincipalPreview ? (
                <span className="relative block h-40">
                  <Image src={imagenPrincipalPreview} alt="Vista previa" fill className="object-cover" />
                </span>
              ) : (
                <span className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Upload className="size-6" aria-hidden="true" />
                  <span className="text-xs">JPG, PNG o WEBP · máx 10MB</span>
                </span>
              )}
            </button>
            <input
              ref={fileRefPrincipal}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePrincipalChange}
            />
          </div>

          {/* Imágenes adicionales */}
          {slotsAdicionales > 0 && (
            <div>
              <Label className="mb-2 block">
                Imágenes adicionales{" "}
                <span className="font-normal text-muted-foreground">
                  (hasta {slotsAdicionales} según tu plan)
                </span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: slotsAdicionales }).map((_, i) => {
                  const preview = imagenesAdicionales[i];
                  return (
                    <div key={i} className="relative">
                      <button
                        type="button"
                        onClick={() => !preview && fileRefsAdicionales.current[i]?.click()}
                        className={`relative flex size-20 items-center justify-center overflow-hidden rounded-md border-2 border-dashed bg-muted ${
                          preview ? "border-border" : "border-border hover:border-primary"
                        }`}
                      >
                        {preview ? (
                          <Image src={preview} alt={`Adicional ${i + 1}`} fill className="object-cover" />
                        ) : (
                          <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {preview ? `Imagen adicional ${i + 1}` : `Agregar imagen ${i + 1}`}
                        </span>
                      </button>
                      {preview && (
                        <button
                          type="button"
                          onClick={() => removeAdicional(i)}
                          className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                        >
                          <Trash2 className="size-3" aria-hidden="true" />
                          <span className="sr-only">Quitar imagen {i + 1}</span>
                        </button>
                      )}
                      <input
                        ref={(el) => { fileRefsAdicionales.current[i] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleAdicionalChange(i, e)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Catálogo */}
          <div>
            <Label htmlFor="catalogo_id">Catálogo *</Label>
            <select
              id="catalogo_id"
              {...register("catalogo_id")}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-sm"
            >
              {catalogos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {errors.catalogo_id && (
              <p className="mt-1 text-xs text-destructive">{errors.catalogo_id.message}</p>
            )}
          </div>

          {/* Categoría */}
          {categoriasFiltradas.length > 0 && (
            <div>
              <Label htmlFor="categoria_id">Categoría (opcional)</Label>
              <select
                id="categoria_id"
                {...register("categoria_id")}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-sm"
              >
                <option value="">Sin categoría</option>
                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nombre */}
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" {...register("nombre")} placeholder="Ej: Coca-Cola 2L" className="mt-1" />
            {errors.nombre && <p className="mt-1 text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          {/* Marca */}
          <div>
            <Label htmlFor="marca">Marca (opcional)</Label>
            <Input
              id="marca"
              {...register("marca")}
              list="marcas-cargadas"
              placeholder="Ej: Coca-Cola"
              className="mt-1"
            />
            <datalist id="marcas-cargadas">
              {marcasExistentes.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-muted-foreground">
              Aparece como filtro en tu catálogo público.
            </p>
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <textarea
              id="descripcion"
              {...register("descripcion")}
              rows={2}
              placeholder="Descripción corta del producto…"
              className="mt-1 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm"
            />
          </div>

          <Separator />

          {/* Precios */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="precio">Precio (Gs.) *</Label>
              <Input
                id="precio"
                {...register("precio")}
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className="mt-1"
              />
              {errors.precio && <p className="mt-1 text-xs text-destructive">{errors.precio.message}</p>}
              {precio > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">{formatGS(precio)}</p>
              )}
            </div>

            <div>
              <Label htmlFor="precio_anterior">Precio anterior</Label>
              <Input
                id="precio_anterior"
                {...register("precio_anterior")}
                type="number"
                min="0"
                step="1"
                placeholder="Sin oferta"
                className="mt-1"
              />
              {errors.precio_anterior && (
                <p className="mt-1 text-xs text-destructive">{errors.precio_anterior.message}</p>
              )}
              {descuento > 0 ? (
                <p className="mt-1 text-xs font-bold text-deal">
                  Se muestra -{descuento}% de descuento
                </p>
              ) : precioAnterior > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Tiene que ser mayor al precio para mostrar oferta.
                </p>
              ) : null}
            </div>
          </div>

          {/* Stock */}
          <div>
            <Label htmlFor="stock">Stock (opcional)</Label>
            <Input
              id="stock"
              {...register("stock")}
              type="number"
              min="0"
              step="1"
              placeholder="Sin control de stock"
              className="mt-1"
            />
            {errors.stock && <p className="mt-1 text-xs text-destructive">{errors.stock.message}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              Dejalo vacío si no llevás control. Con 5 o menos, el catálogo avisa
              &quot;quedan pocos&quot;; en 0 el producto no se puede pedir.
            </p>
          </div>

          <Separator />

          {/* Interruptores */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="disponible"
                defaultChecked={producto?.disponible ?? true}
                onCheckedChange={(v) => setValue("disponible", v === true)}
              />
              <Label htmlFor="disponible" className="cursor-pointer font-normal">
                Disponible
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="destacado"
                defaultChecked={producto?.destacado ?? false}
                onCheckedChange={(v) => setValue("destacado", v === true)}
              />
              <Label htmlFor="destacado" className="cursor-pointer font-normal">
                Destacado
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
