import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import type { CalEvent } from "../lib/engine";
import { allBudgetStatus, eventsForMonth } from "../lib/engine";
import { addMonthsKey, brl, brl0, currentMonthKey, daysInMonthKey, monthLabelFull, todayISO, uid } from "../lib/format";
import { Bar, Chip, Confirm, Dot, Field, I, Paper, Reveal, SectionHead, Seg, SevBadge, Sheet } from "../components/ui";

/* ------------------------------ PLANNING ------------------------------ */

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function Planning({ onClose }: { onClose: () => void }) {
  const { state, deleteRecurring, addRecurring, toast } = useStore();
  const [tab, setTab] = useState<"cal" | "rec">("cal");
  const [month, setMonth] = useState(currentMonthKey());
  const [selDay, setSelDay] = useState<number | null>(Number(todayISO().slice(8, 10)));
  const [filter, setFilter] = useState<"todas" | "pagar" | "receber">("todas");
  const [form, setForm] = useState(false);

  // recurring form
  const [rName, setRName] = useState("");
  const [rVal, setRVal] = useState("0.00");
  const [rDay, setRDay] = useState("10");
  const [rKind, setRKind] = useState<"expense" | "income">("expense");
  const [rCat, setRCat] = useState("");
  const [rAcc, setRAcc] = useState(state.accounts[0]?.id ?? "");

  const events = useMemo(() => eventsForMonth(state, month), [state, month]);
  const todayKey = todayISO();
  const isCurrentMonth = month === currentMonthKey();
  const days = daysInMonthKey(month);
  const firstDow = new Date(`${month}-01T12:00:00`).getDay();

  const dayEvents = (d: number): CalEvent[] => {
    const list = events.get(d) ?? [];
    if (filter === "pagar") return list.filter((e) => e.kind === "conta" || e.kind === "cartao");
    if (filter === "receber") return list.filter((e) => e.kind === "receber");
    return list;
  };

  return (
    <div className="absolute inset-0 z-30 paper-bg flex flex-col">
      <header className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={onClose} className="pressable w-9 h-9 rounded-full paper-card flex items-center justify-center text-[var(--ink-soft)]" aria-label="Voltar">
          {I.chevL({ size: 17 })}
        </button>
        <div>
          <h1 className="font-display text-[18px] leading-tight">Planejamento</h1>
          <p className="text-[11.5px] text-[var(--ink-soft)]">Contas futuras e recorrências</p>
        </div>
      </header>

      <div className="px-4">
        <Seg
          options={[
            { v: "cal" as const, label: <span className="flex items-center gap-1.5">{I.cal({ size: 14 })} Calendário</span> },
            { v: "rec" as const, label: <span className="flex items-center gap-1.5">{I.repeat({ size: 14 })} Recorrências</span> },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="flex-1 overflow-y-auto app-scroll px-4 pb-10">
        {tab === "cal" ? (
          <>
            <div className="flex items-center justify-between px-1 mb-2">
              <button onClick={() => setMonth(addMonthsKey(month, -1))} className="pressable w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--paper-2)]" aria-label="Mês anterior">{I.chevL({ size: 16 })}</button>
              <p className="font-display text-[14px]">{monthLabelFull(month)}</p>
              <button onClick={() => setMonth(addMonthsKey(month, 1))} className="pressable w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--paper-2)]" aria-label="Próximo mês">{I.chevR({ size: 16 })}</button>
            </div>

            <div className="flex gap-2 mb-3 px-1">
              <Chip on={filter === "todas"} onClick={() => setFilter("todas")}>Todas</Chip>
              <Chip on={filter === "pagar"} onClick={() => setFilter("pagar")}>A pagar</Chip>
              <Chip on={filter === "receber"} onClick={() => setFilter("receber")}>A receber</Chip>
            </div>

            <Paper className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d, i) => (
                  <span key={i} className="text-center font-mono text-[9.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)] py-1">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstDow }).map((_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: days }).map((_, i) => {
                  const d = i + 1;
                  const evs = dayEvents(d);
                  const isToday = isCurrentMonth && d === Number(todayKey.slice(8, 10));
                  const sel = selDay === d;
                  const hasPay = evs.some((e) => e.kind === "conta" || e.kind === "cartao");
                  const hasRecv = evs.some((e) => e.kind === "receber");
                  const hasPosted = evs.some((e) => e.kind === "lancado");
                  return (
                    <button
                      key={d}
                      onClick={() => setSelDay(d)}
                      className="relative h-11 rounded-[10px] flex flex-col items-center justify-center transition-all"
                      style={{
                        background: sel ? "var(--ink)" : "transparent",
                        color: sel ? "var(--paper)" : isToday ? "var(--ink)" : "var(--ink-soft)",
                        border: isToday && !sel ? "1.5px dashed var(--line-strong)" : "1.5px solid transparent",
                      }}
                    >
                      <span className="font-mono text-[12.5px] font-bold leading-none">{d}</span>
                      <span className="flex gap-[3px] mt-1 h-[5px]">
                        {hasPay && <span className="w-[5px] h-[5px] rounded-full" style={{ background: sel ? "var(--paper)" : "var(--red)" }} />}
                        {hasRecv && <span className="w-[5px] h-[5px] rounded-full" style={{ background: sel ? "var(--paper)" : "var(--green)" }} />}
                        {hasPosted && !hasPay && !hasRecv && <span className="w-[5px] h-[5px] rounded-full" style={{ background: sel ? "var(--paper)" : "var(--line-strong)" }} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Paper>

            {selDay !== null && (
              <div className="mt-4">
                <SectionHead title={`EVENTOS · ${String(selDay).padStart(2, "0")}`} />
                {dayEvents(selDay).length === 0 ? (
                  <Paper className="px-5 py-4 text-center text-[13px] text-[var(--ink-soft)]">Nenhum evento neste dia.</Paper>
                ) : (
                  <div className="grid gap-2">
                    {dayEvents(selDay).map((e) => (
                      <Paper key={e.id} className="px-4 py-3 flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                          style={{
                            background: e.kind === "receber" ? "var(--green-soft)" : e.kind === "cartao" ? "var(--amber-soft)" : e.kind === "lancado" ? "var(--paper-2)" : "var(--red-soft)",
                            color: e.kind === "receber" ? "var(--green)" : e.kind === "cartao" ? "var(--amber)" : e.kind === "lancado" ? "var(--ink-soft)" : "var(--red)",
                          }}
                        >
                          {e.kind === "receber" ? I.up({ size: 15 }) : e.kind === "cartao" ? I.card({ size: 15 }) : e.kind === "lancado" ? I.check({ size: 15 }) : I.down({ size: 15 })}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[13px] truncate">{e.name}</p>
                          <p className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                            {e.kind === "receber" ? "entrada prevista" : e.kind === "cartao" ? "vencimento fatura" : e.kind === "lancado" ? "já lançado" : "conta prevista"}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-[13px]" style={{ color: e.amount >= 0 && e.kind !== "lancado" ? "var(--green)" : e.amount < 0 ? "var(--red)" : "var(--ink)" }}>
                          {e.kind === "receber" ? "+" : e.amount < 0 ? "−" : ""}{brl(Math.abs(e.amount))}
                        </span>
                      </Paper>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12.5px] text-[var(--ink-soft)]">Contas e entradas que se repetem todo mês.</p>
            </div>
            <div className="grid gap-2.5">
              {state.recurring.map((r) => (
                <Paper key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: r.kind === "income" ? "var(--green-soft)" : "var(--paper-2)", color: r.kind === "income" ? "var(--green)" : "var(--ink-soft)" }}>
                    {r.kind === "income" ? I.up({ size: 16 }) : I.repeat({ size: 16 })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13.5px] truncate">{r.name}</p>
                    <p className="text-[11.5px] text-[var(--ink-soft)]">Todo dia {r.day} · {state.categories.find((c) => c.id === r.categoryId)?.name ?? "—"}</p>
                  </div>
                  <span className="font-mono font-bold text-[13px]" style={{ color: r.kind === "income" ? "var(--green)" : "var(--ink)" }}>
                    {r.kind === "income" ? "+" : ""}{brl(r.amount)}
                  </span>
                  <button onClick={() => { deleteRecurring(r.id); toast("Recorrência removida.", "red"); }} className="pressable p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--red)]" aria-label="Remover">
                    {I.trash({ size: 15 })}
                  </button>
                </Paper>
              ))}
            </div>
            <button className="btn btn-ink w-full !py-3.5 mt-4" onClick={() => setForm(true)}>
              {I.plus({ size: 15 })} Nova recorrência
            </button>
          </>
        )}
      </div>

      {/* New recurring */}
      <Sheet open={form} onClose={() => setForm(false)} title="Nova recorrência" tall>
        <Field label="Nome">
          <input className="field" placeholder="Ex.: Aluguel, Netflix, Salário…" value={rName} onChange={(e) => setRName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Valor (R$)">
            <div className="field flex items-center gap-1.5 !py-[9px]">
              <input inputMode="numeric" className="flex-1 bg-transparent outline-none font-mono font-bold text-[14px] min-w-0" style={{ color: "var(--ink)" }} value={rVal === "0.00" ? "" : Number(rVal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} placeholder="0,00" onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 11); setRVal((Number(d || "0") / 100).toFixed(2)); }} />
            </div>
          </Field>
          <Field label="Dia do mês">
            <input type="number" min={1} max={31} className="field" value={rDay} onChange={(e) => setRDay(e.target.value)} />
          </Field>
        </div>
        <Field label="Tipo">
          <Seg
            options={[{ v: "expense" as const, label: "Conta / despesa" }, { v: "income" as const, label: "Entrada" }]}
            value={rKind}
            onChange={setRKind}
          />
        </Field>
        <Field label="Categoria">
          <select className="field" value={rCat} onChange={(e) => setRCat(e.target.value)}>
            <option value="">Sem categoria</option>
            {state.categories.filter((c) => c.kind === (rKind === "income" ? "income" : "expense")).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Conta">
          <select className="field" value={rAcc} onChange={(e) => setRAcc(e.target.value)}>
            {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <button
          className="btn btn-ink w-full !py-3.5 mt-1"
          onClick={() => {
            if (!rName.trim()) return toast("Informe o nome da recorrência.", "red");
            if (Number(rVal) <= 0) return toast("O valor deve ser maior que zero.", "red");
            addRecurring({ id: uid(), name: rName.trim(), amount: Number(rVal), day: Math.min(31, Math.max(1, Number(rDay) || 1)), kind: rKind, categoryId: rCat || undefined, accountId: rAcc });
            toast("Recorrência criada — ela aparecerá no calendário.", "green");
            setForm(false);
            setRName(""); setRVal("0.00");
          }}
        >
          Criar recorrência
        </button>
      </Sheet>
    </div>
  );
}

/* ------------------------------- BUDGETS ------------------------------ */

export function BudgetsOverlay({ onClose }: { onClose: () => void }) {
  const { state, saveBudget, toast } = useStore();
  const statuses = allBudgetStatus(state);
  const [editCat, setEditCat] = useState<string | null>(null);
  const [limit, setLimit] = useState("0.00");
  const [threshold, setThreshold] = useState(75);
  const [newCat, setNewCat] = useState("");

  const budgetedIds = state.budgets.map((b) => b.categoryId);
  const unbudgeted = state.categories.filter((c) => c.kind === "expense" && c.enabled && !budgetedIds.includes(c.id));

  const startEdit = (catId: string) => {
    const b = state.budgets.find((x) => x.categoryId === catId);
    setLimit((b?.limit ?? 0).toFixed(2));
    setThreshold(b?.threshold ?? 75);
    setEditCat(catId);
  };

  return (
    <div className="absolute inset-0 z-30 paper-bg flex flex-col">
      <header className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={onClose} className="pressable w-9 h-9 rounded-full paper-card flex items-center justify-center text-[var(--ink-soft)]" aria-label="Voltar">{I.chevL({ size: 17 })}</button>
        <div>
          <h1 className="font-display text-[18px] leading-tight">Orçamentos</h1>
          <p className="text-[11.5px] text-[var(--ink-soft)]">Limites mensais por categoria</p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto app-scroll px-4 pb-10">
        <div className="grid gap-2.5">
          {statuses.map((s) => (
            <Paper key={s.budget.categoryId} className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[13.5px] flex items-center gap-2">
                  <Dot color={s.category?.color ?? "#888"} /> {s.category?.name}
                </span>
                <SevBadge sev={s.severity} small />
              </div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-mono text-[12px] font-bold">{brl(s.spent)}</span>
                <span className="font-mono text-[11px] text-[var(--ink-soft)]">de {brl0(s.budget.limit)} · alerta em {s.budget.threshold}%</span>
              </div>
              <Bar pct={s.used} tone={s.severity === "NORMAL" ? "green" : s.severity === "ATTENTION" ? "amber" : "red"} />
              <button onClick={() => startEdit(s.budget.categoryId)} className="mt-2 text-[11.5px] font-bold text-[var(--ink-soft)] hover:text-[var(--ink)] flex items-center gap-1">
                {I.edit({ size: 12 })} Editar limite
              </button>
            </Paper>
          ))}
        </div>

        {unbudgeted.length > 0 && (
          <Paper className="px-4 py-3.5 mt-4">
            <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)] mb-2">Criar orçamento para</p>
            <div className="flex gap-2">
              <select className="field" value={newCat} onChange={(e) => setNewCat(e.target.value)}>
                <option value="">Selecione a categoria…</option>
                {unbudgeted.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                className="btn btn-ink !px-4"
                onClick={() => {
                  if (!newCat) return toast("Selecione uma categoria.", "red");
                  startEdit(newCat);
                }}
              >
                {I.plus({ size: 15 })}
              </button>
            </div>
          </Paper>
        )}
      </div>

      <Sheet open={Boolean(editCat)} onClose={() => setEditCat(null)} title="Editar orçamento">
        {editCat && (
          <div>
            <p className="text-[13px] text-[var(--ink-soft)] mb-3">
              Categoria: <strong style={{ color: "var(--ink)" }}>{state.categories.find((c) => c.id === editCat)?.name}</strong>
            </p>
            <Field label="Limite mensal (R$)">
              <div className="field flex items-center gap-1.5">
                <span className="font-mono text-[12px] font-bold text-[var(--ink-faint)]">R$</span>
                <input inputMode="numeric" className="flex-1 bg-transparent outline-none font-mono font-bold text-[16px] min-w-0" style={{ color: "var(--ink)" }} value={limit === "0.00" ? "" : Number(limit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} placeholder="0,00" onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 11); setLimit((Number(d || "0") / 100).toFixed(2)); }} />
              </div>
            </Field>
            <Field label={`Alertar ao atingir ${threshold}%`} hint="Você recebe um aviso quando o gasto passar desse ponto.">
              <input type="range" min={50} max={95} step={5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full accent-[var(--ink)]" />
            </Field>
            <button
              className="btn btn-ink w-full !py-3.5 mt-1"
              onClick={() => {
                if (Number(limit) <= 0) return toast("O valor deve ser maior que zero.", "red");
                saveBudget({ categoryId: editCat, limit: Number(limit), threshold, enabled: true });
                toast("Orçamento salvo.", "green");
                setEditCat(null);
                setNewCat("");
              }}
            >
              Salvar orçamento
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* ------------------------------- SETTINGS ------------------------------ */

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { state, setName, setTheme, setNotif, addCategory, toggleCategory, exportData, resetAll, toast } = useStore();
  const [name, setNameLocal] = useState(state.settings.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [catForm, setCatForm] = useState(false);
  const [ncName, setNcName] = useState("");
  const [ncKind, setNcKind] = useState<"expense" | "income">("expense");
  const [ncSubs, setNcSubs] = useState("");

  const Toggle = ({ v, onChange }: { v: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => { onChange(!v); toast("Preferência salva.", "green"); }}
      className="w-11 h-[26px] rounded-full p-[3px] transition-colors duration-200 shrink-0"
      style={{ background: v ? "var(--green)" : "var(--line-strong)" }}
      aria-pressed={v}
    >
      <span className="block w-5 h-5 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: v ? "translateX(18px)" : "translateX(0)" }} />
    </button>
  );

  const Row = ({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children?: React.ReactNode }) => (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--line)" }}>
      <span className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: "var(--paper-2)", color: "var(--ink-soft)" }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[13.5px]">{title}</p>
        {hint && <p className="text-[11.5px] text-[var(--ink-soft)]">{hint}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="absolute inset-0 z-30 paper-bg flex flex-col">
      <header className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={onClose} className="pressable w-9 h-9 rounded-full paper-card flex items-center justify-center text-[var(--ink-soft)]" aria-label="Voltar">{I.chevL({ size: 17 })}</button>
        <h1 className="font-display text-[18px]">Configurações</h1>
      </header>
      <div className="flex-1 overflow-y-auto app-scroll px-4 pb-12">
        {/* Perfil */}
        <Reveal><SectionHead title="PERFIL" /></Reveal>
        <Paper className="px-4 py-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-12 h-12 rounded-full flex items-center justify-center font-display text-[16px]" style={{ background: "var(--ink)", color: "var(--paper)" }}>
              {state.settings.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <input
                className="field !py-2 !font-semibold"
                value={name}
                onChange={(e) => setNameLocal(e.target.value)}
                placeholder="Seu nome"
              />
              <p className="text-[11px] text-[var(--ink-faint)] mt-1">{state.settings.email}</p>
            </div>
          </div>
          <button
            className="btn btn-ghost !py-2.5 text-[12.5px] w-full"
            onClick={() => {
              if (!name.trim()) return toast("Informe um nome válido.", "red");
              setName(name.trim());
              toast("Perfil atualizado.", "green");
            }}
          >
            Salvar nome
          </button>
        </Paper>

        {/* Aparência */}
        <Reveal><SectionHead title="APARÊNCIA" /></Reveal>
        <Paper className="px-4 py-3.5 mb-6">
          <p className="font-semibold text-[13.5px] mb-2.5 flex items-center gap-2">{I.sun({ size: 15 })} Tema do aplicativo</p>
          <Seg
            options={[
              { v: "light" as const, label: "Claro" },
              { v: "dark" as const, label: "Escuro" },
              { v: "system" as const, label: "Sistema" },
            ]}
            value={state.settings.theme}
            onChange={(t) => { setTheme(t); toast(t === "dark" ? "Tema escuro ativado." : t === "light" ? "Tema claro ativado." : "Seguindo o tema do sistema.", "green"); }}
          />
          <p className="text-[11.5px] text-[var(--ink-faint)]">O visual de cupom fiscal é preservado nos dois temas.</p>
        </Paper>

        {/* Categorias */}
        <Reveal><SectionHead title="CATEGORIAS" action="Nova" onAction={() => setCatForm(true)} /></Reveal>
        <Paper className="divide-y mb-6 overflow-hidden">
          {state.categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderColor: "var(--line)", opacity: c.enabled ? 1 : 0.5 }}>
              <Dot color={c.color} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px]">{c.name} <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-faint)] ml-1">{c.kind === "income" ? "entrada" : "gasto"}</span></p>
                {c.subs.length > 0 && <p className="text-[10.5px] text-[var(--ink-faint)] truncate">{c.subs.join(" · ")}</p>}
              </div>
              <Toggle v={c.enabled} onChange={() => toggleCategory(c.id)} />
            </div>
          ))}
        </Paper>

        {/* Notificações */}
        <Reveal><SectionHead title="NOTIFICAÇÕES" /></Reveal>
        <Paper className="divide-y mb-6">
          <Row icon={I.bell({ size: 15 })} title="Contas próximas" hint="Avisar quando uma conta vencer em até 3 dias">
            <Toggle v={state.settings.notif.upcomingBills} onChange={(v) => setNotif({ upcomingBills: v })} />
          </Row>
          <Row icon={I.target({ size: 15 })} title="Limites de orçamento" hint="Alertar ao atingir o percentual definido">
            <Toggle v={state.settings.notif.budgets} onChange={(v) => setNotif({ budgets: v })} />
          </Row>
          <Row icon={I.card({ size: 15 })} title="Vencimento do cartão" hint="Seu cartão vence em 3 dias">
            <Toggle v={state.settings.notif.cardDue} onChange={(v) => setNotif({ cardDue: v })} />
          </Row>
          <Row icon={I.invest({ size: 15 })} title="Lembretes de aporte" hint="Lembrar de investir no início do mês">
            <Toggle v={state.settings.notif.investments} onChange={(v) => setNotif({ investments: v })} />
          </Row>
        </Paper>

        {/* Dados e privacidade */}
        <Reveal><SectionHead title="DADOS E PRIVACIDADE" /></Reveal>
        <div className="grid gap-2.5 mb-6">
          <button className="paper-card px-4 py-3.5 flex items-center gap-3 text-left pressable" onClick={() => { exportData(); toast("Exportação iniciada — arquivo JSON gerado.", "green"); }}>
            <span className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: "var(--green-soft)", color: "var(--green)" }}>{I.download({ size: 15 })}</span>
            <span className="flex-1">
              <span className="block font-semibold text-[13.5px]">Exportar meus dados</span>
              <span className="block text-[11.5px] text-[var(--ink-soft)]">Baixe tudo em formato JSON (LGPD)</span>
            </span>
          </button>
          <button className="paper-card px-4 py-3.5 flex items-center gap-3 text-left pressable" onClick={() => setConfirmReset(true)}>
            <span className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: "var(--red-soft)", color: "var(--red)" }}>{I.trash({ size: 15 })}</span>
            <span className="flex-1">
              <span className="block font-semibold text-[13.5px]" style={{ color: "var(--red)" }}>Apagar dados do aplicativo</span>
              <span className="block text-[11.5px] text-[var(--ink-soft)]">Remove tudo deste dispositivo</span>
            </span>
          </button>
        </div>

        {/* Sobre */}
        <Reveal><SectionHead title="SOBRE" /></Reveal>
        <Paper className="px-5 py-5 text-center">
          <p className="font-display text-[15px] tracking-[0.2em]">CUPOM*</p>
          <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--ink-faint)] mt-1">VERSÃO 1.0.0 · DEMO LOCAL</p>
          <div className="rule-dashed my-4" />
          <p className="font-mono text-[10.5px] font-bold tracking-[0.14em] text-[var(--ink-soft)] leading-relaxed">
            REGISTRAR → ENTENDER<br />→ PLANEJAR → EVOLUIR
          </p>
          <p className="text-[11.5px] text-[var(--ink-faint)] leading-relaxed mt-3">
            Seus dados ficam salvos apenas neste dispositivo. O Cupom não é um banco e não acessa suas contas.
          </p>
        </Paper>
      </div>

      {/* New category */}
      <Sheet open={catForm} onClose={() => setCatForm(false)} title="Nova categoria">
        <Field label="Nome">
          <input className="field" placeholder="Ex.: Cuidados pessoais" value={ncName} onChange={(e) => setNcName(e.target.value)} />
        </Field>
        <Field label="Tipo">
          <Seg
            options={[{ v: "expense" as const, label: "Gasto" }, { v: "income" as const, label: "Entrada" }]}
            value={ncKind}
            onChange={setNcKind}
          />
        </Field>
        <Field label="Subcategorias (opcional)" hint="Separe com vírgulas. Ex.: Salão, Skincare">
          <input className="field" value={ncSubs} onChange={(e) => setNcSubs(e.target.value)} />
        </Field>
        <button
          className="btn btn-ink w-full !py-3.5 mt-1"
          onClick={() => {
            if (!ncName.trim()) return toast("Informe o nome da categoria.", "red");
            addCategory(ncName.trim(), ncKind, ncSubs.split(",").map((s) => s.trim()).filter(Boolean));
            toast("Categoria criada.", "green");
            setCatForm(false); setNcName(""); setNcSubs("");
          }}
        >
          Criar categoria
        </button>
      </Sheet>

      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Apagar todos os dados?"
        body="Lançamentos, contas, investimentos e preferências serão removidos deste dispositivo. A ação não pode ser desfeita."
        onConfirm={() => { resetAll(); setConfirmReset(false); toast("Dados apagados. Demonstração restaurada.", "red"); }}
      />
    </div>
  );
}


