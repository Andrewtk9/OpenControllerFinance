"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, ensureSettingsSeeded } from "@/lib/local/db";
import { Nav } from "@/components/nav";
import { WelcomeScreen } from "@/components/welcome-screen";

// Casca client do app: lê settings via liveQuery e aplica o gate de onboarding
// ANTES de mostrar qualquer página.
//   carregando            → splash escura
//   profileType == null   → tela de boas-vindas (grava direto em db.settings)
//   senão                 → nav + página
export function AppShell({ children }: { children: React.ReactNode }) {
  // grava defaults + credenciais embutidas UMA vez, fora de liveQuery
  useEffect(() => {
    void ensureSettingsSeeded();
  }, []);

  // undefined = ainda carregando; sem linha no banco = DEFAULT_SETTINGS
  const settings = useLiveQuery(
    async () => (await db.settings.get(1)) ?? DEFAULT_SETTINGS,
    [],
  );

  if (settings === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
        <div className="flex animate-pulse items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl text-emerald-400">
            ₪
          </span>
          <span className="text-2xl font-bold tracking-tight text-slate-50">
            OpenController<span className="text-emerald-400">Finance</span>
          </span>
        </div>
      </div>
    );
  }

  if (settings.profileType == null) {
    return <WelcomeScreen />;
  }

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        OpenControllerFinance — dados sincronizados via Open Finance (Pluggy)
      </footer>
    </>
  );
}
