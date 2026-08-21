"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, ChevronDown, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { baseUrlCliente } from "@/lib/urls";
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
  basico: "bg-muted text-foreground border-border",
  pro: "bg-cat-azul-fondo text-cat-azul border-cat-azul/30",
  plus: "bg-cat-violeta-fondo text-cat-violeta border-cat-violeta/30",
  business: "bg-cat-naranja-fondo text-cat-naranja border-cat-naranja/30",
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

  const appUrl = baseUrlCliente();

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as PlanTipo | "todos")}
          className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-card"
        >
          <option value="todos">Todos los planes</option>
          {PLANES.map((p) => (
            <option key={p} value={p} className="capitalize">{p}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Negocio</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Plan</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Estado</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Registrado</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    No se encontraron negocios.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">/{c.slug} · {c.whatsapp}</p>
                  </td>

                  <td className="px-5 py-3.5">
                    {cambiandoPlan === c.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue={c.plan}
                          onChange={(e) => handleChangePlan(c.id, e.target.value as PlanTipo)}
                          disabled={loading === c.id}
                          className="border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        >
                          {PLANES.map((p) => (
                            <option key={p} value={p} className="capitalize">{p}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setCambiandoPlan(null)}
                          className="text-xs text-muted-foreground hover:text-muted-foreground"
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
                          <ToggleRight className="w-5 h-5 text-success" />
                          <span className="text-success font-medium">Activo</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                          <span className="text-muted-foreground">Inactivo</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
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
                      className="inline-flex items-center gap-1 text-primary hover:text-primary font-medium text-xs"
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
