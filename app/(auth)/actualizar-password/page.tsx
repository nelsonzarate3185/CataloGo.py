"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

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

export default function ActualizarPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setLoading(true);
  // El cliente se construye dentro de los manejadores y no en el cuerpo del
  // componente: el cuerpo también corre durante el prerender del servidor, y
  // ahí `createBrowserClient` lanza si faltan las variables de entorno,
  // tumbando el build entero. Los manejadores sólo corren en el navegador.
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada correctamente");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md bg-card rounded-xl border p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Nueva contraseña
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {(["password", "confirmPassword"] as const).map((name) => (
            <div key={name}>
              <label className="block text-sm font-medium text-foreground mb-1">
                {name === "password" ? "Nueva contraseña" : "Confirmar contraseña"}
              </label>
              <input
                {...register(name)}
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors[name] && (
                <p className="text-xs text-destructive mt-1">
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
