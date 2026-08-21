"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { urlCallbackAuth } from "@/lib/urls";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

type Form = z.infer<typeof schema>;

export default function RecuperarPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: urlCallbackAuth("/actualizar-password"),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="w-full max-w-md bg-card rounded-xl border p-8 shadow-sm text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Revisá tu email
          </h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un link para restablecer tu contraseña.
          </p>
          <Link
            href="/login"
            className="block mt-6 text-sm text-primary font-medium"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md bg-card rounded-xl border p-8 shadow-sm">
        <Link href="/" className="text-xl font-bold text-primary block mb-6">
          CataloGo
        </Link>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Recuperar contraseña
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Te enviamos un link a tu email para restablecerla.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="tu@email.com"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar link de recuperación"}
          </button>
        </form>

        <Link
          href="/login"
          className="block mt-4 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
