import type { Metadata } from "next";
import { IBM_Plex_Sans, Orbitron, Source_Serif_4 } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const display = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "Monitoreo Vial con Drones",
  description:
    "Sistema de monitoreo de infraestructura vial mediante drones, IoT e IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${sans.variable} ${display.variable} ${orbitron.variable} font-sans antialiased`}>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
