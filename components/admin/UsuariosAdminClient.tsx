"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { updateUserStatus } from "@/app/admin/actions";
import type { UserStatus, PlanTipo } from "@/types/database";

type ComercioInfo = {
  user_id: string;
  plan: PlanTipo;
  activo: boolean;
  nombre: string;
} | null;

type UserRow = {
  uid: string;
  email: string;
  slug: string | null;
  business_name: string | null;
  role: string;
  status: string;
  created_at: string;
  comercio: ComercioInfo;
};

const STATUS_OPTIONS: { value: UserStatus; label: string; color: string }[] = [
  { value: "active",           label: "Activo",     color: "bg-green-100 text-green-700 border-green-200" },
  { value: "pending_approval", label: "Pendiente",  color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "blocked",          label: "Bloqueado",  color: "bg-red-100 text-red-700 border-red-200" },
  { value: "blocked_unpaid",   label: "Deuda",      color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "suspended",        label: "Suspendido", color: "bg-gray-100 text-gray-600 border-gray-200" },
];

const PLAN_COLORS: Record<PlanTipo, string> = {
  basico:   "bg-gray-100 text-gray-700",
  pro:      "bg-blue-100 text-blue-700",
  plus:     "bg-purple-100 text-purple-700",
  business: "bg-orange-100 text-orange-700",
};

function statusInfo(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? { label: s, color: "bg-gray-100 text-gray-600 border-gray-200" };
}

interface Props { users: UserRow[] }

export default function UsuariosAdminClient({ users: initial }: Props) {
  const [users, setUsers] = useState(initial);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "todos">("todos");
  const [changingUid, setChangingUid] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = users.filter((u) => {
    const matchSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.business_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.comercio?.nombre ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleStatusChange(uid: string, newStatus: UserStatus) {
    startTransition(async () => {
      try {
        await updateUserStatus(uid, newStatus);
        setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, status: newStatus } : u));
        toast.success("Estado actualizado");
      } catch {
        toast.error("Error al actualizar estado");
      } finally {
        setChangingUid(null);
      }
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
            placeholder="Buscar por email, nombre o negocio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as UserStatus | "todos")}
          className="px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          <option value="todos">Todos los estados</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Usuario</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Negocio</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
              {filtered.map((u) => {
                const info = statusInfo(u.status);
                const isChanging = changingUid === u.uid;
                const plan = u.comercio?.plan;
                return (
                  <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 text-sm">{u.email}</p>
                      {u.slug && <p className="text-xs text-gray-400">/{u.slug}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      {u.comercio ? (
                        <div>
                          <p className="text-sm text-gray-800 font-medium">{u.comercio.nombre}</p>
                          <span className={`text-[10px] font-medium ${u.comercio.activo ? "text-green-600" : "text-red-400"}`}>
                            {u.comercio.activo ? "● activo" : "● inactivo"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin negocio</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {plan ? (
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${PLAN_COLORS[plan]}`}>
                          {plan}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium text-gray-500 capitalize">{u.role}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {isChanging ? (
                        <select
                          defaultValue={u.status}
                          onChange={(e) => handleStatusChange(u.uid, e.target.value as UserStatus)}
                          disabled={isPending}
                          autoFocus
                          onBlur={() => setChangingUid(null)}
                          className="border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setChangingUid(u.uid)}
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border hover:opacity-80 transition-opacity ${info.color}`}
                        >
                          {info.label}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString("es-PY", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
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
