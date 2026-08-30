// Spending analysis engine — deterministic financial rules (no AI dependency).
// All functions are pure: they derive numbers from state only.

import type { AppState, Budget, Card, Insight, Severity, Tx } from "./types";
import {
  addDaysISO,
  addMonthsKey,
  currentMonthKey,
  dateInMonth,
  daysInMonthKey,
  monthKey,
  todayISO,
} from "./format";

export const sevRank: Record<Severity, number> = { NORMAL: 0, ATTENTION: 1, HIGH: 2, CRITICAL: 3 };
export const sevLabel: Record<Severity, string> = {
  NORMAL: "Dentro do esperado",
  ATTENTION: "Atenção",
  HIGH: "Acima do planejado",
  CRITICAL: "Gasto muito acima do padrão",
};

const isExpense = (t: Tx) => t.type === "EXPENSE";
const isIncome = (t: Tx) => t.type === "INCOME";

/* ------------------------------- totals ------------------------------- */

export function monthTx(state: AppState, key: string) {
  return state.transactions.filter((t) => monthKey(t.date) === key);
}

export function monthTotals(state: AppState, key: string) {
  const list = monthTx(state, key);
  const income = list.filter(isIncome).reduce((s, t) => s + t.amount, 0);
  const expense = list.filter(isExpense).reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
}

export function spentToday(state: AppState) {
  const today = todayISO();
  return state.transactions.filter((t) => isExpense(t) && t.date === today);
}

export function monthExpensesByCategory(state: AppState, key: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of monthTx(state, key)) {
    if (!isExpense(t) || !t.categoryId) continue;
    m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
  }
  return m;
}

export function monthExpensesBySub(state: AppState, key: string, categoryId: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of monthTx(state, key)) {
    if (!isExpense(t) || t.categoryId !== categoryId || !t.subcategory) continue;
    m.set(t.subcategory, (m.get(t.subcategory) ?? 0) + t.amount);
  }
  return m;
}

/** Average of the last N completed months for a category. */
export function categoryAvg(state: AppState, categoryId: string, n = 3) {
  const now = currentMonthKey();
  let sum = 0;
  let months = 0;
  for (let i = 1; i <= n; i++) {
    const key = addMonthsKey(now, -i);
    const spent = monthTx(state, key)
      .filter((t) => isExpense(t) && t.categoryId === categoryId)
      .reduce((s, t) => s + t.amount, 0);
    if (spent > 0) {
      sum += spent;
      months++;
    }
  }
  return months === 0 ? 0 : sum / months;
}

export function subcategoryAvg(state: AppState, categoryId: string, sub: string, n = 3) {
  const now = currentMonthKey();
  let sum = 0;
  let months = 0;
  for (let i = 1; i <= n; i++) {
    const key = addMonthsKey(now, -i);
    const spent = monthTx(state, key)
      .filter((t) => isExpense(t) && t.categoryId === categoryId && t.subcategory === sub)
      .reduce((s, t) => s + t.amount, 0);
    if (spent > 0) {
      sum += spent;
      months++;
    }
  }
  return months === 0 ? 0 : sum / months;
}

/* ------------------------------ balances ------------------------------ */

export function accountBalance(state: AppState, accountId: string) {
  const acc = state.accounts.find((a) => a.id === accountId);
  let v = acc?.initialBalance ?? 0;
  for (const t of state.transactions) {
    if (t.type === "INCOME" && t.accountId === accountId) v += t.amount;
    if (t.type === "EXPENSE" && t.accountId === accountId) v -= t.amount;
    if (t.type === "TRANSFER") {
      if (t.accountId === accountId) v -= t.amount;
      if (t.toAccountId === accountId) v += t.amount;
    }
    if (t.type === "INVESTMENT_TRANSFER" && t.accountId === accountId) v -= t.amount;
  }
  return v;
}

export function accountsTotal(state: AppState) {
  return state.accounts.reduce((s, a) => s + accountBalance(state, a.id), 0);
}

export function investmentsTotal(state: AppState) {
  return state.investments.reduce((s, i) => s + i.current, 0);
}

export function netWorth(state: AppState) {
  const accounts = accountsTotal(state);
  const investments = investmentsTotal(state);
  return { accounts, investments, total: accounts + investments };
}

/* ---------------------------- credit cards ---------------------------- */

export function cardInvoice(state: AppState, cardId: string, key: string) {
  const purchases = state.transactions.filter(
    (t) => isExpense(t) && t.cardId === cardId && monthKey(t.date) === key,
  );
  const total = purchases.reduce((s, t) => s + t.amount, 0);
  const payment = state.transactions.find(
    (t) => t.invoicePayment?.cardId === cardId && t.invoicePayment.month === key,
  );
  return { total, paid: Boolean(payment), purchases };
}

export function cardAvailable(state: AppState, card: Card) {
  const open = cardInvoice(state, card.id, currentMonthKey()).total;
  return Math.max(0, card.limit - open);
}

/* ------------------------------ budgets ------------------------------- */

export function budgetStatus(state: AppState, b: Budget, key = currentMonthKey()) {
  const cat = state.categories.find((c) => c.id === b.categoryId);
  const spent = monthExpensesByCategory(state, key).get(b.categoryId) ?? 0;
  const used = b.limit > 0 ? (spent / b.limit) * 100 : 0;
  let severity: Severity = "NORMAL";
  if (used >= 120) severity = "CRITICAL";
  else if (used > 100) severity = "HIGH";
  else if (used >= b.threshold) severity = "ATTENTION";
  return { budget: b, category: cat, spent, used, severity };
}

export const allBudgetStatus = (state: AppState, key = currentMonthKey()) =>
  state.budgets.filter((b) => b.enabled).map((b) => budgetStatus(state, b, key));

/* --------------------------- upcoming bills --------------------------- */

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  date: string;
  kind: "conta" | "cartao" | "receber";
}

export function upcomingBills(state: AppState, limit = 5): UpcomingBill[] {
  const today = todayISO();
  const out: UpcomingBill[] = [];
  const nowKey = currentMonthKey();
  const nextKey = addMonthsKey(nowKey, 1);
  const todayDay = Number(today.slice(8, 10));

  for (const r of state.recurring) {
    const key = r.day >= todayDay ? nowKey : nextKey;
    out.push({
      id: `rec-${r.id}`,
      name: r.name,
      amount: r.amount,
      date: dateInMonth(key, r.day),
      kind: r.kind === "income" ? "receber" : "conta",
    });
  }
  for (const c of state.cards) {
    const key = c.dueDay >= todayDay ? nowKey : nextKey;
    const inv = cardInvoice(state, c.id, key);
    if (inv.total > 0 && !inv.paid)
      out.push({ id: `card-${c.id}-${key}`, name: `Cartão ${c.institution}`, amount: inv.total, date: dateInMonth(key, c.dueDay), kind: "cartao" });
  }
  return out
    .filter((b) => b.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

/* ------------------------- insights (5 methods) ----------------------- */

const fmtB = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function buildInsights(state: AppState): Insight[] {
  const out: Insight[] = [];
  const now = currentMonthKey();
  const spentByCat = monthExpensesByCategory(state, now);
  const catName = (id?: string) => state.categories.find((c) => c.id === id)?.name ?? "categoria";

  // METHOD 1 — budget overspend.
  for (const s of allBudgetStatus(state)) {
    if (s.spent > s.budget.limit) {
      const over = s.spent - s.budget.limit;
      out.push({
        id: `over-${s.budget.categoryId}`,
        severity: s.used >= 120 ? "CRITICAL" : "HIGH",
        kind: "overspend",
        title: `Orçamento de ${s.category?.name} estourado`,
        body: `Você ultrapassou seu orçamento de ${s.category?.name} em ${fmtB(over)}.`,
        categoryId: s.budget.categoryId,
        delta: s.used - 100,
      });
    }
  }

  // METHOD 2 — budget warning (threshold reached, still under limit).
  for (const s of allBudgetStatus(state)) {
    if (s.spent <= s.budget.limit && s.used >= s.budget.threshold) {
      out.push({
        id: `warn-${s.budget.categoryId}`,
        severity: "ATTENTION",
        kind: "threshold",
        title: `${s.category?.name} chegando no limite`,
        body: `Você já utilizou ${Math.round(s.used)}% do orçamento de ${s.category?.name}.`,
        categoryId: s.budget.categoryId,
        delta: s.used,
      });
    }
  }

  // METHOD 3 — historical average (category + notable subcategories).
  for (const [cid, spent] of spentByCat) {
    const avg = categoryAvg(state, cid);
    if (avg > 40 && spent > avg * 1.2 && spent - avg > 40) {
      const delta = ((spent - avg) / avg) * 100;
      out.push({
        id: `avg-${cid}`,
        severity: delta >= 50 ? "HIGH" : "ATTENTION",
        kind: "average",
        title: `${catName(cid)} acima da média`,
        body: `Seu gasto com ${catName(cid)} está ${Math.round(delta)}% acima da sua média de 3 meses.`,
        categoryId: cid,
        delta,
      });
    }
  }
  const deliveryNow = monthExpensesBySub(state, now, "alimentacao").get("Delivery") ?? 0;
  const deliveryAvg = subcategoryAvg(state, "alimentacao", "Delivery");
  if (deliveryAvg > 0 && deliveryNow > deliveryAvg * 1.2) {
    const delta = ((deliveryNow - deliveryAvg) / deliveryAvg) * 100;
    out.push({
      id: "avg-delivery",
      severity: delta >= 50 ? "HIGH" : "ATTENTION",
      kind: "average",
      title: "Delivery acelerado",
      body: `Seu gasto com Delivery está ${Math.round(delta)}% acima da sua média.`,
      categoryId: "alimentacao",
      delta,
    });
  }

  // METHOD 4 — spending velocity (budget consumed vs month elapsed).
  const day = Number(todayISO().slice(8, 10));
  const elapsed = (day / daysInMonthKey(now)) * 100;
  for (const s of allBudgetStatus(state)) {
    if (s.used - elapsed > 25 && s.used <= 100) {
      out.push({
        id: `vel-${s.budget.categoryId}`,
        severity: "ATTENTION",
        kind: "velocity",
        title: `Ritmo acelerado em ${s.category?.name}`,
        body: `Seu ritmo de gastos com ${s.category?.name} está acelerado: ${Math.round(s.used)}% do orçamento usado com ${Math.round(elapsed)}% do mês.`,
        categoryId: s.budget.categoryId,
        delta: s.used - elapsed,
      });
    }
  }

  // METHOD 5 — anomaly (far above historical behaviour).
  for (const [cid, spent] of spentByCat) {
    if (out.some((i) => i.categoryId === cid && i.kind !== "info")) continue;
    const vals: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const key = addMonthsKey(now, -i);
      vals.push(
        monthTx(state, key)
          .filter((t) => isExpense(t) && t.categoryId === cid)
          .reduce((s, t) => s + t.amount, 0),
      );
    }
    const avg = vals.reduce((a, b) => a + b, 0) / 3;
    if (avg > 30 && spent > avg * 1.6) {
      out.push({
        id: `anom-${cid}`,
        severity: spent > avg * 2.2 ? "CRITICAL" : "ATTENTION",
        kind: "anomaly",
        title: `Gasto fora do padrão em ${catName(cid)}`,
        body: `Você gastou mais do que o normal com ${catName(cid)} este mês.`,
        categoryId: cid,
        delta: ((spent - avg) / avg) * 100,
      });
    }
  }

  // Positive / informational insights.
  const totals = monthTotals(state, now);
  const prev = monthTotals(state, addMonthsKey(now, -1));
  const contributions = state.transactions
    .filter((t) => t.type === "INVESTMENT_TRANSFER" && monthKey(t.date) === now)
    .reduce((s, t) => s + t.amount, 0);
  if (totals.income > 0 && contributions > 0) {
    const rate = (contributions / totals.income) * 100;
    out.push({
      id: "invest-rate",
      severity: "NORMAL",
      kind: "positive",
      title: "Taxa de investimento",
      body: `Você recebeu ${fmtB(totals.income)} este mês e investiu ${fmtB(contributions)} — uma taxa de ${rate.toFixed(1).replace(".", ",")}%.`,
    });
  }
  if (prev.balance > 0 && totals.balance > prev.balance) {
    out.push({
      id: "savings",
      severity: "NORMAL",
      kind: "positive",
      title: "Saldo melhor que o mês passado",
      body: `Você economizou ${fmtB(totals.balance - prev.balance)} a mais do que no mês passado.`,
    });
  }
  const top = [...spentByCat.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) {
    out.push({
      id: "top-cat",
      severity: "NORMAL",
      kind: "info",
      title: "Maior gasto do mês",
      body: `Seu maior gasto do mês foi ${catName(top[0])}, com ${fmtB(top[1])}.`,
      categoryId: top[0],
    });
  }

  return out.sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);
}

/** Highest-priority insight for the home RADAR DE GASTOS. */
export function radarInsight(state: AppState): Insight | null {
  const list = buildInsights(state).filter((i) => sevRank[i.severity] >= 1);
  return list[0] ?? null;
}

/* --------------------------- investments ------------------------------ */

export function investmentMetrics(state: AppState) {
  const invested = state.investments.reduce((s, i) => s + i.invested, 0);
  const current = investmentsTotal(state);
  const result = current - invested;
  const resultPct = invested > 0 ? (result / invested) * 100 : 0;
  const now = currentMonthKey();
  const incomeMonth = state.invIncomes.filter((i) => monthKey(i.date) === now).reduce((s, i) => s + i.amount, 0);
  const incomeYear = state.invIncomes
    .filter((i) => i.date.slice(0, 4) === now.slice(0, 4))
    .reduce((s, i) => s + i.amount, 0);
  const byType = new Map<string, number>();
  for (const i of state.investments) byType.set(i.assetType, (byType.get(i.assetType) ?? 0) + i.current);

  // Monthly contributions over the last 6 months.
  const contributions: { key: string; value: number }[] = [];
  for (let off = 5; off >= 0; off--) {
    const key = addMonthsKey(now, -off);
    contributions.push({
      key,
      value: state.transactions
        .filter((t) => t.type === "INVESTMENT_TRANSFER" && monthKey(t.date) === key)
        .reduce((s, t) => s + t.amount, 0),
    });
  }
  const incomeTotals = monthTotals(state, now);
  const investedThisMonth = contributions[contributions.length - 1]?.value ?? 0;
  const investRate = incomeTotals.income > 0 ? (investedThisMonth / incomeTotals.income) * 100 : 0;

  return { invested, current, result, resultPct, incomeMonth, incomeYear, byType, contributions, investRate, investedThisMonth };
}

/* ----------------------------- calendar ------------------------------- */

export interface CalEvent {
  id: string;
  name: string;
  amount: number;
  kind: "conta" | "cartao" | "receber" | "lancado";
}

export function eventsForMonth(state: AppState, key: string): Map<number, CalEvent[]> {
  const m = new Map<number, CalEvent[]>();
  const add = (day: number, e: CalEvent) => {
    const list = m.get(day) ?? [];
    list.push(e);
    m.set(day, list);
  };
  const days = daysInMonthKey(key);
  for (const r of state.recurring) {
    if (r.day <= days)
      add(Math.min(r.day, days), {
        id: `r-${r.id}`,
        name: r.name,
        amount: r.amount,
        kind: r.kind === "income" ? "receber" : "conta",
      });
  }
  for (const c of state.cards) {
    if (c.dueDay <= days)
      add(c.dueDay, { id: `c-${c.id}`, name: `Fatura ${c.institution}`, amount: cardInvoice(state, c.id, key).total, kind: "cartao" });
  }
  for (const t of state.transactions) {
    if (monthKey(t.date) === key) {
      const d = Number(t.date.slice(8, 10));
      add(d, { id: `t-${t.id}`, name: t.description, amount: t.type === "INCOME" ? t.amount : -t.amount, kind: "lancado" });
    }
  }
  return m;
}

export const nextDueDate = (dueDay: number) => {
  const today = todayISO();
  const day = Number(today.slice(8, 10));
  const key = monthKey(today);
  if (dueDay >= day) return dateInMonth(key, dueDay);
  return dateInMonth(addMonthsKey(key, 1), dueDay);
};

export const daysUntil = (iso: string) => {
  const ms = new Date(`${iso}T12:00:00`).getTime() - new Date(`${todayISO()}T12:00:00`).getTime();
  return Math.round(ms / 86400000);
};

export { addDaysISO };
