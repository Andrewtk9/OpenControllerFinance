import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/budget";
import { PageHeader } from "@/components/ui";
import { choosePlan } from "@/app/actions";

export const metadata: Metadata = {
  title: "Planos — OpenControllerFinance",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type PlanDef = {
  id: "free" | "pro" | "business";
  name: string;
  monthly: string;
  yearly: string;
  priceNote?: string;
  highlight?: boolean;
  features: { text: string; soon?: boolean }[];
};

const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Grátis",
    monthly: "R$ 0",
    yearly: "R$ 0",
    features: [
      { text: "Até 3 bancos conectados via Open Finance" },
      { text: "Todas as funções: orçamento, faturas, análise" },
      { text: "Alertas e notificações" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: "R$ 5",
    yearly: "R$ 50",
    highlight: true,
    features: [
      { text: "Bancos conectados ilimitados" },
      { text: "Todas as funções: orçamento, faturas, análise" },
      { text: "Alertas e notificações" },
    ],
  },
  {
    id: "business",
    name: "Empresa",
    monthly: "R$ 19,90",
    yearly: "R$ 199",
    priceNote: "valor em definição",
    features: [
      { text: "Bancos conectados ilimitados" },
      { text: "Visão de faturamento × lucro líquido" },
      { text: "Módulo de contabilidade", soon: true },
    ],
  },
];

const PLAN_LABELS: Record<string, string> = {
  free: "Grátis",
  pro: "Pro",
  business: "Empresa",
};

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const cicloRaw = Array.isArray(sp.ciclo) ? sp.ciclo[0] : sp.ciclo;
  const anual = cicloRaw === "anual";
  const billing = anual ? "yearly" : "monthly";

  const settings = await getSettings();
  const currentPlan = settings.plan;
  const currentBilling = settings.planBilling;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos"
        subtitle="Escolha o plano ideal para o seu uso"
      />

      {/* Aviso: ativação local, sem cobrança */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm leading-6 text-amber-200">
        <span aria-hidden className="text-base">
          ⚠️
        </span>
        <p>
          <strong>Versão de desenvolvimento:</strong> a ativação de plano é
          local e <strong>sem cobrança</strong>. A integração de pagamento
          (Mercado Pago/Stripe) virá em breve.
        </p>
      </div>

      {/* Toggle mensal/anual */}
      <div className="flex items-center justify-center gap-2">
        <div className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          <Link
            href="/planos"
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              !anual
                ? "bg-slate-800 text-slate-50"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Mensal
          </Link>
          <Link
            href="/planos?ciclo=anual"
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              anual
                ? "bg-slate-800 text-slate-50"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Anual
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              2 meses grátis
            </span>
          </Link>
        </div>
      </div>

      {/* Cards de planos */}
      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent =
            currentPlan === plan.id &&
            (plan.id === "free" || currentBilling === billing);
          const isCurrentOtherBilling =
            currentPlan === plan.id && !isCurrent;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-slate-900/60 p-6 shadow-lg shadow-black/20 ${
                isCurrent || isCurrentOtherBilling
                  ? "border-emerald-500/60"
                  : plan.highlight
                    ? "border-emerald-500/40"
                    : "border-slate-800"
              }`}
            >
              {/* Badges no topo do card */}
              <div className="absolute -top-3 right-4 flex gap-2">
                {plan.highlight && !isCurrent && !isCurrentOtherBilling && (
                  <span className="rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-bold text-slate-950">
                    Mais popular
                  </span>
                )}
                {(isCurrent || isCurrentOtherBilling) && (
                  <span className="rounded-full border border-emerald-500/60 bg-slate-950 px-3 py-0.5 text-[11px] font-bold text-emerald-400">
                    Plano atual
                  </span>
                )}
              </div>

              <h2 className="text-lg font-semibold text-slate-50">
                {plan.name}
              </h2>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-slate-50">
                  {anual ? plan.yearly : plan.monthly}
                </span>
                {plan.id !== "free" && (
                  <span className="text-sm text-slate-400">
                    /{anual ? "ano" : "mês"}
                  </span>
                )}
              </div>
              {plan.priceNote && (
                <p className="mt-1 text-xs font-medium text-amber-400">
                  {plan.priceNote}
                </p>
              )}
              {plan.id !== "free" && anual && (
                <p className="mt-1 text-xs text-emerald-400">
                  Equivale a 10 meses — 2 meses grátis
                </p>
              )}

              <ul className="mt-5 flex-1 space-y-2.5 text-sm leading-6 text-slate-300">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2">
                    <span aria-hidden className="mt-0.5 text-emerald-400">
                      ✓
                    </span>
                    <span>
                      {f.text}
                      {f.soon && (
                        <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                          em breve
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <div className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-center text-sm font-semibold text-emerald-400">
                    ✓ Plano ativo
                    {currentBilling && plan.id !== "free" && (
                      <span className="font-normal text-emerald-300">
                        {" "}
                        ({currentBilling === "yearly" ? "anual" : "mensal"})
                      </span>
                    )}
                  </div>
                ) : (
                  <form action={choosePlan}>
                    <input type="hidden" name="plan" value={plan.id} />
                    <input type="hidden" name="billing" value={billing} />
                    <button
                      type="submit"
                      className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                        plan.highlight
                          ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                          : "border border-slate-700 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      {isCurrentOtherBilling
                        ? `Mudar para ${anual ? "anual" : "mensal"}`
                        : plan.id === "free"
                          ? "Usar plano Grátis"
                          : `Ativar ${plan.name}`}
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-500">
        Seu plano atual: <strong>{PLAN_LABELS[currentPlan] ?? currentPlan}</strong>
        {" "}— a troca é imediata e local, sem cobrança nesta versão.
      </p>
    </div>
  );
}
