import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/db";
import { Nav } from "@/components/nav";

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

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let unreadCount = 0;
  let plan = "free";
  try {
    unreadCount = await prisma.notification.count({ where: { read: false } });
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (settings) plan = settings.plan;
  } catch {
    // DB ainda não criado — segue sem badge
  }

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-950 text-slate-200">
        <Nav unreadCount={unreadCount} plan={plan} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
          OpenControllerFinance — dados sincronizados via Open Finance (Pluggy)
        </footer>
      </body>
    </html>
  );
}
