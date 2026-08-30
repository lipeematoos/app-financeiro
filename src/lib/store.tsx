// App store: single source of truth persisted to localStorage (offline-first).
// Every mutation mirrors what the Drift + sync queue would do on mobile.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  Account,
  AppState,
  Budget,
  Card,
  Category,
  Investment,
  Recurring,
  Tx,
} from "./types";
import { buildSeed } from "./seed";
import { currentMonthKey, monthKey, todayISO, uid, dateInMonth, addMonthsKey } from "./format";

const LS_KEY = "cupom-state-v3";

export interface Toast {
  id: string;
  text: string;
  tone: "ink" | "green" | "red";
}

interface StoreApi {
  state: AppState;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
  // transactions
  addExpense: (t: Omit<Tx, "id" | "type" | "sourceType"> & { sourceType?: Tx["sourceType"] }) => void;
  addIncome: (t: Omit<Tx, "id" | "type" | "sourceType">) => void;
  addTransfer: (fromId: string, toId: string, amount: number, date: string) => void;
  deleteTx: (id: string) => void;
  payInvoice: (cardId: string, month: string, accountId: string, amount: number) => void;
  installmentPurchase: (p: { cardId: string; amount: number; installments: number; description: string; categoryId: string; firstDate: string }) => void;
  // organization
  upsertAccount: (a: Account) => void;
  upsertCard: (c: Card) => void;
  addCategory: (name: string, kind: "expense" | "income", subs: string[]) => void;
  toggleCategory: (id: string) => void;
  saveBudget: (b: Budget) => void;
  addRecurring: (r: Recurring) => void;
  deleteRecurring: (id: string) => void;
  // investments
  addInvestment: (i: Investment) => void;
  updateInvestment: (id: string, patch: Partial<Investment>) => void;
  investTransfer: (investmentId: string, accountId: string, amount: number, date: string) => void;
  addInvIncome: (p: { assetId: string; amount: number; date: string; type: string; accountId?: string; asTransaction: boolean }) => void;
  // merchant learning
  learnMerchant: (merchant: string, categoryId: string, subcategory?: string) => void;
  suggestFor: (merchant: string) => { categoryId: string; subcategory?: string } | null;
  // settings
  setName: (name: string) => void;
  setTheme: (t: AppState["settings"]["theme"]) => void;
  setNotif: (patch: Partial<AppState["settings"]["notif"]>) => void;
  pushRecent: (categoryId: string) => void;
  exportData: () => void;
  resetAll: () => void;
}

const Ctx = createContext<StoreApi | null>(null);

function load(): AppState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 3) return parsed;
    }
  } catch {
    /* corrupted storage → reseed */
  }
  return buildSeed();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* storage full — ignore in demo */
    }
  }, [state]);

  // Theme side-effect.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const t = state.settings.theme;
      const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [state.settings.theme]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ink") => {
    const id = uid();
    setToasts((ts) => [...ts.slice(-2), { id, text, tone }]);
    timers.current.push(window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3200));
  }, []);

  const api = useMemo<StoreApi>(() => {
    const set = (fn: (s: AppState) => AppState) => setState(fn);

    return {
      state,
      toasts,
      toast,

      addExpense: (t) => {
        const tx: Tx = { ...t, id: uid(), type: "EXPENSE", sourceType: t.sourceType ?? "MANUAL" };
        set((s) => ({ ...s, transactions: [tx, ...s.transactions] }));
      },
      addIncome: (t) => {
        const tx: Tx = { ...t, id: uid(), type: "INCOME", sourceType: "MANUAL" };
        set((s) => ({ ...s, transactions: [tx, ...s.transactions] }));
      },
      addTransfer: (fromId, toId, amount, date) => {
        const tx: Tx = {
          id: uid(),
          type: "TRANSFER",
          amount,
          date,
          description: "Transferência entre contas",
          accountId: fromId,
          toAccountId: toId,
          sourceType: "MANUAL",
        };
        set((s) => ({ ...s, transactions: [tx, ...s.transactions] }));
      },
      deleteTx: (id) => set((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) })),

      payInvoice: (cardId, month, accountId, amount) => {
        const card = state.cards.find((c) => c.id === cardId);
        const tx: Tx = {
          id: uid(),
          type: "EXPENSE",
          amount,
          date: todayISO(),
          description: `Pagamento fatura ${card?.institution ?? "cartão"}`,
          accountId,
          invoicePayment: { cardId, month },
          sourceType: "MANUAL",
        };
        set((s) => ({ ...s, transactions: [tx, ...s.transactions] }));
      },

      installmentPurchase: ({ cardId, amount, installments, description, categoryId, firstDate }) => {
        const value = Math.round((amount / installments) * 100) / 100;
        const mk = addMonthsKey(monthKey(firstDate), 0);
        const news: Tx[] = [];
        for (let i = 0; i < installments; i++) {
          const key = addMonthsKey(mk, i);
          news.push({
            id: uid(),
            type: "EXPENSE",
            amount: i === installments - 1 ? Math.round((amount - value * (installments - 1)) * 100) / 100 : value,
            date: dateInMonth(key, Number(firstDate.slice(8, 10))),
            description,
            categoryId,
            cardId,
            installment: `${i + 1}/${installments}`,
            sourceType: "MANUAL",
          });
        }
        set((s) => ({ ...s, transactions: [...news, ...s.transactions] }));
      },

      upsertAccount: (a) =>
        set((s) => {
          const exists = s.accounts.some((x) => x.id === a.id);
          return { ...s, accounts: exists ? s.accounts.map((x) => (x.id === a.id ? a : x)) : [...s.accounts, a] };
        }),
      upsertCard: (c) =>
        set((s) => {
          const exists = s.cards.some((x) => x.id === c.id);
          return { ...s, cards: exists ? s.cards.map((x) => (x.id === c.id ? c : x)) : [...s.cards, c] };
        }),

      addCategory: (name, kind, subs) =>
        set((s) => ({
          ...s,
          categories: [
            ...s.categories,
            { id: uid(), name, kind, subs, color: "#64748b", enabled: true },
          ],
        })),
      toggleCategory: (id) =>
        set((s) => ({
          ...s,
          categories: s.categories.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
        })),

      saveBudget: (b) =>
        set((s) => {
          const exists = s.budgets.some((x) => x.categoryId === b.categoryId);
          return { ...s, budgets: exists ? s.budgets.map((x) => (x.categoryId === b.categoryId ? b : x)) : [...s.budgets, b] };
        }),

      addRecurring: (r) => set((s) => ({ ...s, recurring: [...s.recurring, r] })),
      deleteRecurring: (id) => set((s) => ({ ...s, recurring: s.recurring.filter((r) => r.id !== id) })),

      addInvestment: (i) => set((s) => ({ ...s, investments: [...s.investments, i] })),
      updateInvestment: (id, patch) =>
        set((s) => ({ ...s, investments: s.investments.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),

      investTransfer: (investmentId, accountId, amount, date) => {
        const inv = state.investments.find((i) => i.id === investmentId);
        const tx: Tx = {
          id: uid(),
          type: "INVESTMENT_TRANSFER",
          amount,
          date,
          description: `Aporte em ${inv?.ticker ?? inv?.name ?? "investimento"}`,
          accountId,
          toAccountId: "investments",
          sourceType: "MANUAL",
        };
        set((s) => ({
          ...s,
          transactions: [tx, ...s.transactions],
          investments: s.investments.map((i) =>
            i.id === investmentId ? { ...i, invested: i.invested + amount, current: i.current + amount } : i,
          ),
        }));
      },

      addInvIncome: ({ assetId, amount, date, type, accountId, asTransaction }) => {
        const inv = state.investments.find((i) => i.id === assetId);
        const income = { id: uid(), assetId, amount, date, type, accountId, asTransaction };
        set((s) => {
          let transactions = s.transactions;
          if (asTransaction && accountId) {
            transactions = [
              {
                id: uid(),
                type: "INCOME",
                amount,
                date,
                description: `${type} · ${inv?.ticker ?? inv?.name ?? "ativo"}`,
                categoryId: "rendimentos",
                accountId,
                sourceType: "SYSTEM",
              },
              ...transactions,
            ];
          }
          return { ...s, invIncomes: [income, ...s.invIncomes], transactions };
        });
      },

      learnMerchant: (merchant, categoryId, subcategory) =>
        set((s) => {
          const found = s.merchantRules.find((r) => r.merchant === merchant);
          const rules = found
            ? s.merchantRules.map((r) =>
                r.merchant === merchant ? { ...r, categoryId, subcategory, count: r.count + 1 } : r,
              )
            : [...s.merchantRules, { merchant, categoryId, subcategory, count: 1 }];
          return { ...s, merchantRules: rules };
        }),
      suggestFor: (merchant) => {
        const rule = state.merchantRules.find(
          (r) => r.merchant.toLowerCase() === merchant.trim().toLowerCase(),
        );
        return rule ? { categoryId: rule.categoryId, subcategory: rule.subcategory } : null;
      },

      setName: (name) => set((s) => ({ ...s, settings: { ...s.settings, name } })),
      setTheme: (theme) => set((s) => ({ ...s, settings: { ...s.settings, theme } })),
      setNotif: (patch) =>
        set((s) => ({ ...s, settings: { ...s.settings, notif: { ...s.settings.notif, ...patch } } })),
      pushRecent: (categoryId) =>
        set((s) => ({
          ...s,
          settings: {
            ...s.settings,
            recents: [categoryId, ...s.settings.recents.filter((r) => r !== categoryId)].slice(0, 6),
          },
        })),

      exportData: () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cupom-dados-${todayISO()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      resetAll: () => {
        localStorage.removeItem(LS_KEY);
        setState(buildSeed());
      },
    };
  }, [state, toasts, toast]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

/** Animated count-up for big numbers. */
export function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      fromRef.current = 0;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export const catById = (s: AppState, id?: string): Category | undefined =>
  s.categories.find((c) => c.id === id);

export const monthNow = currentMonthKey;
