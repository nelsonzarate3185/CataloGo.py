"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { collection, addDoc, getDocs, query, where, limit } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { slugify } from "@/lib/utils";

// Schema for users already authenticated (e.g. Google) — only need business info
const schemaConCuenta = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  whatsapp: z.string().regex(/^\d{9}$/, "Ingresá 9 dígitos sin el 0 inicial (ej: 981123456)"),
});

// Schema for brand-new users signing up with email+password
const schemaNuevaCuenta = z
  .object({
    nombre: z.string().min(2, "Mínimo 2 caracteres"),
    whatsapp: z.string().regex(/^\d{9}$/, "Ingresá 9 dígitos sin el 0 inicial (ej: 981123456)"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormConCuenta = z.infer<typeof schemaConCuenta>;
type FormNuevaCuenta = z.infer<typeof schemaNuevaCuenta>;

async function crearComercio(uid: string, nombre: string, whatsapp: string) {
  const now = new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 6);
  const slug = `${slugify(nombre)}-${suffix}`;

  const comercioRef = await addDoc(collection(db, "comercios"), {
    user_id: uid,
    nombre,
    slug,
    whatsapp,
    plan: "basico",
    activo: true,
    descripcion: null,
    logo_url: null,
    rubro: null,
    plan_expira_at: null,
    created_at: now,
    updated_at: now,
  });

  await addDoc(collection(db, "catalogos"), {
    comercio_id: comercioRef.id,
    nombre: "Mi catálogo",
    activo: true,
    descripcion: null,
    created_at: now,
    updated_at: now,
  });
}

// Form shown when user is already authenticated via Google
function CompletarPerfilForm({ user }: { user: User }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormConCuenta>({ resolver: zodResolver(schemaConCuenta) });

  async function onSubmit(data: FormConCuenta) {
    setLoading(true);
    try {
      await crearComercio(user.uid, data.nombre, data.whatsapp);
      toast.success("¡Catálogo creado!");
      router.push("/dashboard");
    } catch {
      toast.error("Error al crear el catálogo. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-xl border p-8 shadow-sm">
        <Link href="/" className="text-xl font-bold text-primary block mb-6">
          CataloGo
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Completá tu perfil
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Ingresaste con Google como{" "}
          <span className="font-medium text-gray-700">{user.email}</span>.
          Solo necesitamos los datos de tu negocio.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {([
            { name: "nombre" as const, label: "Nombre del negocio", type: "text", placeholder: "Ej: Despensa Don Carlos" },
            { name: "whatsapp" as const, label: "Número WhatsApp (sin 0)", type: "tel", placeholder: "Ej: 981123456" },
          ]).map(({ name, label, type, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                {...register(name)}
                type={type}
                placeholder={placeholder}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors[name] && (
                <p className="text-xs text-red-500 mt-1">{errors[name]?.message}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60 mt-2"
          >
            {loading ? "Creando catálogo..." : "Crear catálogo gratis"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Full registration form for new users (email + password)
function NuevaCuentaForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormNuevaCuenta>({ resolver: zodResolver(schemaNuevaCuenta) });

  async function onSubmit(data: FormNuevaCuenta) {
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        toast.error("Error al crear la sesión");
        return;
      }

      await crearComercio(credential.user.uid, data.nombre, data.whatsapp);
      toast.success("¡Cuenta creada!");
      router.push("/dashboard");
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        toast.error("Este email ya está registrado");
      } else {
        toast.error("Error al crear la cuenta");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        toast.error("Error al conectar con Google");
        return;
      }

      // onAuthStateChanged will detect the new user and switch to CompletarPerfilForm
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        toast.error("Error al registrarse con Google");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  const isDisabled = loading || googleLoading;

  const fields = [
    { name: "nombre" as const, label: "Nombre del negocio", type: "text", placeholder: "Ej: Despensa Don Carlos" },
    { name: "whatsapp" as const, label: "Número WhatsApp (sin 0)", type: "tel", placeholder: "Ej: 981123456" },
    { name: "email" as const, label: "Email", type: "email", placeholder: "tu@email.com" },
    { name: "password" as const, label: "Contraseña", type: "password", placeholder: "••••••••" },
    { name: "confirmPassword" as const, label: "Confirmar contraseña", type: "password", placeholder: "••••••••" },
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

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {googleLoading ? "Conectando..." : "Registrarse con Google"}
        </button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-white px-2">o registrate con email</span>
          </div>
        </div>

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
            disabled={isDisabled}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60 mt-2"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegistroPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If user already has a comercio, send them to dashboard
        const snap = await getDocs(
          query(collection(db, "comercios"), where("user_id", "==", user.uid), limit(1))
        );
        if (!snap.empty) {
          router.push("/dashboard");
          return;
        }
      }
      setAuthUser(user);
    });
    return () => unsubscribe();
  }, [router]);

  // Still checking auth state
  if (authUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Already authenticated (e.g. via Google) — only need business info
  if (authUser) {
    return <CompletarPerfilForm user={authUser} />;
  }

  // Not authenticated — full registration
  return <NuevaCuentaForm />;
}
