"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Comercio, PlanTipo } from "@/types/database";
import { PLAN_LIMITES, PRECIOS_PLAN, ILIMITADO } from "@/types/database";

const perfilSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  descripcion: z.string().optional(),
  whatsapp: z.string().regex(/^\d{9}$/, "9 dígitos sin el 0 (ej: 981123456)"),
  rubro: z.string().optional(),
  direccion: z.string().optional(),
  horario_atencion: z.string().optional(),
  // Se valida que sea un enlace real: un texto suelto acá produce un botón
  // "Cómo llegar" que no lleva a ninguna parte, peor que no mostrarlo.
  maps_url: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//.test(v),
      "Pegá el enlace completo, empezando con https://"
    ),
});

const passwordSchema = z
  .object({
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "No coinciden",
    path: ["confirmPassword"],
  });

type PerfilForm = z.infer<typeof perfilSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const RUBROS = [
  "Despensa / Almacén",
  "Ropa y accesorios",
  "Restaurante / Comida",
  "Ferretería",
  "Farmacia / Salud",
  "Electrónica",
  "Cosmética / Belleza",
  "Otro",
];

function planLabel(plan: PlanTipo): string {
  const limites = PLAN_LIMITES[plan];
  const prods = limites.productos >= ILIMITADO ? "Ilimitados" : `${limites.productos}`;
  const cats = limites.catalogos >= ILIMITADO ? "ilimitados" : `${limites.catalogos}`;
  const imgs = `${limites.imagenes} img/producto`;
  const precio = PRECIOS_PLAN[plan];
  const precioStr = precio === 0 ? "Gratis" : `Gs. ${new Intl.NumberFormat("es-PY").format(precio)}/mes`;
  return `${prods} productos · ${cats} catálogos · ${imgs} — ${precioStr}`;
}

const PLANES_ORDERED: PlanTipo[] = ["basico", "pro", "plus", "business"];
const PLAN_NOMBRES: Record<PlanTipo, string> = {
  basico: "Básico",
  pro: "Pro",
  plus: "Plus",
  business: "Business",
};

interface Props {
  comercio: Comercio;
  userEmail: string;
  planPendiente?: PlanTipo | null;
}

export default function ConfiguracionClient({ comercio, userEmail, planPendiente }: Props) {
  const supabase = createClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(comercio.logo_url);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanTipo | null>(null);
  const [solicitudEnviada, setSolicitudEnviada] = useState<PlanTipo | null>(planPendiente ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const perfilForm = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nombre: comercio.nombre,
      descripcion: comercio.descripcion ?? "",
      whatsapp: comercio.whatsapp,
      rubro: comercio.rubro ?? "",
      direccion: comercio.direccion ?? "",
      horario_atencion: comercio.horario_atencion ?? "",
      maps_url: comercio.maps_url ?? "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El logo no puede superar 10MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function onSubmitPerfil(data: PerfilForm) {
    setLoadingPerfil(true);
    try {
      let logo_url = comercio.logo_url;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${comercio.id}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) {
          toast.error("Error al subir el logo");
          return;
        }
        const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
        logo_url = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("comercios")
        .update({
          nombre: data.nombre,
          descripcion: data.descripcion || null,
          whatsapp: data.whatsapp,
          rubro: data.rubro || null,
          direccion: data.direccion || null,
          horario_atencion: data.horario_atencion?.trim() || null,
          maps_url: data.maps_url?.trim() || null,
          logo_url,
        })
        .eq("id", comercio.id);

      if (error) { toast.error("Error al guardar"); return; }
      toast.success("Perfil actualizado");
    } finally {
      setLoadingPerfil(false);
    }
  }

  async function onSubmitPassword(data: PasswordForm) {
    setLoadingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setLoadingPassword(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña actualizada");
    passwordForm.reset();
  }

  async function handleUpgradePlan(plan: PlanTipo) {
    if (plan === "basico") return;
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/suscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Error al enviar la solicitud");
        return;
      }
      setSolicitudEnviada(plan);
      toast.success(`Solicitud para plan ${PLAN_NOMBRES[plan]} enviada. El administrador la activará pronto.`);
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* Perfil */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="font-semibold text-foreground mb-4">Datos del negocio</h2>

        {/* Logo */}
        <div className="flex items-center gap-4 mb-6">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-full border-2 border-dashed cursor-pointer hover:border-primary overflow-hidden flex items-center justify-center bg-muted"
          >
            {logoPreview ? (
              <Image src={logoPreview} alt="Logo" width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              <Upload className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Logo del negocio</p>
            <p className="text-xs text-muted-foreground">JPG, PNG · máx 10MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
        </div>

        <form onSubmit={perfilForm.handleSubmit(onSubmitPerfil)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email (no editable)</label>
            <input value={userEmail} disabled className="w-full px-3 py-2 border rounded-lg text-sm bg-muted text-muted-foreground" />
          </div>

          {[
            { name: "nombre" as const, label: "Nombre del negocio", type: "text" },
            { name: "whatsapp" as const, label: "WhatsApp (9 dígitos sin 0)", type: "tel" },
          ].map(({ name, label, type }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
              <input
                {...perfilForm.register(name)}
                type={type}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {perfilForm.formState.errors[name] && (
                <p className="text-xs text-destructive mt-1">{perfilForm.formState.errors[name]?.message}</p>
              )}
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Dirección física (opcional)</label>
            <input
              {...perfilForm.register("direccion")}
              type="text"
              placeholder="Ej: Av. Mariscal López 1234, Asunción"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Se mostrará en tu catálogo público si la completás.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Ubicación en Google Maps (opcional)
            </label>
            <input
              {...perfilForm.register("maps_url")}
              type="url"
              placeholder="https://maps.app.goo.gl/..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {perfilForm.formState.errors.maps_url && (
              <p className="text-xs text-destructive mt-1">
                {perfilForm.formState.errors.maps_url.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Abrí tu local en Google Maps, tocá <strong>Compartir</strong> y pegá el
              enlace acá. Lleva al comprador al punto exacto.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Horario de atención (opcional)
            </label>
            <textarea
              {...perfilForm.register("horario_atencion")}
              rows={3}
              placeholder={"Ej: Lunes a viernes de 8:00 a 18:00\nSábados de 8:00 a 12:00\nDomingos cerrado"}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Escribilo como quieras: se muestra tal cual, respetando los saltos de línea.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Rubro</label>
            <select
              {...perfilForm.register("rubro")}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccioná un rubro</option>
              {RUBROS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descripción</label>
            <textarea
              {...perfilForm.register("descripcion")}
              rows={3}
              placeholder="Breve descripción de tu negocio..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loadingPerfil}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60 text-sm"
          >
            {loadingPerfil ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </section>

      {/* Cambiar contraseña */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="font-semibold text-foreground mb-4">Cambiar contraseña</h2>
        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
          {(["password", "confirmPassword"] as const).map((name) => (
            <div key={name}>
              <label className="block text-sm font-medium text-foreground mb-1">
                {name === "password" ? "Nueva contraseña" : "Confirmar"}
              </label>
              <input
                {...passwordForm.register(name)}
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {passwordForm.formState.errors[name] && (
                <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors[name]?.message}</p>
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={loadingPassword}
            className="w-full rounded-md bg-nav py-2.5 text-sm font-medium text-nav-foreground hover:bg-nav/90 disabled:opacity-60"
          >
            {loadingPassword ? "Actualizando..." : "Cambiar contraseña"}
          </button>
        </form>
      </section>

      {/* Plan */}
      <section id="plan" className="bg-card rounded-xl border p-6">
        <h2 className="font-semibold text-foreground mb-4">Plan actual</h2>
        <div className="space-y-3">
          {PLANES_ORDERED.map((key) => (
            <div
              key={key}
              className={`p-4 rounded-xl border-2 transition-colors ${
                comercio.plan === key ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {PLAN_NOMBRES[key]}
                    {comercio.plan === key && (
                      <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                        Actual
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{planLabel(key)}</p>
                </div>
              </div>
              {comercio.plan !== key && key !== "basico" && (
                solicitudEnviada === key ? (
                  <div className="mt-3 w-full py-2 bg-cat-ambar-fondo border border-cat-ambar/30 text-cat-ambar rounded-lg text-xs font-semibold text-center">
                    ⏳ Solicitud pendiente — el admin la activará pronto
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgradePlan(key)}
                    disabled={loadingPlan === key || solicitudEnviada !== null}
                    className="mt-3 w-full py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
                  >
                    {loadingPlan === key ? "Enviando solicitud..." : `Solicitar plan ${PLAN_NOMBRES[key]}`}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
