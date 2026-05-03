"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const registroSchema = z
  .object({
    nombre: z.string().min(2, "Mínimo 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegistroForm = z.infer<typeof registroSchema>;

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistroForm>({ resolver: zodResolver(registroSchema) });

  async function onSubmit(data: RegistroForm) {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { nombre: data.nombre },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("¡Cuenta creada! Revisá tu email para confirmar.");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Creá tu cuenta gratis
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-primary font-medium">
            Iniciá sesión
          </Link>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            {
              name: "nombre" as const,
              label: "Nombre completo",
              type: "text",
              placeholder: "Juan Pérez",
            },
            {
              name: "email" as const,
              label: "Email",
              type: "email",
              placeholder: "tu@email.com",
            },
            {
              name: "password" as const,
              label: "Contraseña",
              type: "password",
              placeholder: "••••••••",
            },
            {
              name: "confirmPassword" as const,
              label: "Confirmar contraseña",
              type: "password",
              placeholder: "••••••••",
            },
          ].map(({ name, label, type, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              <input
                {...register(name)}
                type={type}
                placeholder={placeholder}
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
            {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
          </button>
        </form>
      </div>
    </div>
  );
}
