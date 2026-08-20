"use client";

export const dynamic = 'force-dynamic';

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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { nombre: data.nombre } },
      });

      if (authError || !authData.user) {
        toast.error(authError?.message ?? "Error al crear la cuenta");
        return;
      }

      if (authData.session) {
        await supabase.auth.setSession({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        });
      } else {
        toast.error("Activá la confirmación de email deshabilitada en Supabase Auth.");
        return;
      }

      const suffix = Math.random().toString(36).slice(2, 6);
      const slug = `${slugify(data.nombre)}-${suffix}`;

      const { error: comercioError } = await supabase.from("comercios").insert({
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

  const fields: {
    name: keyof Form;
    label: string;
    type: string;
    placeholder: string;
  }[] = [
    { name: "nombre", label: "Nombre del negocio", type: "text", placeholder: "Ej: Despensa Don Carlos" },
    { name: "whatsapp", label: "Número WhatsApp (sin 0)", type: "tel", placeholder: "Ej: 981123456" },
    { name: "email", label: "Email", type: "email", placeholder: "tu@email.com" },
    { name: "password", label: "Contraseña", type: "password", placeholder: "••••••••" },
    { name: "confirmPassword", label: "Confirmar contraseña", type: "password", placeholder: "••••••••" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center bg-nav px-6 py-4">
        <Link href="/" className="flex items-baseline gap-[2px]">
          <span className="font-heading text-[22px] text-white">Catalo</span>
          <span className="font-heading text-[22px] text-primary">Go</span>
          <span className="text-[11px] text-white/50 font-bold ml-1">.py</span>
        </Link>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-card rounded-[14px] p-8 shadow-card-md">
          <h1 className="font-heading text-[26px] font-extrabold text-foreground mb-1">
            Creá tu catálogo gratis
          </h1>
          <p className="text-[14px] text-muted-foreground mb-6">
            ¿Ya tenés cuenta?{" "}
            {/* `?cambiar=1` evita que el middleware rebote a /dashboard cuando
                hay una sesión abierta. Sin eso, quien llega acá con sesión no
                puede volver al formulario de login. */}
            <Link href="/login?cambiar=1" className="font-semibold text-link hover:underline">
              Iniciá sesión
            </Link>
          </p>

          <p className="mb-6 text-[13px] text-muted-foreground">
            ¿Llegaste acá con la sesión de otra cuenta?{" "}
            <Link href="/logout" className="font-semibold text-link hover:underline">
              Cerrá sesión
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {fields.map(({ name, label, type, placeholder }) => (
              <div key={name}>
                <label className="block text-[13.5px] font-semibold text-foreground mb-1.5">
                  {label}
                </label>
                <input
                  {...register(name)}
                  type={type}
                  placeholder={placeholder}
                  className="w-full px-3 py-[10px] border border-sage-300 rounded-[9px] text-[14px] outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
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
              className="w-full py-[12px] rounded-[24px] font-extrabold text-[14.5px] disabled:opacity-60 transition-opacity mt-2 bg-primary text-primary-foreground"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
