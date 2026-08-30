import { useMemo } from "react";
import { useStore, useCountUp } from "../lib/store";
import {
  allBudgetStatus,
  monthTotals,
  netWorth,
  radarInsight,
  sevRank,
  spentToday,
  upcomingBills,
} from "../lib/engine";
import { brl, brl0, currentMonthKey, dLabel, monthLabelFull, pct } from "../lib/format";
import { I, Leader, Paper, Reveal, SectionHead, SevBadge, Bar, Dot } from "../components/ui";
import type { Severity } from "../lib/types";

const sevColor: Record<Severity, string> = {
  NORMAL: "var(--green)",
  ATTENTION: "var(--amber)",
  HIGH: "var(--red)",
  CRITICAL: "var(--red)",
};

export default function Home({ go, open }: { go: (tab: string) => void; open: (o: string) => void }) {
  const { state } = useStore();
  const now = currentMonthKey();
  const totals = useMemo(() => monthTotals(state, now), [state, now]);
  const today = useMemo(() => spentToday(state), [state]);
  const radar = useMemo(() => radarInsight(state), [state]);
  const budgets = useMemo(() => allBudgetStatus(state).filter((b) => b.used >= b.budget.threshold || b.spent > b.budget.limit).sort((a, b) => b.used - a.used).slice(0, 4), [state]);
  const bills = useMemo(() => upcomingBills(state, 4), [state]);
  const worth = useMemo(() => netWorth(state), [state]);

  const totalToday = today.reduce((s, t) => s + t.amount, 0);
  const worthAnim = useCountUp(worth.total);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const catName = (id?: string) => state.categories.find((c) => c.id === id)?.name ?? "";

  return (
    <div className="px-4 pb-8">
      {/* Header */}
      <header className="flex items-center justify-between pt-4 pb-4 px-1">
        <div>
          <p className="font-display text-[11px] tracking-[0.28em] text-[var(--ink-soft)] flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-[2px]" style={{ background: "var(--red)" }} />
            CUPOM*
          </p>
          <h1 className="font-display text-[21px] leading-tight mt-0.5">
            {greeting}, {state.settings.name}
          </h1>
          <p className="text-[12px] text-[var(--ink-soft)] capitalize-first mt-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button onClick={() => open("settings")} className="pressable w-10 h-10 rounded-full paper-card flex items-center justify-center text-[var(--ink-soft)]" aria-label="Configurações">
          {I.gear({ size: 18 })}
        </button>
      </header>

      {/* SECTION 1 — RADAR DE GASTOS */}
      <Reveal>
        <SectionHead title="RADAR DE GASTOS" />
        <div className="notch paper-card px-5 py-4 mb-2" style={{ background: "var(--ink-card)", borderColor: "transparent", color: "var(--ink-card-text)" }}>
          {radar ? (
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 relative w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, currentColor 12%, transparent)", color: sevColor[radar.severity] }}>
                {I.radar({ size: 19 })}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border" style={{ borderColor: sevColor[radar.severity], color: sevColor[radar.severity] }}>
                    {radar.severity === "CRITICAL" ? "Crítico" : radar.severity === "HIGH" ? "Alto" : "Atenção"}
                  </span>
                  {radar.categoryId && (
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] opacity-60">{catName(radar.categoryId)}</span>
                  )}
                </div>
                <p className="font-display text-[15.5px] leading-snug mt-1.5">{radar.title}</p>
                <p className="text-[12.5px] leading-relaxed opacity-75 mt-1">{radar.body}</p>
                <button
                  onClick={() => go("analytics:alertas")}
                  className="mt-2.5 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] underline underline-offset-4 decoration-dotted hover:opacity-80"
                >
                  Ver detalhes {I.chevR({ size: 12 })}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
                {I.check({ size: 18 })}
              </span>
              <div>
                <p className="font-display text-[15px]">Tudo dentro do esperado</p>
                <p className="text-[12.5px] opacity-70">Nenhum gasto fora do padrão detectado este mês.</p>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* SECTION 2 — RESUMO DO MÊS */}
      <Reveal delay={60}>
        <div className="mt-6">
          <SectionHead title={`RESUMO · ${monthLabelFull(now).toUpperCase()}`} action="Movimentações" onAction={() => go("transactions")} />
          <Paper edge className="px-5 pt-4 pb-3">
            <p className="font-mono text-[9.5px] tracking-[0.22em] text-[var(--ink-faint)] text-center mb-2">*** EXTRATO DO PERÍODO ***</p>
            <Leader label="Entradas" value={brl(totals.income)} tone="green" />
            <Leader label="Saídas" value={`(${brl(totals.expense)})`} tone="red" />
            <div className="rule-dashed my-2" />
            <Leader label="Saldo" value={brl(totals.balance)} strong tone={totals.balance >= 0 ? "green" : "red"} />
            <p className="font-mono text-[9px] tracking-[0.18em] text-[var(--ink-faint)] text-center mt-3">OBRIGADO PELA PREFERÊNCIA</p>
          </Paper>
        </div>
      </Reveal>

      {/* SECTION 3 — GASTEI HOJE */}
      <Reveal delay={80}>
        <div className="mt-8">
          <SectionHead title="GASTEI HOJE" />
          {today.length === 0 ? (
            <Paper className="px-5 py-5 text-center">
              <p className="text-[13.5px] text-[var(--ink-soft)]">Você ainda não registrou gastos hoje.</p>
              <button onClick={() => open("expense")} className="btn btn-ghost !py-2 text-[12.5px] mt-3 mx-auto">
                {I.plus({ size: 14 })} Registrar primeiro gasto
              </button>
            </Paper>
          ) : (
            <Paper edge className="px-5 pt-3.5 pb-3">
              {today.slice(0, 5).map((t) => (
                <div key={t.id} className="leader py-[4.5px] anim-tick">
                  <span className="lbl !normal-case !tracking-normal !text-[13px] truncate" style={{ fontFamily: "'Spline Sans', sans-serif", fontWeight: 500, color: "var(--ink)" }}>
                    {t.merchantName ?? t.description}
                  </span>
                  <span className="dots" />
                  <span className="val" style={{ fontSize: 13.5 }}>{brl(t.amount)}</span>
                </div>
              ))}
              {today.length > 5 && (
                <p className="text-[11.5px] text-[var(--ink-faint)] text-center pt-1.5">+{today.length - 5} lançamentos</p>
              )}
              <div className="rule-dotted my-2" />
              <Leader label="Total hoje" value={brl(totalToday)} strong tone="red" />
            </Paper>
          )}
        </div>
      </Reveal>

      {/* SECTION 4 — CATEGORIAS EM ATENÇÃO */}
      <Reveal delay={90}>
        <div className="mt-8">
          <SectionHead title="CATEGORIAS EM ATENÇÃO" action="Orçamentos" onAction={() => open("budgets")} />
          {budgets.length === 0 ? (
            <Paper className="px-5 py-4">
              <p className="text-[13px] text-[var(--ink-soft)]">Nenhuma categoria perto do limite. {""}
                <button onClick={() => open("budgets")} className="font-semibold text-[var(--ink)] underline decoration-dotted underline-offset-4">Ajustar orçamentos</button>
              </p>
            </Paper>
          ) : (
            <div className="grid gap-2.5">
              {budgets.map((b) => {
                const tone = b.severity === "NORMAL" ? "green" : b.severity === "ATTENTION" ? "amber" : "red";
                return (
                  <Paper key={b.budget.categoryId} className="px-4 py-3">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="font-semibold text-[13.5px] flex items-center gap-2">
                        <Dot color={b.category?.color ?? "#888"} />
                        {b.category?.name}
                      </span>
                      <span className="font-mono text-[12px] font-bold" style={{ color: sevColor[b.severity] }}>{pct(b.used)}</span>
                    </div>
                    <Bar pct={b.used} tone={tone as "green" | "amber" | "red"} />
                    <p className="font-mono text-[10.5px] text-[var(--ink-soft)] mt-1.5">
                      {brl(b.spent)} <span className="opacity-60">de {brl0(b.budget.limit)}</span>
                    </p>
                  </Paper>
                );
              })}
            </div>
          )}
        </div>
      </Reveal>

      {/* SECTION 5 — PRÓXIMAS CONTAS */}
      <Reveal delay={100}>
        <div className="mt-8">
          <SectionHead title="PRÓXIMAS CONTAS" action="Calendário" onAction={() => open("planning")} />
          <Paper className="divide-y" style={{ borderColor: "var(--line)" }}>
            {bills.length === 0 && <p className="px-5 py-5 text-[13px] text-[var(--ink-soft)]">Nenhuma conta agendada. Aproveite o mês tranquilo.</p>}
            {bills.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--line)" }}>
                <div className="w-11 h-11 rounded-[10px] flex flex-col items-center justify-center shrink-0 font-mono" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                  <span className="text-[13px] font-extrabold leading-none">{b.date.slice(8, 10)}</span>
                  <span className="text-[8px] uppercase tracking-wider text-[var(--ink-soft)] mt-0.5">
                    {dLabel(b.date) === "Hoje" ? "hoje" : new Date(`${b.date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[13.5px] truncate">{b.name}</p>
                  <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    {b.kind === "cartao" ? "fatura do cartão" : b.kind === "receber" ? "a receber" : "recorrente"}
                  </p>
                </div>
                <span className="font-mono font-bold text-[13.5px]" style={{ color: b.kind === "receber" ? "var(--green)" : "var(--ink)" }}>
                  {b.kind === "receber" ? `+${brl(b.amount)}` : brl(b.amount)}
                </span>
              </div>
            ))}
          </Paper>
        </div>
      </Reveal>

      {/* SECTION 6 — PATRIMÔNIO */}
      <Reveal delay={110}>
        <div className="mt-8">
          <SectionHead title="SEU PATRIMÔNIO" action="Detalhes" onAction={() => go("wealth")} />
          <Paper edge className="px-5 pt-4 pb-3 pressable" >
            <div onClick={() => go("wealth")}>
              <Leader label="Contas" value={brl(worth.accounts)} />
              <Leader label="Investimentos" value={brl(worth.investments)} />
              <div className="rule-dashed my-2" />
              <Leader label="Total" value={brl(worthAnim)} strong />
              <p className="font-mono text-[9px] tracking-[0.18em] text-[var(--ink-faint)] text-center mt-3">ATUALIZADO NESTE DISPOSITIVO</p>
            </div>
          </Paper>
        </div>
      </Reveal>

      {/* Insight strip */}
      <Reveal delay={120}>
        <div className="mt-8 flex items-center gap-3 px-1 pb-2">
          <span className="shrink-0 text-[var(--amber)]">{I.spark({ size: 16 })}</span>
          <p className="text-[12.5px] text-[var(--ink-soft)] leading-relaxed">
            {radar && sevRank[radar.severity] >= 1
              ? `Fique de olho: ${radar.body.charAt(0).toLowerCase() + radar.body.slice(1)}`
              : "Seus gastos estão sob controle. Continue registrando para manter o radar preciso."}
          </p>
        </div>
      </Reveal>
    </div>
  );
}
