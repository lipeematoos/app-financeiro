// Domain model — mirrors the entities planned for the Flutter app (Drift/SQLite)
// and the FastAPI backend (PostgreSQL). UUIDs as primary keys.

export type Severity = "NORMAL" | "ATTENTION" | "HIGH" | "CRITICAL";

export type TxType = "INCOME" | "EXPENSE" | "TRANSFER" | "INVESTMENT_TRANSFER";
export type SourceType = "MANUAL" | "RECEIPT_OCR" | "RECURRING" | "SYSTEM";

export interface Category {
  id: string;
  name: string;
  kind: "expense" | "income";
  color: string;
  subs: string[];
  enabled: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: string; // Conta corrente, Dinheiro, Carteira digital...
  institution: string;
  initialBalance: number;
  icon: "bank" | "cash" | "digital" | "piggy";
}

export interface Card {
  id: string;
  name: string;
  institution: string;
  brand: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}

export interface Tx {
  id: string;
  type: TxType;
  amount: number;
  date: string; // ISO yyyy-mm-dd
  description: string;
  categoryId?: string;
  subcategory?: string;
  accountId?: string;
  toAccountId?: string; // TRANSFER destination / INVESTMENT_TRANSFER target
  cardId?: string;
  merchantName?: string;
  sourceType: SourceType;
  notes?: string;
  invoicePayment?: { cardId: string; month: string }; // marks a card invoice as paid
  installment?: string; // "2/3"
}

export interface Budget {
  categoryId: string;
  limit: number;
  threshold: number; // warning threshold in % (default 75)
  enabled: boolean;
}

export type AssetType =
  | "Ações"
  | "Fundos Imobiliários"
  | "Tesouro Direto"
  | "CDB"
  | "LCI"
  | "LCA"
  | "Fundos"
  | "Criptomoedas"
  | "Previdência"
  | "Poupança"
  | "Outros";

export interface Investment {
  id: string;
  assetType: AssetType;
  name: string;
  ticker?: string;
  institution: string;
  quantity: number;
  avgPrice: number;
  invested: number;
  current: number;
  acquired: string;
  maturity?: string;
  notes?: string;
}

export interface InvIncome {
  id: string;
  assetId: string;
  amount: number;
  date: string;
  type: string; // Dividendos, JCP, Rendimentos...
  accountId?: string;
  asTransaction: boolean;
}

export interface Recurring {
  id: string;
  name: string;
  amount: number;
  day: number;
  kind: "expense" | "income";
  categoryId?: string;
  accountId: string;
}

export interface MerchantRule {
  merchant: string;
  categoryId: string;
  subcategory?: string;
  count: number;
}

export interface NotifPrefs {
  upcomingBills: boolean;
  budgets: boolean;
  cardDue: boolean;
  investments: boolean;
}

export interface Settings {
  name: string;
  email: string;
  theme: "light" | "dark" | "system";
  recents: string[]; // recently used expense category ids
  notif: NotifPrefs;
}

export interface AppState {
  version: number;
  settings: Settings;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  budgets: Budget[];
  transactions: Tx[];
  investments: Investment[];
  invIncomes: InvIncome[];
  recurring: Recurring[];
  merchantRules: MerchantRule[];
}

export interface Insight {
  id: string;
  severity: Severity;
  kind: "overspend" | "threshold" | "average" | "velocity" | "anomaly" | "positive" | "info";
  title: string;
  body: string;
  categoryId?: string;
  delta?: number; // percentage difference when applicable
}
