"use client";

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

const schema = z
  .object({
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type Form = z.infer<typeof schema>;

function ActualizarPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    if (!oobCode) {
      toast.error("Enlace inválido o expirado. Solicitá uno nuevo.");
      return;
    }
    setLoading(true);
    try {
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, data.password);
      toast.success("Contraseña actualizada correctamente");
      router.push("/login");
    } catch {
      toast.error("El enlace expiró o es inválido. Solicitá uno nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (!oobCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-xl border p-8 shadow-sm text-center">
          <p className="text-gray-500 text-sm mb-4">
            Enlace inválido o expirado.
          </p>
          <Link href="/recuperar" className="text-primary text-sm font-medium">
            Solicitá un nuevo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Nueva contraseña
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {(["password", "confirmPassword"] as const).map((name) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {name === "password" ? "Nueva contraseña" : "Confirmar contraseña"}
              </label>
              <input
                {...register(name)}
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors[name] && (
                <p className="text-xs text-red-500 mt-1">
                  {errors[name]?.message}
                </p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ActualizarPasswordPage() {
  return (
    <Suspense>
      <ActualizarPasswordForm />
    </Suspense>
  );
}
