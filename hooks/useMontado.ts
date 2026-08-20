"use client";

import { useEffect, useState } from "react";

/**
 * Devuelve false en el render del servidor y en la primera pasada del cliente,
 * true después de montar.
 *
 * Necesario para todo lo que dependa del carrito: vive en localStorage, así que
 * el servidor no puede conocerlo y renderizarlo de entrada produce un error de
 * hidratación.
 */
export function useMontado(): boolean {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return montado;
}
