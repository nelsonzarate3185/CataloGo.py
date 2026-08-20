"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Package, CreditCard } from "lucide-react";
import { upsertPlan, deletePlan, type PlanFormData } from "@/app/admin/actions";
import type { Plan } from "@/types/database";

type PlanData = {
  max_products?: number;
  max_catalogs?: number;
  max_images?: number;
  max_branches?: number;
};

function parsePlanData(data: Plan["data"]): PlanData {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    return data as PlanData;
  }
  return {};
}

const EMPTY_FORM: PlanFormData = {
  id: "", name: "", price: 0,
  max_products: 10, max_catalogs: 1, max_images: 1, max_branches: 0,
};

const formatPYG = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n);

interface Props { planes: Plan[] }

export default function PlanesAdminClient({ planes: initial }: Props) {
  const [planes, setPlanes] = useState(initial);
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [form, setForm] = useState<PlanFormData>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setForm(EMPTY_FORM);
    setModal("new");
  }

  function openEdit(p: Plan) {
    const d = parsePlanData(p.data);
    setForm({
      id: p.id, name: p.name, price: p.price,
      max_products: d.max_products ?? 10,
      max_catalogs: d.max_catalogs ?? 1,
      max_images: d.max_images ?? 1,
      max_branches: d.max_branches ?? 0,
    });
    setModal("edit");
  }

  function handleSave() {
    if (!form.id || !form.name) { toast.error("ID y nombre son requeridos"); return; }
    startTransition(async () => {
      try {
        await upsertPlan(form);
        const updated: Plan = {
          id: form.id, name: form.name, price: form.price,
          data: { max_products: form.max_products, max_catalogs: form.max_catalogs, max_images: form.max_images, max_branches: form.max_branches },
        };
        setPlanes((prev) => {
          const idx = prev.findIndex((p) => p.id === form.id);
          return idx >= 0 ? prev.map((p, i) => i === idx ? updated : p) : [...prev, updated];
        });
        toast.success(modal === "new" ? "Plan creado" : "Plan actualizado");
        setModal(null);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deletePlan(id);
        setPlanes((prev) => prev.filter((p) => p.id !== id));
        toast.success("Plan eliminado");
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setDeletingId(null);
      }
    });
  }

  const field = (key: keyof PlanFormData, label: string, type: "text" | "number" = "text") => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        disabled={key === "id" && modal === "edit"}
      />
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {planes.map((p) => {
          const d = parsePlanData(p.data);
          return (
            <div key={p.id} className="bg-card rounded-xl border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Package className="w-4 h-4 text-primary" />
                    <p className="font-bold text-foreground capitalize">{p.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">id: {p.id}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id || isPending}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-2xl font-bold text-foreground mb-3">
                {p.price === 0 ? "Gratis" : formatPYG(p.price)}
                {p.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mes</span>}
              </p>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>📦 {d.max_products === undefined ? "—" : d.max_products >= 9007199254740991 ? "Ilimitados" : d.max_products} productos</p>
                <p>📋 {d.max_catalogs === undefined ? "—" : d.max_catalogs >= 9007199254740991 ? "Ilimitados" : d.max_catalogs} catálogos</p>
                <p>🖼️ {d.max_images ?? "—"} imágenes por producto</p>
                <p>📍 {d.max_branches ?? 0} sucursales</p>
              </div>
            </div>
          );
        })}

        {/* Botón nuevo plan */}
        <button
          onClick={openNew}
          className="border-2 border-dashed border-primary rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-primary hover:bg-primary/10 transition-colors min-h-[180px]"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-semibold">Nuevo plan</span>
        </button>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">{modal === "new" ? "Nuevo plan" : "Editar plan"}</h2>
              </div>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field("id", "ID del plan (ej: pro)")}
                {field("name", "Nombre visible")}
              </div>
              {field("price", "Precio mensual (PYG)", "number")}
              <hr />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Límites</p>
              <div className="grid grid-cols-2 gap-4">
                {field("max_products", "Productos", "number")}
                {field("max_catalogs", "Catálogos", "number")}
                {field("max_images", "Imágenes / producto", "number")}
                {field("max_branches", "Sucursales", "number")}
              </div>
              <p className="text-xs text-muted-foreground">Usá 9007199254740991 para límite ilimitado.</p>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-foreground hover:bg-muted">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={isPending} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
