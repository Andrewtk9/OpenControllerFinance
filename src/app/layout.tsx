import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenControllerFinance",
  description: "Suas finanças pessoais, sincronizadas via Open Finance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* credenciais embutidas no APK pessoal (arquivo fora do git) */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/config.local.js"></script>
      </head>
      <body className="flex min-h-full flex-col bg-slate-950 text-slate-200">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
