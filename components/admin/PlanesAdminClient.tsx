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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
            <div key={p.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Package className="w-4 h-4 text-orange-500" />
                    <p className="font-bold text-gray-900 capitalize">{p.name}</p>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">id: {p.id}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id || isPending}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-2xl font-bold text-gray-900 mb-3">
                {p.price === 0 ? "Gratis" : formatPYG(p.price)}
                {p.price > 0 && <span className="text-sm font-normal text-gray-400">/mes</span>}
              </p>

              <div className="space-y-1 text-xs text-gray-500">
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
          className="border-2 border-dashed border-orange-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-orange-400 hover:bg-orange-50 transition-colors min-h-[180px]"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-semibold">Nuevo plan</span>
        </button>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                <h2 className="font-semibold text-gray-900">{modal === "new" ? "Nuevo plan" : "Editar plan"}</h2>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field("id", "ID del plan (ej: pro)")}
                {field("name", "Nombre visible")}
              </div>
              {field("price", "Precio mensual (PYG)", "number")}
              <hr />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Límites</p>
              <div className="grid grid-cols-2 gap-4">
                {field("max_products", "Productos", "number")}
                {field("max_catalogs", "Catálogos", "number")}
                {field("max_images", "Imágenes / producto", "number")}
                {field("max_branches", "Sucursales", "number")}
              </div>
              <p className="text-xs text-gray-400">Usá 9007199254740991 para límite ilimitado.</p>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={isPending} className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-60">
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
