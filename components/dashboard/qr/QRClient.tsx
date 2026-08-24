"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, ExternalLink } from "lucide-react";

interface Props {
  url: string;
  comercioNombre: string;
}

export default function QRClient({ url, comercioNombre }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    async function generate() {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        // Negro sobre blanco: el contraste máximo es requisito para que los
        // lectores de QR funcionen. No usar tokens de tema acá.
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
    }
    generate();
  }, [url]);

  async function descargarPNG() {
    const res = await fetch(
      `/api/qr?slug=${encodeURIComponent(url.split("/c/")[1] ?? "")}`
    );
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${comercioNombre}.png`;
    a.click();
  }

  return (
    <div className="max-w-md">
      <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card p-5 sm:p-8">
        {qrDataUrl ? (
          <div className="border-4 border-nav rounded-xl overflow-hidden">
            <Image src={qrDataUrl} alt="QR" width={256} height={256} />
          </div>
        ) : (
          <div className="w-64 h-64 bg-muted rounded-xl animate-pulse" />
        )}

        <div className="text-center">
          <p className="font-semibold text-foreground">{comercioNombre}</p>
          <p className="text-xs text-muted-foreground mt-1 break-all">{url}</p>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={descargarPNG}
            disabled={!qrDataUrl}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 text-sm"
          >
            <Download className="w-4 h-4" />
            Descargar PNG (800×800)
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 border rounded-lg font-medium hover:bg-muted text-sm text-foreground"
          >
            <ExternalLink className="w-4 h-4" />
            Ver catálogo
          </a>
        </div>
      </div>
    </div>
  );
}
