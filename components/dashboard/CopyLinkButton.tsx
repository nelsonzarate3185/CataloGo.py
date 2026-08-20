"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" onClick={handleCopy} className="shrink-0">
      {copied ? (
        <>
          <Check className="size-4 text-success" aria-hidden="true" />
          <span className="text-success">Copiado</span>
        </>
      ) : (
        <>
          <Copy className="size-4" aria-hidden="true" />
          Copiar
        </>
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? "Enlace copiado al portapapeles" : ""}
      </span>
    </Button>
  );
}
