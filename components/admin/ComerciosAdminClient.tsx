"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, ChevronDown, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PlanTipo } from "@/types/database";

type Comercio = {
  id: string;
  nombre: string;
  slug: string;
  plan: string;
  activo: boolean;
  whatsapp: string;
  rubro: string | null;
  created_at: string;
};

const planColors: Record<PlanTipo, string> = {
  basico: "bg-gray-100 text-gray-700 border-gray-200",
  pro: "bg-blue-100 text-blue-700 border-blue-200",
  plus: "bg-purple-100 text-purple-700 border-purple-200",
  business: "bg-orange-100 text-orange-700 border-orange-200",
};

const PLANES: PlanTipo[] = ["basico", "pro", "plus", "business"];

interface Props {
  comercios: Comercio[];
}

export default function ComerciosAdminClient({ comercios: initial }: Props) {
  const [comercios, setComerciosList] = useState(initial);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanTipo | "todos">("todos");
  const [cambiandoPlan, setCambiandoPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

  const filtered = comercios.filter((c) => {
    const matchSearch =
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "todos" || c.plan === planFilter;
    return matchSearch && matchPlan;
  });

  async function handleChangePlan(comercioId: string, nuevoPlan: PlanTipo) {
    setLoading(comercioId);
    const { error } = await supabase
      .from("comercios")
      .update({ plan: nuevoPlan })
      .eq("id", comercioId);
    setLoading(null);
    setCambiandoPlan(null);
    if (error) { toast.error("Error al cambiar plan"); return; }
    setComerciosList((prev) =>
      prev.map((c) => (c.id === comercioId ? { ...c, plan: nuevoPlan } : c))
    );
    toast.success("Plan actualizado");
  }

  async function handleToggleActivo(comercioId: string, activo: boolean) {
    setLoading(comercioId);
    const { error } = await supabase
      .from("comercios")
      .update({ activo: !activo })
      .eq("id", comercioId);
    setLoading(null);
    if (error) { toast.error("Error al actualizar estado"); return; }
    setComerciosList((prev) =>
      prev.map((c) => (c.id === comercioId ? { ...c, activo: !activo } : c))
    );
    toast.success(!activo ? "Negocio activado" : "Negocio desactivado");
  }

  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const appUrl = rawAppUrl.startsWith("http") ? rawAppUrl : `https://${rawAppUrl}`;

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as PlanTipo | "todos")}
          className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          <option value="todos">Todos los planes</option>
          {PLANES.map((p) => (
            <option key={p} value={p} className="capitalize">{p}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Negocio</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Plan</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Registrado</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    No se encontraron negocios.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900">{c.nombre}</p>
                    <p className="text-xs text-gray-400">/{c.slug} · {c.whatsapp}</p>
                  </td>

                  <td className="px-5 py-3.5">
                    {cambiandoPlan === c.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue={c.plan}
                          onChange={(e) => handleChangePlan(c.id, e.target.value as PlanTipo)}
                          disabled={loading === c.id}
                          className="border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                          autoFocus
                        >
                          {PLANES.map((p) => (
                            <option key={p} value={p} className="capitalize">{p}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setCambiandoPlan(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCambiandoPlan(c.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize hover:opacity-80 transition-opacity ${planColors[c.plan as PlanTipo] ?? planColors.basico}`}
                      >
                        {c.plan}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggleActivo(c.id, c.activo)}
                      disabled={loading === c.id}
                      className="flex items-center gap-1.5 text-xs disabled:opacity-40"
                    >
                      {c.activo ? (
                        <>
                          <ToggleRight className="w-5 h-5 text-green-500" />
                          <span className="text-green-600 font-medium">Activo</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-400">Inactivo</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {new Date(c.created_at).toLocaleDateString("es-PY", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  <td className="px-5 py-3.5">
                    <a
                      href={`${appUrl}/c/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-orange-500 hover:text-orange-600 font-medium text-xs"
                    >
                      Ver tienda
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
