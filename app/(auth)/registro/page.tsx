"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";

const schema = z
  .object({
    nombre: z.string().min(2, "Mínimo 2 caracteres"),
    whatsapp: z
      .string()
      .regex(/^\d{9}$/, "Ingresá 9 dígitos sin el 0 inicial (ej: 981123456)"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type Form = z.infer<typeof schema>;

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setLoading(true);
    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: { data: { nombre: data.nombre } },
        });

      if (authError || !authData.user) {
        toast.error(authError?.message ?? "Error al crear la cuenta");
        return;
      }

      // 2. Generar slug único para el comercio
      const baseSlug = slugify(data.nombre);
      let slug = baseSlug;
      let attempt = 0;
      while (true) {
        const { data: existing } = await supabase
          .from("comercios")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!existing) break;
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      // 3. Crear registro en comercios
      const { error: comercioError } = await supabase
        .from("comercios")
        .insert({
          user_id: authData.user.id,
          nombre: data.nombre,
          slug,
          whatsapp: data.whatsapp,
          plan: "basico",
          activo: true,
        });

      if (comercioError) {
        toast.error("Error al crear el comercio: " + comercioError.message);
        return;
      }

      // 4. Crear catálogo por defecto
      const { data: comercioData } = await supabase
        .from("comercios")
        .select("id")
        .eq("user_id", authData.user.id)
        .single();

      if (comercioData) {
        await supabase.from("catalogos").insert({
          comercio_id: comercioData.id,
          nombre: "Mi catálogo",
          activo: true,
        });
      }

      toast.success("¡Cuenta creada! Revisá tu email para confirmar.");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    {
      name: "nombre" as const,
      label: "Nombre del negocio",
      type: "text",
      placeholder: "Ej: Despensa Don Carlos",
    },
    {
      name: "whatsapp" as const,
      label: "Número WhatsApp (sin 0)",
      type: "tel",
      placeholder: "Ej: 981123456",
    },
    { name: "email" as const, label: "Email", type: "email", placeholder: "tu@email.com" },
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
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-xl border p-8 shadow-sm">
        <Link href="/" className="text-xl font-bold text-primary block mb-6">
          CataloGo
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Creá tu catálogo gratis
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-primary font-medium">
            Iniciá sesión
          </Link>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map(({ name, label, type, placeholder }) => (
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
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60 mt-2"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
          </button>
        </form>
      </div>
    </div>
  );
}
