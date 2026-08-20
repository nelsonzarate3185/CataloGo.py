export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RegistroForm from "@/components/auth/RegistroForm";

/**
 * Alta de comercio.
 *
 * Server Component a propósito: el formulario cambia según haya sesión o no
 * (quien ya tiene cuenta no debe ver campos de email y contraseña), y resolver
 * eso en el cliente obliga a mostrar un estado de carga antes del formulario.
 *
 * Además cierra el bucle que dejaba atrapado al usuario: si ya tiene comercio,
 * acá no tiene nada que hacer y se lo manda al panel.
 */
export default async function RegistroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: comercio } = await supabase
      .from("comercios")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (comercio) redirect("/dashboard");
  }

  return <RegistroForm usuarioId={user?.id ?? null} />;
}
