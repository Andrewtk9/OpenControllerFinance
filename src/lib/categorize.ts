/**
 * Motor de categorização em camadas (a primeira que casar vence):
 * 1. Regras do usuário no DB (CategoryRule, priority desc) — substring case-insensitive
 * 2. MERCHANT_RULES built-in (comércios brasileiros conhecidos)
 * 3. Mapeamento da categoria da Pluggy (taxonomia em inglês) -> pt-BR
 * 4. Fallback: "Outros"
 */

export const CATEGORIES: string[] = [
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
];

/**
 * Comércios brasileiros conhecidos -> categoria.
 * A ORDEM IMPORTA: padrões mais específicos vêm antes (ex: "uber eats" antes de "uber").
 * Casamento por substring case-insensitive na descrição da transação.
 */
export const MERCHANT_RULES: Record<string, string> = {
  // Delivery (antes de transporte por causa de "uber eats")
  "uber eats": "Delivery",
  ifood: "Delivery",
  rappi: "Delivery",
  "ze delivery": "Delivery",
  aiqfome: "Delivery",

  // Transporte
  uber: "Transporte",
  "99app": "Transporte",
  "99 pop": "Transporte",
  "99pop": "Transporte",
  cabify: "Transporte",
  buser: "Transporte",
  "bilhete unico": "Transporte",
  estacionamento: "Transporte",
  "sem parar": "Transporte",
  veloe: "Transporte",
  conectcar: "Transporte",

  // Compras online
  aliexpress: "Compras online",
  shopee: "Compras online",
  shein: "Compras online",
  mercadolivre: "Compras online",
  "mercado livre": "Compras online",
  mercadopago: "Compras online",
  meli: "Compras online",
  magalu: "Compras online",
  "magazine luiza": "Compras online",
  americanas: "Compras online",
  "casas bahia": "Compras online",
  "ponto frio": "Compras online",
  kabum: "Compras online",
  "fast shop": "Compras online",
  centauro: "Compras online",
  netshoes: "Compras online",
  amazon: "Compras online",

  // Assinaturas (após amazon: "amazon prime" cai em Compras online? não — manter prime video abaixo de amazon seria perdido; colocar específicos ANTES)
  netflix: "Assinaturas",
  spotify: "Assinaturas",
  deezer: "Assinaturas",
  "disney": "Assinaturas",
  hbo: "Assinaturas",
  "max.com": "Assinaturas",
  "prime video": "Assinaturas",
  "youtube premium": "Assinaturas",
  globoplay: "Assinaturas",
  crunchyroll: "Assinaturas",
  paramount: "Assinaturas",
  "google one": "Assinaturas",
  icloud: "Assinaturas",
  "apple.com/bill": "Assinaturas",
  "apple com bill": "Assinaturas",
  audible: "Assinaturas",
  kindle: "Assinaturas",

  // Jogos
  steam: "Jogos",
  playstation: "Jogos",
  xbox: "Jogos",
  nintendo: "Jogos",
  riot: "Jogos",
  "epic games": "Jogos",
  blizzard: "Jogos",
  "garena": "Jogos",

  // Mercado
  carrefour: "Mercado",
  "pao de acucar": "Mercado",
  assai: "Mercado",
  atacadao: "Mercado",
  extra: "Mercado",
  "dia ": "Mercado",
  sams: "Mercado",
  "big ": "Mercado",
  zaffari: "Mercado",
  supermercado: "Mercado",
  supermerc: "Mercado",
  "mercado ": "Mercado",
  hortifruti: "Mercado",
  sacolao: "Mercado",
  hirota: "Mercado",
  "guanabara": "Mercado",

  // Saúde
  drogasil: "Saúde",
  "droga raia": "Saúde",
  drogaria: "Saúde",
  pacheco: "Saúde",
  "pague menos": "Saúde",
  panvel: "Saúde",
  farmacia: "Saúde",
  farma: "Saúde",
  "smart fit": "Saúde",
  smartfit: "Saúde",
  academia: "Saúde",
  gym: "Saúde",
  bluefit: "Saúde",
  unimed: "Saúde",
  hapvida: "Saúde",
  "amil": "Saúde",
  laboratorio: "Saúde",
  hospital: "Saúde",
  clinica: "Saúde",

  // Combustível
  shell: "Combustível",
  ipiranga: "Combustível",
  petrobras: "Combustível",
  "br mania": "Combustível",
  posto: "Combustível",
  combustivel: "Combustível",
  "auto posto": "Combustível",

  // Alimentação
  mcdonalds: "Alimentação",
  "mc donalds": "Alimentação",
  "burger king": "Alimentação",
  "bk ": "Alimentação",
  subway: "Alimentação",
  outback: "Alimentação",
  habibs: "Alimentação",
  giraffas: "Alimentação",
  "kfc": "Alimentação",
  "pizza hut": "Alimentação",
  "spoleto": "Alimentação",
  "china in box": "Alimentação",
  restaurante: "Alimentação",
  lanchonete: "Alimentação",
  padaria: "Alimentação",
  pizzaria: "Alimentação",
  cafeteria: "Alimentação",
  starbucks: "Alimentação",
  churrascaria: "Alimentação",
  hamburgueria: "Alimentação",
  sorveteria: "Alimentação",

  // Lazer
  cinemark: "Lazer",
  cinema: "Lazer",
  ingresso: "Lazer",
  eventim: "Lazer",
  sympla: "Lazer",
  "ticket360": "Lazer",

  // Viagem
  latam: "Viagem",
  "gol ": "Viagem",
  "azul ": "Viagem",
  airbnb: "Viagem",
  booking: "Viagem",
  hotel: "Viagem",
  decolar: "Viagem",
  "123milhas": "Viagem",
  hurb: "Viagem",
  pousada: "Viagem",
  hostel: "Viagem",

  // Contas (telefonia/internet/utilidades)
  claro: "Contas",
  vivo: "Contas",
  "tim ": "Contas",
  "oi ": "Contas",
  "net ": "Contas",
  internet: "Contas",
  enel: "Contas",
  light: "Contas",
  cemig: "Contas",
  copel: "Contas",
  celesc: "Contas",
  coelba: "Contas",
  sabesp: "Contas",
  sanepar: "Contas",
  cedae: "Contas",
  embasa: "Contas",
  energia: "Contas",
  "agua e esgoto": "Contas",
  comgas: "Contas",

  // Educação
  udemy: "Educação",
  alura: "Educação",
  coursera: "Educação",
  duolingo: "Educação",
  curso: "Educação",
  faculdade: "Educação",
  universidade: "Educação",
  escola: "Educação",
  "wizard": "Educação",
  "cna ": "Educação",
  "fisk": "Educação",

  // Moradia
  aluguel: "Moradia",
  condominio: "Moradia",
  imobiliaria: "Moradia",
  "quintoandar": "Moradia",
  "leroy merlin": "Moradia",
  "telhanorte": "Moradia",

  // Pagamento de cartão
  "pagamento de fatura": "Pagamento de cartão",
  "pgto fatura": "Pagamento de cartão",
  "pagamento fatura": "Pagamento de cartão",
  "pagamento cartao": "Pagamento de cartão",
  "pagamento recebido": "Pagamento de cartão",
  // transferencia/ted/doc/pix: deixados de fora de propósito —
  // a camada 3 (categoria Pluggy) diferencia melhor transferência própria x terceiros.
};

/**
 * Taxonomia de categorias da Pluggy (inglês) -> nossas categorias (pt-BR).
 * Chaves em minúsculas; o lookup é case-insensitive.
 */
export const PLUGGY_CATEGORY_MAP: Record<string, string> = {
  // Renda
  salary: "Salário",
  income: "Renda extra",
  "non-recurring income": "Renda extra",
  "non recurring income": "Renda extra",
  retirement: "Renda extra",
  "government aid": "Renda extra",
  "entrepreneurial activities": "Renda extra",

  // Investimentos
  investments: "Investimentos",
  "fixed income investment": "Investimentos",
  "fixed income": "Investimentos",
  "variable income investment": "Investimentos",
  "variable income": "Investimentos",
  "automatic investment": "Investimentos",
  "automatic investments": "Investimentos",
  "proceeds interests and dividends": "Investimentos",
  pension: "Investimentos",
  "margin accounts": "Investimentos",
  "mutual funds": "Investimentos",

  // Transferências
  "same person transfer": "Transferência entre contas",
  "transfer - same person": "Transferência entre contas",
  "internal transfer": "Transferência entre contas",

  // Cartão
  "credit card payment": "Pagamento de cartão",

  // Alimentação / Mercado / Delivery
  "food and drinks": "Alimentação",
  "eating out": "Alimentação",
  "restaurants and bars": "Alimentação",
  restaurants: "Alimentação",
  "alcohol and tobacco": "Alimentação",
  groceries: "Mercado",
  "food delivery": "Delivery",
  "online food delivery": "Delivery",
  delivery: "Delivery",

  // Transporte / Combustível
  transportation: "Transporte",
  transport: "Transporte",
  "taxi and ride-hailing": "Transporte",
  "taxi and ride hailing": "Transporte",
  "ride-hailing": "Transporte",
  "public transportation": "Transporte",
  "public transport": "Transporte",
  parking: "Transporte",
  tolls: "Transporte",
  "car rental": "Transporte",
  "vehicle maintenance": "Transporte",
  "vehicle services": "Transporte",
  bicycle: "Transporte",
  "gas stations": "Combustível",
  "gas station": "Combustível",
  fuel: "Combustível",

  // Compras
  shopping: "Compras online",
  "online shopping": "Compras online",
  ecommerce: "Compras online",
  electronics: "Compras online",
  clothing: "Compras online",
  "department store": "Compras online",
  "home and decoration": "Compras online",
  bookstore: "Compras online",
  "sports goods": "Compras online",
  "office supplies": "Compras online",
  "pet supplies and vet": "Outros",
  kids: "Compras online",
  "kids and toys": "Compras online",

  // Assinaturas / serviços digitais
  "video streaming": "Assinaturas",
  "music streaming": "Assinaturas",
  streaming: "Assinaturas",
  "streaming services": "Assinaturas",
  subscriptions: "Assinaturas",
  "digital services": "Assinaturas",
  "tv, internet and phone plans": "Contas",

  // Jogos
  gaming: "Jogos",
  "online gaming": "Jogos",
  "video games": "Jogos",
  "lottery and gambling": "Lazer",
  gambling: "Lazer",

  // Lazer / Entretenimento
  entertainment: "Lazer",
  leisure: "Lazer",
  "concerts and events": "Lazer",
  concerts: "Lazer",
  events: "Lazer",
  cinema: "Lazer",
  "arts and culture": "Lazer",
  hobbies: "Lazer",
  "leisure activities": "Lazer",

  // Saúde
  health: "Saúde",
  healthcare: "Saúde",
  pharmacy: "Saúde",
  pharmacies: "Saúde",
  "hospital clinics and labs": "Saúde",
  "hospitals, clinics and labs": "Saúde",
  dentist: "Saúde",
  "health insurance": "Saúde",
  "gyms and fitness centers": "Saúde",
  "wellness and beauty": "Saúde",
  "personal care": "Saúde",
  "sports practice": "Saúde",

  // Educação
  education: "Educação",
  university: "Educação",
  school: "Educação",
  "online courses": "Educação",
  courses: "Educação",
  "books and magazines": "Educação",

  // Moradia
  housing: "Moradia",
  rent: "Moradia",
  mortgage: "Moradia",
  "real estate": "Moradia",
  "home maintenance": "Moradia",
  "household services": "Moradia",

  // Contas / utilidades / taxas
  utilities: "Contas",
  "bills and utilities": "Contas",
  electricity: "Contas",
  water: "Contas",
  "water and sewer": "Contas",
  gas: "Contas",
  "natural gas": "Contas",
  telecommunications: "Contas",
  "telephone, tv and internet": "Contas",
  telephone: "Contas",
  "mobile phone": "Contas",
  "internet": "Contas",
  "tv": "Contas",
  taxes: "Contas",
  "income taxes": "Contas",
  "bank fees": "Contas",
  "account fees": "Contas",
  "card fees": "Contas",
  "wire transfer fees": "Contas",
  fees: "Contas",
  fines: "Contas",
  insurance: "Contas",
  "life insurance": "Contas",
  "vehicle insurance": "Contas",
  "home insurance": "Contas",
  "legal obligations": "Contas",
  alimony: "Contas",
  "loans and financing": "Contas",
  loans: "Contas",
  financing: "Contas",
  "interest charged": "Contas",
  "late payment fees": "Contas",

  // Viagem
  travel: "Viagem",
  flights: "Viagem",
  airfare: "Viagem",
  accommodation: "Viagem",
  hotels: "Viagem",
  "mileage programs": "Viagem",

  // Outros conhecidos
  donations: "Outros",
  "atm withdrawal": "Outros",
  "cash withdrawal": "Outros",
  others: "Outros",
  other: "Outros",
};

/** Heurística por substring para categorias Pluggy fora do mapa exato. */
function matchPluggyHeuristic(key: string): string | null {
  if (key.includes("same person")) return "Transferência entre contas";
  if (key.includes("credit card") && key.includes("payment"))
    return "Pagamento de cartão";
  if (key.includes("delivery")) return "Delivery";
  if (key.includes("grocer")) return "Mercado";
  if (key.includes("streaming") || key.includes("subscription"))
    return "Assinaturas";
  if (key.includes("invest") || key.includes("dividend"))
    return "Investimentos";
  if (key.includes("salary") || key.includes("payroll")) return "Salário";
  if (key.includes("income")) return "Renda extra";
  if (key.includes("gas station") || key.includes("fuel"))
    return "Combustível";
  if (key.includes("transport") || key.includes("ride") || key.includes("taxi"))
    return "Transporte";
  if (
    key.includes("travel") ||
    key.includes("flight") ||
    key.includes("accommodation") ||
    key.includes("hotel")
  )
    return "Viagem";
  if (key.includes("educat") || key.includes("course") || key.includes("school"))
    return "Educação";
  if (
    key.includes("health") ||
    key.includes("pharmac") ||
    key.includes("medical") ||
    key.includes("fitness")
  )
    return "Saúde";
  if (key.includes("gam")) return "Jogos";
  if (key.includes("entertainment") || key.includes("leisure")) return "Lazer";
  if (key.includes("food") || key.includes("restaurant")) return "Alimentação";
  if (key.includes("shopping")) return "Compras online";
  if (key.includes("hous") || key.includes("rent") || key.includes("mortgage"))
    return "Moradia";
  if (
    key.includes("utilit") ||
    key.includes("telecom") ||
    key.includes("tax") ||
    key.includes("fee") ||
    key.includes("insurance") ||
    key.includes("loan")
  )
    return "Contas";
  return null;
}

export type CategorySource = "rule" | "merchant" | "pluggy" | "fallback";

export interface CategorizeResult {
  category: string;
  source: CategorySource;
}

export interface DbRule {
  pattern: string;
  category: string;
  priority: number;
}

/**
 * Categoriza uma transação. Camadas: regras do DB > MERCHANT_RULES > categoria Pluggy > "Outros".
 */
export function categorize(
  description: string,
  pluggyCategory: string | null | undefined,
  dbRules: DbRule[]
): CategorizeResult {
  const desc = (description ?? "").toLowerCase();

  // 1. Regras do usuário (priority desc)
  const sortedRules = [...dbRules].sort((a, b) => b.priority - a.priority);
  for (const rule of sortedRules) {
    if (rule.pattern && desc.includes(rule.pattern.toLowerCase())) {
      return { category: rule.category, source: "rule" };
    }
  }

  // 2. Comércios built-in (ordem de inserção preservada)
  for (const [pattern, category] of Object.entries(MERCHANT_RULES)) {
    if (desc.includes(pattern)) {
      return { category, source: "merchant" };
    }
  }

  // 3. Categoria da Pluggy
  if (pluggyCategory) {
    const key = pluggyCategory.trim().toLowerCase();
    const mapped = PLUGGY_CATEGORY_MAP[key] ?? matchPluggyHeuristic(key);
    if (mapped) {
      return { category: mapped, source: "pluggy" };
    }
  }

  // 4. Fallback
  return { category: "Outros", source: "fallback" };
}
