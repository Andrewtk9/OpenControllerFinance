import Link from "next/link";
import {
  formatBRL,
  getMonthlyIncome,
  getMonthlySpending,
  getSettings,
} from "@/lib/budget";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { monthLabel } from "@/components/format";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Exemplo numérico fixo do funil Faturamento → Lucro Líquido
// ---------------------------------------------------------------------------

const EXAMPLE_REVENUE = 50_000;

type FunnelStep =
  | {
      kind: "result";
      label: string;
      value: number;
      barClass: string;
      textClass: string;
      desc: string;
      highlight?: boolean;
    }
  | {
      kind: "deduction";
      label: string;
      value: number;
      desc: string;
    };

const FUNNEL: FunnelStep[] = [
  {
    kind: "result",
    label: "Faturamento",
    value: 50_000,
    barClass: "bg-sky-500",
    textClass: "text-sky-300",
    desc: "Tudo que entrou pelas vendas — antes de qualquer desconto.",
  },
  {
    kind: "deduction",
    label: "Custos dos produtos/serviços",
    value: 25_000,
    desc: "Mercadoria, matéria-prima, mão de obra direta da entrega.",
  },
  {
    kind: "result",
    label: "Lucro Bruto",
    value: 25_000,
    barClass: "bg-teal-500",
    textClass: "text-teal-300",
    desc: "O que sobra depois de pagar o custo direto do que você vende.",
  },
  {
    kind: "deduction",
    label: "Despesas fixas",
    value: 12_000,
    desc: "Aluguel, salários, energia, internet — existe venda ou não.",
  },
  {
    kind: "result",
    label: "Resultado Operacional",
    value: 13_000,
    barClass: "bg-amber-500",
    textClass: "text-amber-300",
    desc: "O que a operação gera depois de manter as portas abertas.",
  },
  {
    kind: "deduction",
    label: "Impostos e taxas",
    value: 5_000,
    desc: "Simples/impostos, taxas de cartão e de plataformas.",
  },
  {
    kind: "result",
    label: "Lucro Líquido",
    value: 8_000,
    barClass: "bg-emerald-500",
    textClass: "text-emerald-300",
    desc: "O que de fato sobrou: 16% do faturamento — e não os R$ 50 mil!",
    highlight: true,
  },
];

const CLASSIC_MISTAKES = [
  {
    title: "Confundir faturamento com salário",
    desc: "O que entra no caixa não é seu — boa parte já tem dono: fornecedores, impostos, contas.",
  },
  {
    title: "Tirar pró-labore do caixa sem controle",
    desc: "Retiradas avulsas escondem o resultado real. Defina um valor fixo mensal para você.",
  },
  {
    title: "Esquecer impostos e taxas de cartão",
    desc: "Cada venda no cartão perde 2–5% em taxas, e os impostos chegam depois. Eles comem a margem em silêncio.",
  },
  {
    title: "Não separar PJ de PF",
    desc: "Conta misturada = você nunca sabe se o negócio dá lucro ou se está pagando suas contas pessoais.",
  },
];

export default async function AprendaPage() {
  const settings = await getSettings();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const isBusiness = settings.profileType === "business";

  let real: {
    income: number;
    spent: number;
    result: number;
    margin: number | null;
  } | null = null;

  if (isBusiness) {
    const [income, spent] = await Promise.all([
      getMonthlyIncome(year, month),
      getMonthlySpending(year, month),
    ]);
    if (income > 0 || spent > 0) {
      const result = income - spent;
      real = {
        income,
        spent,
        result,
        margin: income > 0 ? (result / income) * 100 : null,
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Aprenda"
        subtitle="Faturamento × Lucro Líquido — a diferença que separa negócios saudáveis de negócios quebrados"
      />

      {/* Hook */}
      <Card className="border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-500/5 p-6 sm:p-8">
        <p className="text-2xl font-bold leading-snug tracking-tight text-slate-50">
          Faturar R$ 50 mil{" "}
          <span className="text-rose-400">não é ganhar R$ 50 mil</span>.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Esse é o erro mais comum de quem empreende: olhar o dinheiro que
          entra e achar que ele é todo seu. Entre o que você fatura e o que
          realmente sobra existe uma fila de custos, despesas, impostos e
          taxas — e quem não enxerga essa fila acaba gastando um dinheiro que
          nunca foi dele.
        </p>
      </Card>

      {/* Definições lado a lado */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-sky-500/30">
          <CardTitle className="text-sky-400">Faturamento</CardTitle>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            Tudo que ENTRA pela atividade
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            A soma de todas as vendas de produtos ou serviços,{" "}
            <strong className="text-slate-300">
              antes de qualquer desconto
            </strong>
            . É o número grande e bonito — mas ele ainda não pagou ninguém.
          </p>
        </Card>
        <Card className="border-emerald-500/30">
          <CardTitle className="text-emerald-400">Lucro Líquido</CardTitle>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            O que SOBRA no final
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            O que resta depois de{" "}
            <strong className="text-slate-300">
              TODOS os custos, impostos, taxas e despesas
            </strong>
            . É o único número que diz se o negócio dá dinheiro de verdade.
          </p>
        </Card>
      </div>

      {/* Funil numérico */}
      <Card className="p-6 sm:p-8">
        <CardTitle>Na prática: de R$ 50.000 a R$ 8.000</CardTitle>
        <p className="mt-2 text-sm text-slate-400">
          Acompanhe o caminho do dinheiro em um mês de exemplo. A largura de
          cada barra mostra quanto do faturamento ainda está vivo em cada
          etapa.
        </p>
        <div className="mt-6 space-y-3">
          {FUNNEL.map((step) =>
            step.kind === "deduction" ? (
              <div
                key={step.label}
                className="flex items-baseline gap-3 pl-4 text-sm"
              >
                <span className="font-mono tabular-nums text-rose-400">
                  − {formatBRL(step.value)}
                </span>
                <span className="text-slate-300">{step.label}</span>
                <span className="hidden text-xs text-slate-500 sm:inline">
                  · {step.desc}
                </span>
              </div>
            ) : (
              <div key={step.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span
                    className={`text-sm font-semibold ${
                      step.highlight ? "uppercase tracking-wide" : ""
                    } ${step.textClass}`}
                  >
                    {step.label}
                  </span>
                  <span
                    className={`font-mono text-sm font-semibold tabular-nums ${step.textClass}`}
                  >
                    {formatBRL(step.value)}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {Math.round((step.value / EXAMPLE_REVENUE) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${step.barClass}`}
                    style={{
                      width: `${(step.value / EXAMPLE_REVENUE) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{step.desc}</p>
              </div>
            )
          )}
        </div>
        <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          De R$ 50.000 faturados, sobraram{" "}
          <strong>R$ 8.000 de lucro líquido — apenas 16%</strong>. É esse
          número que paga o dono, forma reserva e financia o crescimento.
        </p>
      </Card>

      {/* Margem líquida */}
      <Card>
        <CardTitle>Margem líquida: o termômetro do negócio</CardTitle>
        <div className="mt-4 rounded-xl bg-slate-800/60 px-4 py-3 text-center font-mono text-sm text-slate-200">
          margem líquida = lucro líquido ÷ faturamento × 100
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          No exemplo acima: R$ 8.000 ÷ R$ 50.000 × 100 ={" "}
          <strong className="text-emerald-400">16%</strong>. Como referência
          típica (varia muito por setor, porte e região):
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          <li className="flex items-center gap-3">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
            Comércio: costuma operar com <strong>5–10%</strong> de margem
            líquida
          </li>
          <li className="flex items-center gap-3">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Serviços: costuma operar com <strong>15–25%</strong>
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Esses números são apenas pontos de partida — compare sempre com
          negócios parecidos com o seu.
        </p>
      </Card>

      {/* Erros clássicos */}
      <Card>
        <CardTitle>Os erros clássicos</CardTitle>
        <ul className="mt-4 space-y-4">
          {CLASSIC_MISTAKES.map((m) => (
            <li key={m.title} className="flex gap-3">
              <span className="mt-0.5 text-rose-400" aria-hidden>
                ✕
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {m.title}
                </p>
                <p className="mt-0.5 text-sm leading-6 text-slate-400">
                  {m.desc}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Seção com dados reais */}
      {real ? (
        <Card className="border-emerald-500/30 bg-gradient-to-br from-slate-900 to-slate-900/40 p-6 sm:p-8">
          <CardTitle>
            No seu negócio em {monthLabel(year, month)}
          </CardTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Faturamento (soma dos ganhos)
              </p>
              <p className="mt-1 text-2xl font-bold text-sky-300">
                {formatBRL(real.income)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Saídas
              </p>
              <p className="mt-1 text-2xl font-bold text-rose-400">
                {formatBRL(real.spent)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Resultado
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  real.result >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatBRL(real.result)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Margem
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  (real.margin ?? 0) >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {real.margin !== null ? `${real.margin.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            Aproximação baseada nas categorias das suas transações
            sincronizadas (sem separar custos de despesas nem apurar
            impostos). Não substitui a apuração de um contador.
          </p>
        </Card>
      ) : (
        <Card>
          <CardTitle>E nos seus números?</CardTitle>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            A conta é a mesma para qualquer negócio: some tudo que entrou pela
            atividade (faturamento), subtraia tudo que saiu (custos, despesas,
            impostos e taxas) e veja o que sobrou — esse é o seu resultado.
            Divida pelo faturamento e você tem a margem.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            {isBusiness
              ? "Conecte seus bancos e sincronize suas transações para ver esta seção com os números reais do seu negócio."
              : "Conecte seus bancos para ver com seus números — e, se você empreende, mude o perfil para Empresa nas configurações."}
          </p>
        </Card>
      )}

      {/* CTA final */}
      <Card className="border-emerald-500/40 bg-emerald-500/5 p-6 text-center sm:p-8">
        <p className="text-lg font-semibold text-slate-100">
          Quer ir além do básico?
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          O perfil <strong className="text-emerald-400">Empresa</strong> terá
          em breve um módulo de contabilidade completo: DRE automática,
          separação de custos e despesas, pró-labore e apuração de margem por
          período — tudo no plano Empresa.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
        >
          Voltar ao dashboard
        </Link>
      </Card>
    </div>
  );
}
