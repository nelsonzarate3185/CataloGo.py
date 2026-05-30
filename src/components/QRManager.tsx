import React, { useState } from 'react';
import { QrCode, Clipboard, Check, Download, ExternalLink, Share2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface QRManagerProps {
  businessName: string;
  slug: string;
}

export default function QRManager({ businessName, slug }: QRManagerProps) {
  const [copied, setCopied] = useState(false);

  // Generate the target URL matching our pathname / query routing
  const shareUrl = `${window.location.origin}?slug=${slug || 'vendedor'}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="qr-manager-root" className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Código QR y Compartir</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Descarga tu QR exclusivo para colocarlo en mesas, vitrinas o empaques de tus productos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xs">
        {/* Visual QR Code Display Card */}
        <div className="flex flex-col items-center justify-center p-6 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl space-y-4">
          <div className="w-52 h-52 bg-white rounded-xl shadow-md border border-slate-150 p-3 relative group overflow-hidden flex items-center justify-center">
            <img 
              src={qrCodeUrl} 
              alt={`QR Code para ${businessName}`} 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#7C8B9E]">Escanear con celular</span>
        </div>

        {/* Content details and actions */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <Sparkles size={12} className="animate-pulse" />
              <span>Tu Catálogo está en Línea</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{businessName || 'Tu Negocio'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Los compradores que escaneen este código QR serán dirigidos directamente a tu catálogo digital, sin necesidad de descargar ninguna aplicación de terceros.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Enlace de tu Catálogo</label>
            <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
              <span className="px-3 py-2.5 text-slate-550 select-all truncate flex-1 min-w-0">
                {shareUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold px-4 cursor-pointer flex items-center gap-1.5 shrink-0 transition"
              >
                {copied ? <Check size={14} /> : <Clipboard size={14} />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href={qrCodeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-[140px] h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
            >
              <Download size={14} />
              <span>Descargar Imagen</span>
            </a>
            
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-[140px] h-10 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <ExternalLink size={14} />
              <span>Ver Catálogo</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
