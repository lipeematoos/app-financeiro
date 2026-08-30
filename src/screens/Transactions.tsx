import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import type { Tx } from "../lib/types";
import { addDaysISO, brl, dLabel, monthKey, todayISO, dFull } from "../lib/format";
import { Confirm, Dot, I, Paper, Sheet, EmptyState, Chip } from "../components/ui";

type Period = "hoje" | "semana" | "mes" | "30d" | "tudo";

const PERIODS: { v: Period; label: string }[] = [
  { v: "hoje", label: "Hoje" },
  { v: "semana", label: "Esta semana" },
  { v: "mes", label: "Este mês" },
  { v: "30d", label: "Últimos 30 dias" },
  { v: "tudo", label: "Tudo" },
];

const typeLabel: Record<Tx["type"], string> = {
  INCOME: "Entrada",
  EXPENSE: "Gasto",
  TRANSFER: "Transferência",
  INVESTMENT_TRANSFER: "Aporte",
};

export default function Transactions({ open }: { open: (o: string) => void }) {
  const { state, deleteTx, toast } = useStore();
  const [period, setPeriod] = useState<Period>("mes");
  const [cat, setCat] = useState<string>("todas");
  const [type, setType] = useState<string>("todos");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Tx | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const filtered = useMemo(() => {
    const today = todayISO();
    const cutoff = (days: number) => addDaysISO(today, -days);
    let list = [...state.transactions];
    if (period === "hoje") list = list.filter((t) => t.date === today);
    if (period === "semana") {
      const d = new Date();
      const dow = (d.getDay() + 6) % 7; // segunda = 0
      list = list.filter((t) => t.date >= addDaysISO(today, -dow));
    }
    if (period === "mes") list = list.filter((t) => monthKey(t.date) === monthKey(today));
    if (period === "30d") list = list.filter((t) => t.date >= cutoff(30));
    if (cat !== "todas") list = list.filter((t) => t.categoryId === cat);
    if (type !== "todos") list = list.filter((t) => t.type === type);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(s) ||
          (t.merchantName ?? "").toLowerCase().includes(s) ||
          (t.subcategory ?? "").toLowerCase().includes(s),
      );
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [state.transactions, period, cat, type, q]);

  const groups = useMemo(() => {
    const m = new Map<string, Tx[]>();
    for (const t of filtered) {
      const list = m.get(t.date) ?? [];
      list.push(t);
      m.set(t.date, list);
    }
    return [...m.entries()];
  }, [filtered]);

  const spent = filtered.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const received = filtered.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expenseCats = state.categories.filter((c) => c.kind === "expense" && c.enabled);
  const accName = (id?: string) => state.accounts.find((a) => a.id === id)?.name;
  const cardName = (id?: string) => state.cards.find((c) => c.id === id)?.name;

  return (
    <div className="px-4 pb-8">
      <header className="pt-5 pb-3 px-1 flex items-end justify-between">
        <div>
          <h1 className="font-display text-[21px]">Movimentações</h1>
          <p className="text-[12px] text-[var(--ink-soft)] mt-0.5">
            {filtered.length} lançamentos · <span style={{ color: "var(--red)" }}>{brl(spent)}</span> em saídas
          </p>
        </div>
        <button onClick={() => open("quickadd")} className="btn btn-ink !py-2.5 !px-3.5 text-[13px]">
          {I.plus({ size: 15 })} Novo
        </button>
      </header>

      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]">{I.search({ size: 16 })}</span>
        <input
          className="field !pl-10"
          placeholder="Buscar por descrição ou estabelecimento…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Period chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        {PERIODS.map((p) => (
          <Chip key={p.v} on={period === p.v} onClick={() => setPeriod(p.v)}>
            {p.label}
          </Chip>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-2">
        <Chip on={cat === "todas"} onClick={() => setCat("todas")}>Todas categorias</Chip>
        {expenseCats.slice(0, 10).map((c) => (
          <Chip key={c.id} on={cat === c.id} onClick={() => setCat(cat === c.id ? "todas" : c.id)}>
            <Dot color={c.color} size={7} /> {c.name}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2 items-center mt-1 mb-4">
        <select className="field !w-auto !py-2 !text-[12.5px] !font-semibold" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          <option value="EXPENSE">Gastos</option>
          <option value="INCOME">Entradas</option>
          <option value="TRANSFER">Transferências</option>
          <option value="INVESTMENT_TRANSFER">Aportes</option>
        </select>
        <p className="text-[11.5px] text-[var(--ink-faint)] font-mono">
          +{brl(received).slice(3)} recebidos
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={I.receipt({ size: 22 })}
          title="Nada por aqui"
          hint="Seu primeiro lançamento aparecerá aqui. Registre um gasto em poucos segundos."
          action="Registrar gasto"
          onAction={() => open("expense")}
        />
      ) : (
        groups.map(([date, txs]) => (
          <div key={date} className="mb-5">
            <div className="flex items-baseline justify-between px-1 mb-1.5">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">{dLabel(date)}</span>
              <span className="font-mono text-[11px] font-bold text-[var(--ink-soft)]">
                {brl(txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0))}
              </span>
            </div>
            <Paper className="divide-y overflow-hidden" >
              {txs.map((t) => {
                const c = state.categories.find((x) => x.id === t.categoryId);
                const isIn = t.type === "INCOME";
                return (
                  <button key={t.id} onClick={() => setSel(t)} className="w-full flex items-center gap-3 px-4 py-3 text-left pressable hover:bg-[var(--paper-2)]" style={{ borderColor: "var(--line)" }}>
                    <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "var(--paper-2)", color: isIn ? "var(--green)" : t.type === "EXPENSE" ? "var(--ink-soft)" : "var(--ink-faint)" }}>
                      {t.type === "EXPENSE" ? I.down({ size: 16 }) : t.type === "INCOME" ? I.up({ size: 16 }) : t.type === "TRANSFER" ? I.transfer({ size: 16 }) : I.invest({ size: 16 })}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-[13.5px] truncate">{t.merchantName ?? t.description}</span>
                      <span className="block text-[11.5px] text-[var(--ink-soft)] truncate">
                        {typeLabel[t.type]}
                        {c ? ` · ${c.name}` : ""}
                        {t.subcategory ? ` > ${t.subcategory}` : ""}
                        {t.installment ? ` · ${t.installment}` : ""}
                        {t.sourceType === "RECEIPT_OCR" ? " · comprovante" : ""}
                      </span>
                    </span>
                    <span className="font-mono font-bold text-[13.5px]" style={{ color: isIn ? "var(--green)" : "var(--ink)" }}>
                      {isIn ? "+" : t.type === "EXPENSE" ? "−" : ""}{brl(t.amount)}
                    </span>
                  </button>
                );
              })}
            </Paper>
          </div>
        ))
      )}

      {/* Detail sheet */}
      <Sheet open={Boolean(sel)} onClose={() => setSel(null)} title="Detalhes do lançamento">
        {sel && (
          <div>
            <div className="paper-card !bg-[var(--paper-2)] px-4 py-4 text-center mb-4">
              <p className="font-mono text-[26px] font-extrabold" style={{ color: sel.type === "INCOME" ? "var(--green)" : "var(--ink)" }}>
                {sel.type === "INCOME" ? "+" : ""}{brl(sel.amount)}
              </p>
              <p className="text-[13px] font-semibold mt-1">{sel.merchantName ?? sel.description}</p>
            </div>
            {[
              ["Tipo", typeLabel[sel.type]],
              ["Data", dFull(sel.date)],
              ["Descrição", sel.description],
              sel.subcategory ? ["Subcategoria", sel.subcategory] : null,
              sel.accountId ? ["Conta", accName(sel.accountId) ?? "—"] : null,
              sel.cardId ? ["Cartão", `${cardName(sel.cardId)} (fatura)`] : null,
              sel.merchantName ? ["Estabelecimento", sel.merchantName] : null,
              sel.installment ? ["Parcela", sel.installment] : null,
              ["Origem", sel.sourceType === "RECEIPT_OCR" ? "Comprovante escaneado" : sel.sourceType === "RECURRING" ? "Recorrente" : sel.sourceType === "SYSTEM" ? "Sistema" : "Manual"],
              sel.notes ? ["Observação", sel.notes] : null,
            ]
              .filter(Boolean)
              .map((row, i) => (
                <div key={i} className="leader py-[5px]">
                  <span className="lbl">{(row as string[])[0]}</span>
                  <span className="dots" />
                  <span className="val !text-[12.5px] !font-semibold text-right" style={{ whiteSpace: "normal" }}>{(row as string[])[1]}</span>
                </div>
              ))}
            <div className="rule-dashed my-4" />
            <button
              className="btn w-full !py-3 text-[13.5px]"
              style={{ background: "var(--red-soft)", color: "var(--red)" }}
              onClick={() => setConfirmDel(true)}
            >
              {I.trash({ size: 15 })} Excluir lançamento
            </button>
            <p className="text-[11px] text-[var(--ink-faint)] text-center mt-3 font-mono tracking-wide">ID {sel.id.toUpperCase()}</p>
          </div>
        )}
      </Sheet>

      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Excluir lançamento?"
        body="Essa ação remove o lançamento do seu histórico e dos relatórios. Não é possível desfazer."
        onConfirm={() => {
          if (sel) deleteTx(sel.id);
          setConfirmDel(false);
          setSel(null);
          toast("Lançamento excluído.", "red");
        }}
      />
    </div>
  );
}
