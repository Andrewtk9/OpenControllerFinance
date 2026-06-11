// Helpers de formatação de datas (pt-BR). Datas vêm do sync em meia-noite UTC,
// então formatamos em UTC para evitar deslocamento de um dia no fuso de Brasília.
export function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateShort(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

export function formatDateTime(date: Date) {
  return (
    date.toLocaleDateString("pt-BR") +
    " às " +
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

// Nome do mês por extenso: "junho de 2026"
export function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

// "junho 2026" curto, capitalizado
export function monthLabelCapitalized(year: number, month: number) {
  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Parseia "YYYY-MM" da querystring; fallback para o mês atual
export function parseMonthParam(param: string | undefined): {
  year: number;
  month: number;
} {
  if (param) {
    const m = /^(\d{4})-(\d{1,2})$/.exec(param);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      if (month >= 1 && month <= 12) return { year, month };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function monthParam(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
