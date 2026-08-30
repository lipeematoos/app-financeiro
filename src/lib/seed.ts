// Deterministic demo dataset: 6 months of history so the analysis engine,
// charts and historical averages have meaningful data on first launch.

import type { AppState, Category, Tx } from "./types";
import { addMonthsKey, currentMonthKey, dateInMonth, daysInMonthKey, todayISO, uid } from "./format";

// Small seeded PRNG so every install renders the same story.
const mulberry32 = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const PALETTE = [
  "#1e7a4f",
  "#cc3d24",
  "#a96f08",
  "#3f6fb5",
  "#7c4dab",
  "#0e8a8a",
  "#b0562e",
  "#5b7033",
  "#a13a63",
  "#4b5563",
  "#8a6d1c",
  "#2e6f9e",
  "#946846",
  "#64748b",
];

const cat = (id: string, name: string, kind: "expense" | "income", subs: string[], i: number): Category => ({
  id,
  name,
  kind,
  subs,
  color: PALETTE[i % PALETTE.length],
  enabled: true,
});

export const seedCategories: Category[] = [
  cat("moradia", "Moradia", "expense", ["Aluguel", "Condomínio", "Energia", "Água", "Internet"], 0),
  cat("alimentacao", "Alimentação", "expense", ["Mercado", "Restaurante", "Delivery", "Padaria", "Lanches"], 1),
  cat("transporte", "Transporte", "expense", ["Combustível", "Uber", "Transporte público", "Manutenção", "Estacionamento"], 2),
  cat("saude", "Saúde", "expense", ["Farmácia", "Médico", "Exames"], 3),
  cat("educacao", "Educação", "expense", ["Cursos", "Livros", "Mensalidade"], 4),
  cat("lazer", "Lazer", "expense", ["Cinema", "Bares", "Shows", "Jogos"], 5),
  cat("compras", "Compras", "expense", ["Roupas", "Eletrônicos", "Casa"], 6),
  cat("assinaturas", "Assinaturas", "expense", ["Streaming", "Apps", "Academia"], 7),
  cat("impostos", "Impostos", "expense", ["IPVA", "IPTU", "Taxas"], 8),
  cat("pets", "Pets", "expense", ["Ração", "Veterinário"], 9),
  cat("viagens", "Viagens", "expense", ["Hospedagem", "Passagens"], 10),
  cat("presentes", "Presentes", "expense", [], 11),
  cat("servicos", "Serviços", "expense", ["Beleza", "Reparos"], 12),
  cat("outros", "Outros", "expense", [], 13),
  cat("salario", "Salário", "income", [], 0),
  cat("freelance", "Freelance", "income", [], 1),
  cat("dividendos", "Dividendos", "income", [], 2),
  cat("rendimentos", "Rendimentos", "income", [], 3),
  cat("reembolso", "Reembolso", "income", [], 4),
  cat("vendas", "Venda", "income", [], 5),
];

// Monthly spending template: category, subcategory, merchant, base amount,
// noise and frequency per month.
type Tpl = {
  cat: string;
  sub?: string;
  m?: string;
  base: number;
  noise: number;
  freq: number;
  acc?: "corrente" | "dinheiro" | "digital" | "card";
  boostNow?: number; // multiplier applied to the current month
};

const TPLS: Tpl[] = [
  { cat: "moradia", sub: "Aluguel", m: "Imobiliária Horizonte", base: 1400, noise: 0, freq: 1, acc: "corrente" },
  { cat: "moradia", sub: "Condomínio", m: "Condomínio Vila Nova", base: 320, noise: 0, freq: 1, acc: "corrente" },
  { cat: "moradia", sub: "Energia", m: "Enel", base: 168, noise: 32, freq: 1, acc: "corrente" },
  { cat: "moradia", sub: "Internet", m: "Vivo Fibra", base: 119.9, noise: 0, freq: 1, acc: "card" },
  { cat: "alimentacao", sub: "Mercado", m: "Supermercado Guanabara", base: 165, noise: 40, freq: 3, acc: "card" },
  { cat: "alimentacao", sub: "Padaria", m: "Padaria Pão Quente", base: 24, noise: 12, freq: 4, acc: "dinheiro" },
  { cat: "alimentacao", sub: "Restaurante", m: "Restaurante Sabor Mineiro", base: 78, noise: 30, freq: 2, acc: "card" },
  { cat: "alimentacao", sub: "Delivery", m: "iFood", base: 55, noise: 20, freq: 4, acc: "card", boostNow: 1.8 },
  { cat: "transporte", sub: "Combustível", m: "Posto Ipiranga", base: 140, noise: 30, freq: 2, acc: "card" },
  { cat: "transporte", sub: "Uber", m: "Uber", base: 26, noise: 12, freq: 4, acc: "card" },
  { cat: "transporte", sub: "Transporte público", m: "Bilhete Único", base: 44, noise: 6, freq: 1, acc: "digital" },
  { cat: "saude", sub: "Farmácia", m: "Farmácia Santa Marta", base: 62, noise: 26, freq: 1, acc: "card" },
  { cat: "saude", sub: "Exames", m: "Laboratório Vital", base: 0, noise: 0, freq: 0, acc: "card" },
  { cat: "lazer", sub: "Bares", m: "Bar do Zé", base: 95, noise: 35, freq: 3, acc: "card", boostNow: 1.6 },
  { cat: "lazer", sub: "Cinema", m: "Cinemark", base: 48, noise: 10, freq: 1, acc: "card" },
  { cat: "assinaturas", sub: "Streaming", m: "Netflix", base: 55.9, noise: 0, freq: 1, acc: "card" },
  { cat: "assinaturas", sub: "Academia", m: "Smart Fit", base: 99, noise: 0, freq: 1, acc: "card" },
  { cat: "compras", sub: "Casa", m: "Magalu", base: 120, noise: 70, freq: 1, acc: "card" },
  { cat: "pets", sub: "Ração", m: "Petz", base: 129, noise: 20, freq: 1, acc: "card" },
  { cat: "servicos", sub: "Beleza", m: "Barbearia Imperial", base: 55, noise: 0, freq: 1, acc: "dinheiro" },
  { cat: "educacao", sub: "Cursos", m: "Alura", base: 0, noise: 0, freq: 0, acc: "card" },
];

export function buildSeed(): AppState {
  const rnd = mulberry32(20260830);
  const nowKey = currentMonthKey();
  const today = todayISO();
  const todayDay = Number(today.slice(8, 10));
  const txs: Tx[] = [];

  const push = (t: Omit<Tx, "id" | "sourceType"> & { sourceType?: Tx["sourceType"] }) =>
    txs.push({ id: uid(), sourceType: "MANUAL", ...t });

  for (let off = 5; off >= 0; off--) {
    const key = addMonthsKey(nowKey, -off);
    const isNow = off === 0;
    const maxDay = isNow ? todayDay : daysInMonthKey(key);
    const day = (min: number, max: number) => Math.min(maxDay, min + Math.floor(rnd() * Math.max(1, max - min)));

    // Income — salary on day 5, occasional freelance.
    push({ type: "INCOME", amount: 5800, date: dateInMonth(key, 5), description: "Salário", categoryId: "salario", accountId: "corrente", sourceType: "RECURRING" });
    if (off === 3 || off === 1 || isNow)
      push({ type: "INCOME", amount: Math.round(420 + rnd() * 480), date: dateInMonth(key, day(10, 24)), description: "Projeto freelance", categoryId: "freelance", accountId: "corrente" });

    // Investment contribution (patrimonial transfer — never an expense).
    push({
      type: "INVESTMENT_TRANSFER",
      amount: isNow ? 900 : 500,
      date: dateInMonth(key, 8),
      description: isNow ? "Aporte do mês" : "Aporte mensal",
      accountId: "corrente",
      toAccountId: "investments",
      sourceType: "MANUAL",
    });

    for (const t of TPLS) {
      if (t.freq === 0) continue;
      const boost = isNow && t.boostNow ? t.boostNow : 1;
      for (let i = 0; i < t.freq; i++) {
        const raw = (t.base / t.freq) * boost * (1 + (rnd() - 0.5) * (t.noise / Math.max(1, t.base)) * 2);
        const amount = Math.round(raw * 100) / 100;
        if (amount <= 0) continue;
        const date = dateInMonth(key, day(1 + Math.floor(rnd() * 4), Math.max(2, Math.min(28, maxDay))));
        const base = { type: "EXPENSE" as const, amount, date, description: t.sub ?? t.cat, categoryId: t.cat, subcategory: t.sub, merchantName: t.m };
        if (t.acc === "card") push({ ...base, cardId: "nubank" });
        else if (t.acc === "dinheiro") push({ ...base, accountId: "dinheiro" });
        else if (t.acc === "digital") push({ ...base, accountId: "digital" });
        else push({ ...base, accountId: "corrente" });
      }
    }

    // Lazer extra push on current month → triggers overspend + velocity alerts.
    if (isNow) {
      push({ type: "EXPENSE", amount: 120, date: dateInMonth(key, Math.max(1, todayDay - 2)), description: "Show sertanejo", categoryId: "lazer", subcategory: "Shows", merchantName: "Villa Mix", cardId: "nubank" });
      push({ type: "EXPENSE", amount: 86.4, date: dateInMonth(key, Math.max(1, todayDay - 1)), description: "Jantar aniversário", categoryId: "lazer", subcategory: "Restaurante", merchantName: "Outback", cardId: "nubank" });
    }

    // Installment purchase: Fone Bluetooth 3x R$ 300 (started 2 months ago).
    if (off <= 2) {
      const n = 3 - off;
      push({
        type: "EXPENSE",
        amount: 300,
        date: dateInMonth(key, 12),
        description: "Fone Bluetooth JBL",
        categoryId: "compras",
        subcategory: "Eletrônicos",
        merchantName: "Amazon",
        cardId: "itaucard",
        installment: `${n}/3`,
        sourceType: "MANUAL",
      });
    }

    // Previous months: Nubank invoice was paid from checking account.
    if (!isNow && off <= 4) {
      push({
        type: "EXPENSE",
        amount: Math.round((1750 + rnd() * 420) * 100) / 100,
        date: dateInMonth(key, 8),
        description: "Pagamento fatura Nubank",
        accountId: "corrente",
        invoicePayment: { cardId: "nubank", month: key },
        sourceType: "MANUAL",
      });
    }

    // Investment income history.
    if (off >= 1) {
      // recorded directly into invIncomes below; one lands as transaction too.
    }
  }

  // A few explicit entries for "today" (the GASTEI HOJE receipt).
  push({ type: "EXPENSE", amount: 42.9, date: today, description: "Compras da semana", categoryId: "alimentacao", subcategory: "Mercado", merchantName: "Supermercado Guanabara", cardId: "nubank", sourceType: "RECEIPT_OCR" });
  push({ type: "EXPENSE", amount: 18, date: today, description: "Corrida centro", categoryId: "transporte", subcategory: "Uber", merchantName: "Uber", cardId: "nubank" });
  push({ type: "EXPENSE", amount: 15.5, date: today, description: "Lanche", categoryId: "alimentacao", subcategory: "Lanches", merchantName: "Padaria Pão Quente", accountId: "dinheiro" });
  // HGLG11 dividends this month registered also as account income.
  push({ type: "INCOME", amount: 9.5, date: dateInMonth(nowKey, Math.max(1, todayDay - 3)), description: "Rendimentos HGLG11", categoryId: "rendimentos", accountId: "corrente", sourceType: "SYSTEM" });

  return {
    version: 3,
    settings: {
      name: "Marina",
      email: "marina@email.com",
      theme: "system",
      recents: ["alimentacao", "transporte", "lazer"],
      notif: { upcomingBills: true, budgets: true, cardDue: true, investments: false },
    },
    accounts: [
      { id: "corrente", name: "Conta Corrente", type: "Conta corrente", institution: "Itaú", initialBalance: 4180.55, icon: "bank" },
      { id: "poupanca", name: "Poupança", type: "Conta poupança", institution: "Caixa", initialBalance: 2500, icon: "piggy" },
      { id: "digital", name: "PicPay", type: "Carteira digital", institution: "PicPay", initialBalance: 940.2, icon: "digital" },
      { id: "dinheiro", name: "Dinheiro", type: "Dinheiro", institution: "Carteira", initialBalance: 190, icon: "cash" },
    ],
    cards: [
      { id: "nubank", name: "Nubank Ultravioleta", institution: "Nubank", brand: "Mastercard", limit: 5200, closingDay: 28, dueDay: 8 },
      { id: "itaucard", name: "Itaú Click", institution: "Itaú", brand: "Visa", limit: 3400, closingDay: 22, dueDay: 2 },
    ],
    categories: seedCategories,
    budgets: [
      { categoryId: "alimentacao", limit: 1000, threshold: 75, enabled: true },
      { categoryId: "lazer", limit: 400, threshold: 75, enabled: true },
      { categoryId: "transporte", limit: 600, threshold: 75, enabled: true },
      { categoryId: "compras", limit: 500, threshold: 75, enabled: true },
      { categoryId: "assinaturas", limit: 260, threshold: 80, enabled: true },
      { categoryId: "pets", limit: 200, threshold: 75, enabled: true },
    ],
    transactions: txs,
    investments: [
      { id: "petr4", assetType: "Ações", name: "Petrobras PN", ticker: "PETR4", institution: "XP Investimentos", quantity: 100, avgPrice: 32.4, invested: 3240, current: 3680, acquired: "2025-04-12" },
      { id: "hglg11", assetType: "Fundos Imobiliários", name: "CGHG Logística", ticker: "HGLG11", institution: "XP Investimentos", quantity: 10, avgPrice: 160, invested: 1600, current: 1684, acquired: "2025-07-03" },
      { id: "cdb", assetType: "CDB", name: "CDB Banco X 120% CDI", institution: "Banco X", quantity: 1, avgPrice: 10000, invested: 10000, current: 10782.4, acquired: "2025-03-15", maturity: "2028-03-15" },
      { id: "tesouro", assetType: "Tesouro Direto", name: "Tesouro Selic 2029", institution: "Nu invest", quantity: 4.2, avgPrice: 1190.48, invested: 5000, current: 5311.75, acquired: "2025-01-20" },
      { id: "lci", assetType: "LCI", name: "LCI Imobiliária 90% CDI", institution: "Banco do Brasil", quantity: 1, avgPrice: 3000, invested: 3000, current: 3122.6, acquired: "2025-06-10", maturity: "2027-06-10" },
      { id: "btc", assetType: "Criptomoedas", name: "Bitcoin", ticker: "BTC", institution: "Mercado Bitcoin", quantity: 0.0042, avgPrice: 214285.71, invested: 900, current: 1186.3, acquired: "2025-09-05" },
    ],
    invIncomes: [
      { id: uid(), assetId: "petr4", amount: 86.4, date: dateInMonth(addMonthsKey(nowKey, -1), 15), type: "Dividendos", asTransaction: false },
      { id: uid(), assetId: "hglg11", amount: 9.5, date: dateInMonth(addMonthsKey(nowKey, -1), 12), type: "Rendimentos de FII", asTransaction: false },
      { id: uid(), assetId: "hglg11", amount: 9.5, date: dateInMonth(addMonthsKey(nowKey, -2), 12), type: "Rendimentos de FII", asTransaction: false },
      { id: uid(), assetId: "cdb", amount: 118.2, date: dateInMonth(addMonthsKey(nowKey, -2), 15), type: "Juros", asTransaction: false },
      { id: uid(), assetId: "hglg11", amount: 9.5, date: dateInMonth(nowKey, Math.max(1, todayDay - 3)), type: "Rendimentos de FII", accountId: "corrente", asTransaction: true },
    ],
    recurring: [
      { id: uid(), name: "Aluguel", amount: 1400, day: 10, kind: "expense", categoryId: "moradia", accountId: "corrente" },
      { id: uid(), name: "Internet Vivo Fibra", amount: 119.9, day: 3, kind: "expense", categoryId: "moradia", accountId: "corrente" },
      { id: uid(), name: "Academia", amount: 99, day: 10, kind: "expense", categoryId: "assinaturas", accountId: "corrente" },
      { id: uid(), name: "Condomínio", amount: 320, day: 5, kind: "expense", categoryId: "moradia", accountId: "corrente" },
      { id: uid(), name: "Salário", amount: 5800, day: 5, kind: "income", categoryId: "salario", accountId: "corrente" },
      { id: uid(), name: "Energia Enel", amount: 175, day: 12, kind: "expense", categoryId: "moradia", accountId: "corrente" },
    ],
    merchantRules: [
      { merchant: "Supermercado Guanabara", categoryId: "alimentacao", subcategory: "Mercado", count: 7 },
      { merchant: "Posto Ipiranga", categoryId: "transporte", subcategory: "Combustível", count: 4 },
      { merchant: "Uber", categoryId: "transporte", subcategory: "Uber", count: 12 },
      { merchant: "Farmácia Santa Marta", categoryId: "saude", subcategory: "Farmácia", count: 2 },
    ],
  };
}
