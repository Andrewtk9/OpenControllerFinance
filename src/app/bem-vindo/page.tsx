import type { Metadata } from "next";
import { setProfileType } from "@/app/actions";

export const metadata: Metadata = {
  title: "Bem-vindo — OpenControllerFinance",
};

export const dynamic = "force-dynamic";

// Tela limpa de onboarding: overlay em tela cheia (cobre o nav do layout).
export default function BemVindoPage() {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950">
      {/* brilho decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-500/10 to-transparent"
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl text-emerald-400">
            ₪
          </span>
          <span className="text-2xl font-bold tracking-tight text-slate-50">
            OpenController<span className="text-emerald-400">Finance</span>
          </span>
        </div>

        <h1 className="mt-8 text-center text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
          Bem-vindo! 👋
        </h1>
        <p className="mt-3 max-w-xl text-center text-base leading-7 text-slate-400">
          Suas finanças sincronizadas automaticamente via Open Finance.
          Antes de começar, conta pra gente:
        </p>

        <h2 className="mt-10 text-lg font-semibold text-slate-200">
          Como você vai usar?
        </h2>

        <div className="mt-6 grid w-full gap-5 sm:grid-cols-2">
          {/* Pessoa Física */}
          <form action={setProfileType} className="contents">
            <input type="hidden" name="profileType" value="personal" />
            <button
              type="submit"
              className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:border-emerald-500/60 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl">
                👤
              </span>
              <span className="text-lg font-semibold text-slate-50">
                Pessoa Física
              </span>
              <ul className="space-y-1.5 text-sm leading-6 text-slate-400">
                <li>• Controle de gastos pessoais</li>
                <li>• Orçamento mensal e alertas</li>
                <li>• Faturas de cartão de crédito</li>
              </ul>
              <span className="mt-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                Começar como Pessoa Física →
              </span>
            </button>
          </form>

          {/* Empresa */}
          <form action={setProfileType} className="contents">
            <input type="hidden" name="profileType" value="business" />
            <button
              type="submit"
              className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:border-emerald-500/60 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl">
                🏢
              </span>
              <span className="flex items-center gap-2 text-lg font-semibold text-slate-50">
                Empresa
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                  plano Empresa
                </span>
              </span>
              <ul className="space-y-1.5 text-sm leading-6 text-slate-400">
                <li>• Tudo do uso pessoal</li>
                <li>• Visão de faturamento × lucro líquido</li>
                <li>
                  • Módulo de contabilidade{" "}
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                    em breve
                  </span>
                </li>
              </ul>
              <span className="mt-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                Começar como Empresa →
              </span>
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Você pode mudar isso depois. Empresas são direcionadas aos planos —
          nada é cobrado nesta etapa.
        </p>
      </div>
    </div>
  );
}
