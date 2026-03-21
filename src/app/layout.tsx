import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MGK Transport - Gestion de Transport du Personnel",
  description: "Application de gestion de transport du personnel pour MGK Transport. Gestion des chauffeurs, véhicules, clients, facturation et tableau de bord analytique.",
  keywords: ["MGK Transport", "Gestion Transport", "Chauffeurs", "Véhicules", "Facturation"],
  authors: [{ name: "MGK Transport" }],
  icons: {
    icon: "/logo-mgk.png",
  },
  openGraph: {
    title: "MGK Transport - Gestion de Transport",
    description: "Application de gestion de transport du personnel",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
