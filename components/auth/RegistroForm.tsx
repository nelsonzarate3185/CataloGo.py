"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { crearComercioConCatalogo } from "@/lib/comercios";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  whatsapp: z
    .string()
    .regex(/^\d{9}$/, "Ingresá 9 dígitos sin el 0 inicial (ej: 981123456)"),
  email: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

type Form = z.infer<typeof schema>;

/**
 * Con sesión abierta sólo faltan los datos de la tienda: la cuenta ya existe.
 * Es el caso de quien entró con Google, que nunca pasó por este formulario y
 * por lo tanto no tiene comercio.
 */
function schemaPara(tieneSesion: boolean) {
  if (tieneSesion) return schema;

  return schema.superRefine((d, ctx) => {
    if (!d.email || !z.string().email().safeParse(d.email).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Email inválido" });
    }
    if (!d.password || d.password.length < 6) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Mínimo 6 caracteres" });
    }
    if (d.password !== d.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden",
      });
    }
  });
}

/**
 * La sesión llega resuelta desde el servidor. Resolverla en el cliente obligaba
 * a mostrar "Cargando…" antes del formulario, y el formulario correcto depende
 * de ella: quien ya tiene cuenta no debe ver campos de email y contraseña.
 */
export default function RegistroForm({ usuarioId }: { usuarioId: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const tieneSesion = usuarioId !== null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schemaPara(tieneSesion)) });

  async function onSubmit(data: Form) {
    setLoading(true);
    try {
      let idUsuario = usuarioId;

      // Sin sesión hay que crear la cuenta primero. Con sesión ya existe y sólo
      // falta la tienda.
      if (!idUsuario) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email!,
          password: data.password!,
          options: { data: { nombre: data.nombre } },
        });

        if (authError || !authData.user) {
          toast.error(authError?.message ?? "Error al crear la cuenta");
          return;
        }

        if (!authData.session) {
          toast.error("Desactivá la confirmación de email en Supabase Auth.");
          return;
        }

        await supabase.auth.setSession({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        });

        idUsuario = authData.user.id;
      }

      const resultado = await crearComercioConCatalogo(supabase, {
        userId: idUsuario,
        nombre: data.nombre,
        whatsapp: data.whatsapp,
      });

      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }

      toast.success(tieneSesion ? "¡Tu tienda está lista!" : "¡Cuenta creada!");
      router.push("/dashboard");
      router.refresh();
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
    // Con sesión abierta la cuenta ya existe: pedir email y contraseña de nuevo
    // haría fallar el alta con "usuario ya registrado".
    ...(tieneSesion
      ? []
      : [
          { name: "email" as const, label: "Email", type: "email", placeholder: "tu@email.com" },
          { name: "password" as const, label: "Contraseña", type: "password", placeholder: "••••••••" },
          { name: "confirmPassword" as const, label: "Confirmar contraseña", type: "password", placeholder: "••••••••" },
        ]),
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
            {tieneSesion ? "Completá tu tienda" : "Creá tu catálogo gratis"}
          </h1>
          <p className="text-[14px] text-muted-foreground mb-6">
            {tieneSesion ? (
              "Tu cuenta ya existe pero todavía no tiene tienda. Cargá estos dos datos y entrás al panel."
            ) : (
              <>
                ¿Ya tenés cuenta?{" "}
                {/* `?cambiar=1` evita que el middleware rebote a /dashboard
                    cuando hay una sesión abierta. */}
                <Link href="/login?cambiar=1" className="font-semibold text-link hover:underline">
                  Iniciá sesión
                </Link>
              </>
            )}
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
