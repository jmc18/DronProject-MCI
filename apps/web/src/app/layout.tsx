import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

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
      <body className={`${orbitron.variable} font-orbitron antialiased`}>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
