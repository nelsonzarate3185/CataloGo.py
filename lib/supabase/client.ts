import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { leerConfigSupabase } from "./config";

export function createClient() {
  // La validación nombra la variable y muestra el valor. El error propio de
  // Supabase ("Invalid supabaseUrl") no dice cuál de las dos falla ni con qué
  // valor, y aparece recién al pulsar un botón.
  const { url, anonKey } = leerConfigSupabase();
  return createBrowserClient<Database>(url, anonKey);
}
