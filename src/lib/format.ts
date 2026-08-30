// Formatting helpers — all user-facing values follow Brazilian conventions.

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brl0Fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const numFmt = (d: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: 0 });

/** R$ 1.250,90 */
export const brl = (v: number) => brlFmt.format(v);
/** R$ 1.251 (compact, for charts / big numbers) */
export const brl0 = (v: number) => brl0Fmt.format(v);
/** Signed currency: +R$ 440,00 / −R$ 12,00 */
export const brlSigned = (v: number) => (v >= 0 ? `+${brlFmt.format(v)}` : `−${brlFmt.format(Math.abs(v))}`);
/** 14,5 */
export const num = (v: number, d = 1) => numFmt(d).format(v);
/** 14,5% */
export const pct = (v: number, d = 0) => `${numFmt(d).format(v)}%`;

const pad = (n: number) => String(n).padStart(2, "0");
const safeDate = (iso: string) => new Date(`${iso}T12:00:00`);

/** 30/08 */
export const dShort = (iso: string) => {
  const d = safeDate(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
/** 30/08/2026 */
export const dFull = (iso: string) => {
  const d = safeDate(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
/** 15/03/2028 */
export const dLong = (iso: string) => dFull(iso);
/** sábado, 30 de agosto */
export const dHuman = (iso: string) => {
  const d = safeDate(iso);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
};
/** "hoje" | "ontem" | 30/08 */
export const dLabel = (iso: string) => {
  if (iso === todayISO()) return "Hoje";
  if (iso === addDaysISO(todayISO(), -1)) return "Ontem";
  return dShort(iso);
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const addDaysISO = (iso: string, days: number) => {
  const d = safeDate(iso);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** "2026-08" */
export const monthKey = (iso: string) => iso.slice(0, 7);
export const currentMonthKey = () => monthKey(todayISO());
export const addMonthsKey = (key: string, delta: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 15);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const daysInMonthKey = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};
/** agosto */
export const monthName = (key: string) =>
  new Date(`${key}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long" });
/** ago/26 */
export const monthShort = (key: string) => {
  const d = new Date(`${key}-15T12:00:00`);
  return `${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}/${String(d.getFullYear()).slice(2)}`;
};
export const monthLabelFull = (key: string) => {
  const d = new Date(`${key}-15T12:00:00`);
  const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
/** ISO date for a given month key + day (clamped). */
export const dateInMonth = (key: string, day: number) =>
  `${key}-${pad(Math.min(day, daysInMonthKey(key)))}`;

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Currency input mask: keeps only digits, treats them as cents. */
export const maskMoney = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  const cents = Number(digits || "0");
  return (cents / 100).toFixed(2);
};
export const parseMoney = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
