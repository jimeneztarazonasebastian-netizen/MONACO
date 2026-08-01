import type { Metadata } from "next";
import { Archivo, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Archivo({
  variable: "--fuente-display",
  subsets: ["latin"],
  axes: ["wdth"],
});

const cuerpo = Manrope({
  variable: "--fuente-cuerpo",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--fuente-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Mónaco",
    template: "%s · Mónaco",
  },
  description: "Ropa deportiva. Barrancabermeja, Colombia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${display.variable} ${cuerpo.variable} ${mono.variable} bg-negro text-blanco`}
      >
        {children}
      </body>
    </html>
  );
}
