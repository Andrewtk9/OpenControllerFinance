// Categorias canônicas do app (espelha src/lib/categorize.ts — manter em sincronia)
export const CATEGORIES = [
  "Alimentação",
  "Delivery",
  "Mercado",
  "Transporte",
  "Combustível",
  "Compras online",
  "Assinaturas",
  "Jogos",
  "Lazer",
  "Saúde",
  "Educação",
  "Moradia",
  "Contas",
  "Viagem",
  "Salário",
  "Renda extra",
  "Investimentos",
  "Transferência entre contas",
  "Pagamento de cartão",
  "Outros",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Classes Tailwind para a badge de cada categoria
const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Delivery: "bg-red-500/15 text-red-300 border-red-500/30",
  Mercado: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  Transporte: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  Combustível: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "Compras online": "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  Assinaturas: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Jogos: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  Lazer: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  Saúde: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  Educação: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  Moradia: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  Contas: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  Viagem: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Salário: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Renda extra": "bg-green-500/15 text-green-300 border-green-500/30",
  Investimentos: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Transferência entre contas":
    "bg-slate-500/15 text-slate-300 border-slate-500/30",
  "Pagamento de cartão": "bg-slate-500/15 text-slate-300 border-slate-500/30",
  Outros: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

export function categoryBadgeClasses(category: string) {
  return (
    CATEGORY_COLORS[category] ??
    "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
  );
}

// Cores sólidas para barras de gráfico por categoria
const CATEGORY_BAR_COLORS: Record<string, string> = {
  Alimentação: "bg-orange-500",
  Delivery: "bg-red-500",
  Mercado: "bg-lime-500",
  Transporte: "bg-sky-500",
  Combustível: "bg-amber-500",
  "Compras online": "bg-fuchsia-500",
  Assinaturas: "bg-violet-500",
  Jogos: "bg-purple-500",
  Lazer: "bg-pink-500",
  Saúde: "bg-teal-500",
  Educação: "bg-indigo-500",
  Moradia: "bg-cyan-500",
  Contas: "bg-yellow-500",
  Viagem: "bg-blue-500",
  Salário: "bg-emerald-500",
  "Renda extra": "bg-green-500",
  Investimentos: "bg-emerald-500",
  "Transferência entre contas": "bg-slate-500",
  "Pagamento de cartão": "bg-slate-500",
  Outros: "bg-zinc-500",
};

export function categoryBarClass(category: string) {
  return CATEGORY_BAR_COLORS[category] ?? "bg-zinc-500";
}
