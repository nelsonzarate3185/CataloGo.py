import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un número en guaraníes: 150000 → "Gs. 150.000" */
export function formatGS(amount: number): string {
  return `Gs. ${Math.round(amount).toLocaleString("es-PY")}`;
}

/** Genera un slug URL-friendly a partir de un string */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
