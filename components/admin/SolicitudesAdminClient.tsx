"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Search } from "lucide-react";
import { approveRequest, rejectRequest } from "@/app/admin/actions";
import type { PlanRequestStatus } from "@/types/database";

type SolicitudRow = {
  id: string;
  vendor_id: string;
  status: string;
  data: unknown;
  created_at: string;
  user: { uid: string; email: string; business_name: string | null } | null;
};

const statusInfo: Record<string, { label: string; color: string }> = {
  pending:  { label: "Pendiente",  color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Aprobado",   color: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado",  color: "bg-red-100 text-red-700" },
};

function getPlanId(data: unknown): string {
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    return String(d.plan_id ?? d.plan ?? d.new_plan ?? "—");
  }
  return "—";
}

function getCurrentPlan(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    return d.current_plan as string | undefined;
  }
  return undefined;
}

interface Props { solicitudes: SolicitudRow[] }

export default function SolicitudesAdminClient({ solicitudes: initial }: Props) {
  const [solicitudes, setSolicitudes] = useState(initial);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlanRequestStatus | "todos">("pending");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = solicitudes.filter((s) => {
    const email = s.user?.email ?? s.vendor_id;
    const matchSearch =
      email.toLowerCase().includes(search.toLowerCase()) ||
      (s.user?.business_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleAction(s: SolicitudRow, action: "approve" | "reject") {
    setLoadingId(s.id);
    const planId = getPlanId(s.data);
    const newStatus = action === "approve" ? "approved" : "rejected";

    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveRequest(s.id, s.vendor_id, planId !== "—" ? planId : "")
          : await rejectRequest(s.id);

      setLoadingId(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setSolicitudes((prev) =>
        prev.map((r) => r.id === s.id ? { ...r, status: newStatus } : r)
      );
      toast.success(
        action === "approve"
          ? "Solicitud aprobada y plan actualizado"
          : "Solicitud rechazada"
      );
    });
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por email o negocio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PlanRequestStatus | "todos")}
          className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          <option value="todos">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Usuario</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Plan actual</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Plan solicitado</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    No hay solicitudes.
                  </td>
                </tr>
              )}
              {filtered.map((s) => {
                const info = statusInfo[s.status] ?? { label: s.status, color: "bg-gray-100 text-gray-600" };
                const planId = getPlanId(s.data);
                const currentPlan = getCurrentPlan(s.data);
                const isLoading = loadingId === s.id;
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{s.user?.email ?? s.vendor_id}</p>
                      {s.user?.business_name && (
                        <p className="text-xs text-gray-400">{s.user.business_name}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 capitalize">
                        {currentPlan ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs bg-blue-50 px-2 py-0.5 rounded text-blue-700 font-semibold capitalize">
                        {planId}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${info.color}`}>
                        {info.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {new Date(s.created_at).toLocaleDateString("es-PY", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      {s.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(s, "approve")}
                            disabled={isLoading}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 disabled:opacity-40 transition-colors"
                          >
                            {isLoading ? (
                              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleAction(s, "reject")}
                            disabled={isLoading}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
