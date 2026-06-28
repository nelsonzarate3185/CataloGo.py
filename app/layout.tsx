import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Public_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CataloGo",
    template: "%s | CataloGo",
  },
  applicationName: "CataloGo",
  description:
    "Crea tu catálogo digital, compartilo por WhatsApp y recibí pedidos organizados. Sin comisiones.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${jakartaSans.variable} ${publicSans.variable} font-body antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
