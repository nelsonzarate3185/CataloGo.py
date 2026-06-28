"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);
    if (error) {
      toast.error("Email o contraseña incorrectos");
      return;
    }
    router.push("/dashboard");
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) {
      toast.error("Error al iniciar sesión con Google");
      setGoogleLoading(false);
    }
  }

  const isDisabled = loading || googleLoading;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#e9ebe4" }}>
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center" style={{ background: "#0f1c2e" }}>
        <Link href="/" className="flex items-baseline gap-[2px]">
          <span className="font-heading text-[22px] text-white">Catalo</span>
          <span className="font-heading text-[22px] text-primary">Go</span>
          <span className="text-[11px] text-[#8aa0b6] font-bold ml-1">.py</span>
        </Link>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-[14px] p-8 shadow-card-md">
          <h1 className="font-heading text-[26px] font-extrabold text-foreground mb-1">
            Iniciá sesión
          </h1>
          <p className="text-[14px] text-muted-foreground mb-6">
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="font-semibold text-brand-blue hover:underline">
              Registrate gratis
            </Link>
          </p>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isDisabled}
            className="w-full flex items-center justify-center gap-3 py-[11px] border border-sage-300 rounded-[10px] text-[14px] font-semibold text-foreground hover:bg-sage-50 disabled:opacity-60 mb-5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Redirigiendo..." : "Ingresar con Google"}
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-sage-300" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-white px-3">o ingresá con email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[13.5px] font-semibold text-foreground mb-1.5">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="tu@email.com"
                className="w-full px-3 py-[10px] border border-sage-300 rounded-[9px] text-[14px] outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13.5px] font-semibold text-foreground">
                  Contraseña
                </label>
                <Link href="/recuperar" className="text-[12px] text-brand-blue hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-[10px] border border-sage-300 rounded-[9px] text-[14px] outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full py-[12px] rounded-[24px] font-extrabold text-[14.5px] disabled:opacity-60 transition-opacity mt-1"
              style={{ background: "#f6a623", color: "#1b2733" }}
            >
              {loading ? "Iniciando..." : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
