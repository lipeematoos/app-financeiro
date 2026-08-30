import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import {
  allBudgetStatus,
  buildInsights,
  investmentMetrics,
  monthExpensesByCategory,
  monthTotals,
  sevRank,
} from "../lib/engine";
import { addMonthsKey, brl, brl0, currentMonthKey, monthLabelFull, monthShort, num, pct } from "../lib/format";
import { AreaLine, Donut, GroupedBars, MiniBars } from "../components/charts";
import { Bar, Dot, I, Leader, Paper, Reveal, SevBadge, EmptyState } from "../components/ui";

type Tab = "geral" | "categorias" | "evolucao" | "invest" | "alertas";

const TABS: { v: Tab; label: string }[] = [
  { v: "geral", label: "Visão geral" },
  { v: "categorias", label: "Categorias" },
  { v: "evolucao", label: "Evolução" },
  { v: "invest", label: "Investimentos" },
  { v: "alertas", label: "Alertas" },
];

export default function Analytics({ initialTab = "geral" }: { initialTab?: string }) {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>((TABS.some((t) => t.v === initialTab) ? initialTab : "geral") as Tab);
  const now = currentMonthKey();
  const totals = useMemo(() => monthTotals(state, now), [state, now]);
  const byCat = useMemo(() => monthExpensesByCategory(state, now), [state, now]);
  const insights = useMemo(() => buildInsights(state), [state]);
  const metrics = useMemo(() => investmentMetrics(state), [state]);

  const months = useMemo(() => {
    const keys: string[] = [];
    for (let i = 5; i >= 0; i--) keys.push(addMonthsKey(now, -i));
    return keys;
  }, [now]);

  const series = useMemo(
    () =>
      months.map((k) => {
        const t = monthTotals(state, k);
        return { label: monthShort(k), a: t.income, b: t.expense };
      }),
    [state, months],
  );

  const expenseSeries = useMemo(() => months.map((k) => monthTotals(state, k).expense), [state, months]);
  const balanceSeries = useMemo(() => months.map((k) => monthTotals(state, k).balance), [state, months]);

  const topCats = useMemo(
    () =>
      [...byCat.entries()]
        .map(([id, v]) => ({ cat: state.categories.find((c) => c.id === id), v }))
        .filter((x) => x.cat)
        .sort((a, b) => b.v - a.v),
    [byCat, state.categories],
  );

  const catName = (id?: string) => state.categories.find((c) => c.id === id)?.name ?? "—";
  const alerts = insights.filter((i) => sevRank[i.severity] >= 1);

  return (
    <div className="px-4 pb-8">
      <header className="pt-5 pb-3 px-1">
        <h1 className="font-display text-[21px]">Análises</h1>
        <p className="text-[12px] text-[var(--ink-soft)] mt-0.5">{monthLabelFull(now)} · inteligência de gastos</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3 sticky top-0 z-10" style={{ background: "var(--bg)" }}>
        {TABS.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className="chip"
            style={tab === t.v ? { background: "var(--ink)", borderColor: "var(--ink)", color: "var(--paper)" } : undefined}
          >
            {t.label}
            {t.v === "alertas" && alerts.length > 0 && (
              <span className="ml-0.5 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full text-[9.5px] font-mono font-bold flex items-center justify-center" style={{ background: "var(--red)", color: "#fff" }}>
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ------------------------- VISÃO GERAL ------------------------- */}
      {tab === "geral" && (
        <div className="anim-fade">
          <Reveal>
            <Paper edge className="px-5 pt-4 pb-3 mb-8">
              <p className="font-mono text-[9.5px] tracking-[0.22em] text-[var(--ink-faint)] text-center mb-2">*** FECHAMENTO PARCIAL ***</p>
              <Leader label="Entradas" value={brl(totals.income)} tone="green" />
              <Leader label="Saídas" value={brl(totals.expense)} tone="red" />
              <Leader label="Aportes" value={brl(metrics.investedThisMonth)} />
              <div className="rule-dashed my-2" />
              <Leader label="Saldo" value={brl(totals.balance)} strong tone={totals.balance >= 0 ? "green" : "red"} />
              <Leader label="Taxa de investimento" value={pct(metrics.investRate, 1)} tone="green" />
            </Paper>
          </Reveal>

          <Reveal delay={60}>
            <p className="font-display text-[12px] tracking-[0.14em] mb-2 px-1">ENTRADAS × SAÍDAS · 6 MESES</p>
            <Paper className="px-4 pt-4 pb-3">
              <GroupedBars data={series} aLabel="Entradas" bLabel="Saídas" />
            </Paper>
          </Reveal>

          <Reveal delay={80}>
            <p className="font-display text-[12px] tracking-[0.14em] mt-6 mb-2 px-1">DESTAQUES DO MÊS</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Paper className="px-4 py-3.5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Maior gasto</p>
                <p className="font-display text-[14px] mt-1">{topCats[0] ? catName(topCats[0].cat?.id) : "—"}</p>
                <p className="font-mono text-[12px] font-bold text-[var(--red)] mt-0.5">{topCats[0] ? brl(topCats[0].v) : ""}</p>
              </Paper>
              <Paper className="px-4 py-3.5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Rendimentos no mês</p>
                <p className="font-display text-[14px] mt-1">Investimentos</p>
                <p className="font-mono text-[12px] font-bold text-[var(--green)] mt-0.5">{brl(metrics.incomeMonth)}</p>
              </Paper>
              <Paper className="px-4 py-3.5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Gasto médio/dia</p>
                <p className="font-mono text-[17px] font-extrabold mt-1">{brl(totals.expense / Math.max(1, Number(new Date().getDate())))}</p>
              </Paper>
              <Paper className="px-4 py-3.5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Alertas ativos</p>
                <p className="font-mono text-[17px] font-extrabold mt-1" style={{ color: alerts.length > 0 ? "var(--red)" : "var(--green)" }}>{alerts.length}</p>
              </Paper>
            </div>
          </Reveal>
        </div>
      )}

      {/* ------------------------- CATEGORIAS ------------------------- */}
      {tab === "categorias" && (
        <div className="anim-fade">
          {topCats.length === 0 ? (
            <EmptyState icon={I.tag({ size: 22 })} title="Sem gastos este mês" hint="Quando você registrar gastos, a distribuição por categoria aparece aqui." />
          ) : (
            <>
              <Reveal>
                <Paper className="p-4 flex items-center gap-4">
                  <Donut
                    slices={topCats.slice(0, 6).map((t) => ({ label: t.cat!.name, value: t.v, color: t.cat!.color }))}
                    centerTop={brl0(totals.expense)}
                    centerBottom="total"
                    size={150}
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {topCats.slice(0, 6).map((t) => (
                      <div key={t.cat!.id} className="flex items-center gap-2 text-[12px]">
                        <Dot color={t.cat!.color} size={8} />
                        <span className="truncate font-semibold flex-1">{t.cat!.name}</span>
                        <span className="font-mono font-bold">{pct((t.v / Math.max(1, totals.expense)) * 100)}</span>
                      </div>
                    ))}
                  </div>
                </Paper>
              </Reveal>
              <div className="mt-4 grid gap-2.5">
                {topCats.map((t, i) => (
                  <Reveal key={t.cat!.id} delay={i * 40}>
                    <Paper className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-[13.5px] flex items-center gap-2">
                          <Dot color={t.cat!.color} /> {t.cat!.name}
                        </span>
                        <span className="font-mono font-bold text-[13px]">{brl(t.v)}</span>
                      </div>
                      <Bar pct={(t.v / Math.max(1, topCats[0].v)) * 100} tone="ink" h={6} />
                      <p className="font-mono text-[10.5px] text-[var(--ink-soft)] mt-1.5">{pct((t.v / Math.max(1, totals.expense)) * 100)} do total gasto</p>
                    </Paper>
                  </Reveal>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* -------------------------- EVOLUÇÃO -------------------------- */}
      {tab === "evolucao" && (
        <div className="anim-fade">
          <Reveal>
            <p className="font-display text-[12px] tracking-[0.14em] mb-2 px-1">SAÍDAS POR MÊS</p>
            <Paper className="px-4 pt-4 pb-2">
              <AreaLine points={expenseSeries} labels={months.map(monthShort)} color="var(--red)" unit={brl0(expenseSeries[expenseSeries.length - 1])} />
            </Paper>
          </Reveal>
          <Reveal delay={60}>
            <p className="font-display text-[12px] tracking-[0.14em] mt-5 mb-2 px-1">SALDO DO MÊS</p>
            <Paper className="px-4 pt-4 pb-2">
              <AreaLine points={balanceSeries.map((v) => Math.max(0, v))} labels={months.map(monthShort)} color="var(--green)" unit={brl0(balanceSeries[balanceSeries.length - 1])} />
            </Paper>
          </Reveal>
          <Reveal delay={80}>
            <p className="font-display text-[12px] tracking-[0.14em] mt-5 mb-2 px-1">COMPARATIVO</p>
            <Paper className="px-5 pt-4 pb-3">
              {months.slice(-3).map((k) => {
                const t = monthTotals(state, k);
                return <Leader key={k} label={monthLabelFull(k).split(" ")[0]} value={brl(t.balance)} tone={t.balance >= 0 ? "green" : "red"} />;
              })}
              <div className="rule-dashed my-2" />
              <p className="text-[11.5px] text-[var(--ink-soft)] leading-relaxed">
                O saldo considera entradas menos saídas, incluindo pagamentos de fatura.
              </p>
            </Paper>
          </Reveal>
        </div>
      )}

      {/* ------------------------ INVESTIMENTOS ------------------------ */}
      {tab === "invest" && (
        <div className="anim-fade">
          <Reveal>
            <Paper edge className="px-5 pt-4 pb-3 mb-8">
              <p className="font-mono text-[9.5px] tracking-[0.22em] text-[var(--ink-faint)] text-center mb-2">*** CARTEIRA ***</p>
              <Leader label="Investido" value={brl(metrics.invested)} />
              <Leader label="Valor atual" value={brl(metrics.current)} />
              <div className="rule-dashed my-2" />
              <Leader label="Resultado" value={`${metrics.result >= 0 ? "+" : ""}${brl(metrics.result)}`} tone={metrics.result >= 0 ? "green" : "red"} strong />
              <Leader label="Rentabilidade" value={`${metrics.resultPct >= 0 ? "+" : ""}${num(metrics.resultPct, 2)}%`} tone={metrics.resultPct >= 0 ? "green" : "red"} />
              <Leader label="Rendimentos no mês" value={brl(metrics.incomeMonth)} tone="green" />
              <Leader label="Rendimentos no ano" value={brl(metrics.incomeYear)} tone="green" />
            </Paper>
          </Reveal>

          <Reveal delay={50}>
            <p className="font-display text-[12px] tracking-[0.14em] mb-2 px-1">DISTRIBUIÇÃO DA CARTEIRA</p>
            <Paper className="p-4 flex items-center gap-4">
              <Donut
                slices={[...metrics.byType.entries()].map(([label, value], i) => ({ label, value, color: ["#1e7a4f", "#3f6fb5", "#a96f08", "#7c4dab", "#0e8a8a", "#cc3d24", "#b0562e"][i % 7] }))}
                centerTop={brl0(metrics.current)}
                centerBottom="carteira"
                size={150}
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                {[...metrics.byType.entries()].sort((a, b) => b[1] - a[1]).map(([label, v], i) => (
                  <div key={label} className="flex items-center gap-2 text-[12px]">
                    <Dot color={["#1e7a4f", "#3f6fb5", "#a96f08", "#7c4dab", "#0e8a8a", "#cc3d24", "#b0562e"][i % 7]} size={8} />
                    <span className="truncate font-semibold flex-1">{label}</span>
                    <span className="font-mono font-bold">{pct((v / Math.max(1, metrics.current)) * 100)}</span>
                  </div>
                ))}
              </div>
            </Paper>
          </Reveal>

          <Reveal delay={70}>
            <p className="font-display text-[12px] tracking-[0.14em] mt-5 mb-2 px-1">APORTES MENSAIS</p>
            <Paper className="px-4 pt-5 pb-2">
              <MiniBars
                values={metrics.contributions.map((c) => c.value)}
                labels={metrics.contributions.map((c) => monthShort(c.key))}
                color="var(--green)"
                format={(v) => brl0(v)}
              />
            </Paper>
            <Paper className="px-5 py-3.5 mt-2.5 flex items-center gap-3">
              <span className="text-[var(--green)]">{I.spark({ size: 18 })}</span>
              <p className="text-[12.5px] text-[var(--ink-soft)] leading-relaxed">
                Você investiu <strong style={{ color: "var(--ink)" }}>{pct(metrics.investRate, 1)}</strong> da sua renda este mês ({brl(metrics.investedThisMonth)} de {brl(totals.income)}).
              </p>
            </Paper>
          </Reveal>
        </div>
      )}

      {/* --------------------------- ALERTAS --------------------------- */}
      {tab === "alertas" && (
        <div className="anim-fade">
          <Reveal>
            <p className="font-display text-[12px] tracking-[0.14em] mb-2 px-1">ORÇAMENTOS DO MÊS</p>
            <div className="grid gap-2.5">
              {allBudgetStatus(state).map((b) => (
                <Paper key={b.budget.categoryId} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[13.5px] flex items-center gap-2">
                      <Dot color={b.category?.color ?? "#888"} /> {b.category?.name}
                    </span>
                    <SevBadge sev={b.severity} small />
                  </div>
                  <Bar pct={b.used} tone={b.severity === "NORMAL" ? "green" : b.severity === "ATTENTION" ? "amber" : "red"} />
                  <p className="font-mono text-[10.5px] text-[var(--ink-soft)] mt-1.5">
                    {brl(b.spent)} de {brl0(b.budget.limit)} · {pct(b.used)}
                  </p>
                </Paper>
              ))}
            </div>
          </Reveal>

          <Reveal delay={60}>
            <p className="font-display text-[12px] tracking-[0.14em] mt-6 mb-2 px-1">INSIGHTS GERADOS</p>
            {insights.length === 0 && <EmptyState icon={I.info({ size: 22 })} title="Sem insights ainda" hint="Continue registrando seus gastos para gerar análises automáticas." />}
            <div className="grid gap-2.5">
              {insights.map((i) => (
                <div key={i.id} className="notch paper-card px-5 py-3.5 flex items-start gap-3">
                  <span
                    className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: sevRank[i.severity] >= 2 ? "var(--red-soft)" : sevRank[i.severity] === 1 ? "var(--amber-soft)" : "var(--green-soft)",
                      color: sevRank[i.severity] >= 2 ? "var(--red)" : sevRank[i.severity] === 1 ? "var(--amber)" : "var(--green)",
                    }}
                  >
                    {i.kind === "positive" ? I.up({ size: 15 }) : i.kind === "info" ? I.info({ size: 15 }) : I.alert({ size: 15 })}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display text-[13px]">{i.title}</p>
                      <SevBadge sev={i.severity} small />
                    </div>
                    <p className="text-[12.5px] text-[var(--ink-soft)] leading-relaxed mt-0.5">{i.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      )}
    </div>
  );
}
