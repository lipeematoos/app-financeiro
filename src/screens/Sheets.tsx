import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { accountBalance } from "../lib/engine";
import { brl, dFull, todayISO } from "../lib/format";
import { Dot, Field, I, MoneyInput, Paper, Sheet } from "../components/ui";

export type SheetKind = null | "quickadd" | "expense" | "income" | "transfer" | "scanner";

/* ------------------------------ QUICK ADD ------------------------------ */

export function QuickAddSheet({ open, onClose, go }: { open: boolean; onClose: () => void; go: (s: SheetKind) => void }) {
  const items = [
    { k: "expense" as const, icon: I.down, title: "Registrar gasto", hint: "Rápido, em poucos toques" },
    { k: "income" as const, icon: I.up, title: "Registrar entrada", hint: "Salário, freelance, venda…" },
    { k: "transfer" as const, icon: I.transfer, title: "Transferir", hint: "Entre contas ou para dinheiro" },
    { k: "scanner" as const, icon: I.scan, title: "Escanear comprovante", hint: "A câmera preenche para você" },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Novo lançamento">
      <div className="grid gap-2.5 pb-2">
        {items.map((it, idx) => (
          <button
            key={it.k}
            onClick={() => go(it.k)}
            className="paper-card px-4 py-4 flex items-center gap-4 text-left pressable hover:bg-[var(--paper-2)] anim-rise"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <span className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: "var(--ink)", color: "var(--paper)" }}>
              {it.icon({ size: 19 })}
            </span>
            <span className="flex-1">
              <span className="block font-display text-[14px]">{it.title}</span>
              <span className="block text-[12px] text-[var(--ink-soft)] mt-0.5">{it.hint}</span>
            </span>
            <span className="text-[var(--ink-faint)]">{I.chevR({ size: 16 })}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------------ EXPENSE ------------------------------ */

export function ExpenseSheet({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: { description?: string; amount?: string; merchant?: string; categoryId?: string; subcategory?: string; date?: string; sourceType?: "RECEIPT_OCR" | "MANUAL" } }) {
  const { state, addExpense, pushRecent, toast } = useStore();
  const [val, setVal] = useState("0.00");
  const [catId, setCatId] = useState("");
  const [sub, setSub] = useState("");
  const [desc, setDesc] = useState("");
  const [where, setWhere] = useState<string>(state.accounts[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setVal(preset?.amount ?? "0.00");
      setDesc(preset?.description ?? "");
      setCatId(preset?.categoryId ?? state.settings.recents[0] ?? "");
      setSub(preset?.subcategory ?? "");
      setWhere(state.accounts[0]?.id ?? "");
      setDate(preset?.date ?? todayISO());
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const expenseCats = state.categories.filter((c) => c.kind === "expense" && c.enabled);
  const recents = state.settings.recents.map((id) => expenseCats.find((c) => c.id === id)).filter(Boolean);
  const others = expenseCats.filter((c) => !state.settings.recents.includes(c.id));
  const selCat = expenseCats.find((c) => c.id === catId);

  const save = () => {
    const v = Number(val);
    if (v <= 0) return toast("O valor deve ser maior que zero.", "red");
    if (!catId) return toast("Selecione uma categoria.", "red");
    const isCard = where.startsWith("card:");
    addExpense({
      amount: v,
      date,
      description: desc.trim() || selCat?.name || "Gasto",
      categoryId: catId,
      subcategory: sub || undefined,
      accountId: isCard ? undefined : where,
      cardId: isCard ? where.slice(5) : undefined,
      merchantName: preset?.merchant,
      sourceType: preset?.sourceType ?? "MANUAL",
      notes: notes.trim() || undefined,
    });
    pushRecent(catId);
    toast(`Gasto de ${brl(v)} salvo.`, "green");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Registrar gasto" tall>
      <MoneyInput value={val} onChange={setVal} autoFocus={!preset?.amount} />
      {recents.length > 0 && (
        <>
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)] mb-1.5">Recentes</p>
          <div className="flex gap-2 flex-wrap mb-2.5">
            {recents.map((c) => c && (
              <button key={c.id} onClick={() => { setCatId(c.id); setSub(""); }} className="chip" style={catId === c.id ? { background: "var(--ink)", borderColor: "var(--ink)", color: "var(--paper)" } : undefined}>
                <Dot color={c.color} size={7} /> {c.name}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)] mb-1.5">Categoria</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {others.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCatId(c.id); setSub(""); }}
            className="rounded-[10px] border px-2 py-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all"
            style={catId === c.id ? { background: "var(--ink)", color: "var(--paper)", borderColor: "var(--ink)" } : { borderColor: "var(--line)", color: "var(--ink-soft)", background: "var(--paper)" }}
          >
            <Dot color={catId === c.id ? "var(--paper)" : c.color} size={6} />
            <span className="truncate">{c.name}</span>
          </button>
        ))}
      </div>
      {selCat && selCat.subs.length > 0 && (
        <Field label="Subcategoria (opcional)">
          <select className="field" value={sub} onChange={(e) => setSub(e.target.value)}>
            <option value="">Sem subcategoria</option>
            {selCat.subs.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      )}
      <Field label="Descrição">
        <input className="field" placeholder="Ex.: Mercado da semana" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <Field label="Conta ou cartão">
        <select className="field" value={where} onChange={(e) => setWhere(e.target.value)}>
          {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {brl(accountBalance(state, a.id))}</option>)}
          {state.cards.map((c) => <option key={c.id} value={`card:${c.id}`}>{c.name} (cartão)</option>)}
        </select>
      </Field>
      <Field label="Data">
        <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Observação (opcional)">
        <input className="field" placeholder="Algo para lembrar depois…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <button className="btn btn-ink w-full !py-3.5 mt-1" onClick={save}>
        Salvar gasto
      </button>
    </Sheet>
  );
}

/* ------------------------------- INCOME ------------------------------- */

export function IncomeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addIncome, toast } = useStore();
  const [val, setVal] = useState("0.00");
  const [origin, setOrigin] = useState("");
  const [catId, setCatId] = useState("salario");
  const [accId, setAccId] = useState(state.accounts[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (open) { setVal("0.00"); setOrigin(""); setCatId("salario"); setDate(todayISO()); }
  }, [open]);

  const incomeCats = state.categories.filter((c) => c.kind === "income");

  return (
    <Sheet open={open} onClose={onClose} title="Registrar entrada" tall>
      <MoneyInput value={val} onChange={setVal} autoFocus />
      <Field label="Origem">
        <input className="field" placeholder="Ex.: Salário de agosto" value={origin} onChange={(e) => setOrigin(e.target.value)} />
      </Field>
      <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)] mb-1.5">Categoria</p>
      <div className="flex gap-2 flex-wrap mb-4">
        {incomeCats.map((c) => (
          <button key={c.id} onClick={() => setCatId(c.id)} className="chip" style={catId === c.id ? { background: "var(--ink)", borderColor: "var(--ink)", color: "var(--paper)" } : undefined}>
            {c.name}
          </button>
        ))}
      </div>
      <Field label="Conta">
        <select className="field" value={accId} onChange={(e) => setAccId(e.target.value)}>
          {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Data">
        <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <button
        className="btn btn-green w-full !py-3.5 mt-1"
        onClick={() => {
          const v = Number(val);
          if (v <= 0) return toast("O valor deve ser maior que zero.", "red");
          addIncome({ amount: v, date, description: origin.trim() || incomeCats.find((c) => c.id === catId)?.name || "Entrada", categoryId: catId, accountId: accId });
          toast(`Entrada de ${brl(v)} salva.`, "green");
          onClose();
        }}
      >
        Salvar entrada
      </button>
    </Sheet>
  );
}

/* ------------------------------ TRANSFER ------------------------------ */

export function TransferSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addTransfer, toast } = useStore();
  const [val, setVal] = useState("0.00");
  const [from, setFrom] = useState(state.accounts[0]?.id ?? "");
  const [to, setTo] = useState(state.accounts[1]?.id ?? "");
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (open) { setVal("0.00"); setDate(todayISO()); }
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Transferir entre contas">
      <MoneyInput value={val} onChange={setVal} autoFocus />
      <Field label="De">
        <select className="field" value={from} onChange={(e) => setFrom(e.target.value)}>
          {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {brl(accountBalance(state, a.id))}</option>)}
        </select>
      </Field>
      <div className="flex justify-center -my-1.5">
        <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--paper-2)", border: "1px solid var(--line)", color: "var(--ink-soft)" }}>
          {I.down({ size: 15 })}
        </span>
      </div>
      <Field label="Para">
        <select className="field" value={to} onChange={(e) => setTo(e.target.value)}>
          {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Data">
        <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <button
        className="btn btn-ink w-full !py-3.5 mt-1"
        onClick={() => {
          const v = Number(val);
          if (v <= 0) return toast("O valor deve ser maior que zero.", "red");
          if (from === to) return toast("A conta de origem e a de destino devem ser diferentes.", "red");
          addTransfer(from, to, v, date);
          toast(`Transferência de ${brl(v)} registrada.`, "green");
          onClose();
        }}
      >
        Confirmar transferência
      </button>
      <p className="text-[11px] text-[var(--ink-faint)] text-center mt-3">Transferências não contam como gasto nem entrada.</p>
    </Sheet>
  );
}

/* ------------------------------- SCANNER ------------------------------ */

interface ScanTemplate {
  merchant: string;
  cnpj: string;
  total: number;
  payment: string;
  raw: string[];
}

const SCAN_TEMPLATES: ScanTemplate[] = [
  {
    merchant: "Supermercado Guanabara",
    cnpj: "33.462.512/0001-73",
    total: 87.5,
    payment: "Crédito à vista",
    raw: [
      "SUPERMERCADO GUANABARA LTDA",
      "CNPJ 33.462.512/0001-73 IE 82.112.444",
      "AV. BRASIL 1200 - CENTRO",
      "EXTRATO Nº 044.221 30/08/2026 18:42",
      "----------------------------------------",
      "ARROZ TIPO 1 5KG        1x  27,90",
      "FEIJAO CARIOCA 1KG      1x   8,49",
      "PEITO DE FRANGO KG    1,2x  19,79",
      "LEITE INTEGRAL 1L       2x  11,98",
      "PAO FRANCES KG        0,5x   8,95",
      "DETERGENTE NEUTRO       1x   2,89",
      "----------------------------------------",
      "TOTAL R$                87,50",
      "FORMA PAGTO: CREDITO A VISTA",
      "OBRIGADO PELA PREFERENCIA",
    ],
  },
  {
    merchant: "Farmácia Santa Marta",
    cnpj: "12.889.301/0001-02",
    total: 64.2,
    payment: "Débito",
    raw: [
      "FARMACIA SANTA MARTA LTDA",
      "CNPJ 12.889.301/0001-02",
      "RUA DAS FLORES 88 - JD. PAULISTA",
      "CUPOM 002.884 29/08/2026 11:15",
      "----------------------------------------",
      "DIPIRONA 500MG C/10     1x   6,90",
      "VITAMINA D 2.000UI      1x  32,40",
      "PROTETOR LABIAL         1x  12,90",
      "ALGODAO 100G            1x   5,20",
      "HIGIENIZADOR OCULAR     1x   6,80",
      "----------------------------------------",
      "TOTAL R$                64,20",
      "FORMA PAGTO: DEBITO",
      "FARMACEUTICO RESP: CRF 44.213",
    ],
  },
  {
    merchant: "Posto Ipiranga Central",
    cnpj: "45.112.908/0001-55",
    total: 150.0,
    payment: "Crédito à vista",
    raw: [
      "AUTO POSTO IPIRANGA CENTRAL",
      "CNPJ 45.112.908/0001-55",
      "ROD. ANHANGUERA KM 28",
      "COMPROVANTE 118.402 28/08/2026 19:03",
      "----------------------------------------",
      "GASOLINA COMUM L      24,15x 150,00",
      "----------------------------------------",
      "TOTAL R$               150,00",
      "FORMA PAGTO: CREDITO A VISTA",
      "ABASTECIMENTO: BOMBA 04",
      "VOLTE SEMPRE!",
    ],
  },
];

export function ScannerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, learnMerchant, suggestFor, addExpense, pushRecent, toast } = useStore();
  const [step, setStep] = useState<"capture" | "processing" | "confirm">("capture");
  const [tpl, setTpl] = useState<ScanTemplate | null>(null);
  const [procLine, setProcLine] = useState(0);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("0.00");
  const [date, setDate] = useState(todayISO());
  const [catId, setCatId] = useState("");
  const [sub, setSub] = useState("");
  const [where, setWhere] = useState(state.accounts[0]?.id ?? "");
  const [suggested, setSuggested] = useState<{ categoryId: string; subcategory?: string } | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (open) {
      setStep("capture");
      setTpl(null);
      setProcLine(0);
    }
  }, [open]);

  const capture = () => {
    const t = SCAN_TEMPLATES[Math.floor(Math.random() * SCAN_TEMPLATES.length)];
    setTpl(t);
    setStep("processing");
    setProcLine(0);
    const steps = ["Alinhando imagem…", "Lendo texto do comprovante…", "Extraindo valores…", "Identificando estabelecimento…"];
    steps.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setProcLine(i + 1), 650 * (i + 1)));
    });
    timers.current.push(
      window.setTimeout(() => {
        setMerchant(t.merchant);
        setAmount(t.total.toFixed(2));
        setDate(todayISO());
        const sug = suggestFor(t.merchant);
        setSuggested(sug);
        setCatId(sug?.categoryId ?? "");
        setSub(sug?.subcategory ?? "");
        setWhere(state.cards[0] ? `card:${state.cards[0].id}` : state.accounts[0]?.id ?? "");
        setStep("confirm");
      }, 650 * steps.length + 500),
    );
  };

  const selCat = state.categories.find((c) => c.id === catId);
  const expenseCats = state.categories.filter((c) => c.kind === "expense" && c.enabled);

  return (
    <Sheet open={open} onClose={onClose} title="Escanear comprovante" tall>
      {/* CAPTURE */}
      {step === "capture" && (
        <div className="anim-fade">
          <div className="relative rounded-2xl overflow-hidden mb-4" style={{ background: "#101210", height: 330 }}>
            {/* fake camera scene */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-[190px] rounded-[6px] px-3 py-4 font-mono text-[7.5px] leading-[1.5] text-neutral-500 rotate-[-3deg] select-none"
                style={{ background: "#f6f3ea", boxShadow: "0 18px 40px rgba(0,0,0,.5)" }}
              >
                <p className="text-center font-bold text-neutral-700">CUPOM FISCAL</p>
                <p className="text-center">*** VIA CONSUMIDOR ***</p>
                <p>ITEM 001 ............ 12,90</p>
                <p>ITEM 002 ............. 8,50</p>
                <p>ITEM 003 ............ 23,40</p>
                <p>ITEM 004 ............. 5,99</p>
                <p className="text-center">------------------</p>
                <p className="font-bold text-neutral-700">TOTAL ......... 50,79</p>
                <p className="text-center mt-1">OBRIGADO!</p>
              </div>
            </div>
            {/* corner brackets */}
            {[
              "top-4 left-4 border-t-2 border-l-2",
              "top-4 right-4 border-t-2 border-r-2",
              "bottom-4 left-4 border-b-2 border-l-2",
              "bottom-4 right-4 border-b-2 border-r-2",
            ].map((c) => (
              <span key={c} className={`absolute w-8 h-8 rounded-[6px] ${c}`} style={{ borderColor: "#f6f3ea" }} />
            ))}
            <p className="absolute bottom-5 left-0 right-0 text-center font-mono text-[10.5px] tracking-[0.2em] uppercase text-neutral-300">
              Enquadre o comprovante
            </p>
          </div>
          <button className="btn btn-ink w-full !py-3.5" onClick={capture}>
            {I.camera({ size: 17 })} Capturar comprovante
          </button>
          <p className="text-[11.5px] text-[var(--ink-faint)] text-center mt-3 leading-relaxed">
            Demonstração: uma imagem simulada de comprovante será reconhecida.
          </p>
        </div>
      )}

      {/* PROCESSING */}
      {step === "processing" && tpl && (
        <div className="anim-fade">
          <div className="relative rounded-2xl overflow-hidden mb-4" style={{ background: "var(--ink-card)", height: 300 }}>
            <div className="absolute inset-0 p-5 overflow-hidden">
              <div className="font-mono text-[10px] leading-[1.7] whitespace-pre" style={{ color: "var(--ink-card-text)", opacity: 0.85 }}>
                {tpl.raw.map((l, i) => (
                  <p key={i} className={i < procLine * 3 + 2 ? "" : "opacity-25"}>{l}</p>
                ))}
              </div>
            </div>
            {/* scan beam */}
            <div className="scan-beam absolute left-3 right-3 h-[2.5px] rounded-full" style={{ background: "var(--green)", boxShadow: "0 0 14px 2px color-mix(in srgb, var(--green) 70%, transparent)" }} />
          </div>
          <div className="text-center">
            <p className="font-mono text-[12px] font-bold tracking-[0.14em] uppercase">
              {["Alinhando imagem…", "Lendo texto do comprovante…", "Extraindo valores…", "Identificando estabelecimento…"][Math.min(procLine, 3)]}
            </p>
            <div className="flex justify-center gap-1.5 mt-3">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full transition-colors duration-300" style={{ background: procLine > i ? "var(--green)" : "var(--line-strong)" }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM */}
      {step === "confirm" && tpl && (
        <div className="anim-rise">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--green-soft)", color: "var(--green)" }}>{I.check({ size: 16 })}</span>
            <div>
              <p className="font-display text-[14px]">Comprovante reconhecido</p>
              <p className="text-[11.5px] text-[var(--ink-soft)]">Confira os dados antes de salvar — você pode editar.</p>
            </div>
          </div>

          <Paper edge className="px-4 pt-3.5 pb-3 mb-6 font-mono">
            <p className="text-[9.5px] tracking-[0.2em] text-[var(--ink-faint)] text-center mb-2">*** LEITURA OCR ***</p>
            {([
              ["Estabelecimento", merchant],
              ["CNPJ", tpl.cnpj],
              ["Data", dFull(date)],
              ["Pagamento", tpl.payment],
            ] as const).map(([k, v]) => (
              <div key={k} className="leader py-[3.5px]">
                <span className="lbl">{k}</span>
                <span className="dots" />
                <span className="val !text-[12px]">{v}</span>
              </div>
            ))}
            <div className="rule-dashed my-2" />
            <div className="leader py-[3.5px]">
              <span className="lbl">Valor total</span>
              <span className="dots" />
              <span className="val !text-[15px] !font-extrabold">{brl(Number(amount))}</span>
            </div>
            <details className="mt-2">
              <summary className="text-[10px] tracking-[0.16em] uppercase text-[var(--ink-faint)] cursor-pointer font-bold">Texto bruto reconhecido</summary>
              <pre className="mt-2 text-[9.5px] leading-[1.6] text-[var(--ink-soft)] whitespace-pre-wrap font-mono">{tpl.raw.join("\n")}</pre>
            </details>
          </Paper>

          {/* editable fields */}
          <Field label="Estabelecimento">
            <input className="field" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Valor (R$)">
              <div className="field flex items-center gap-1.5 !py-[9px]">
                <input inputMode="numeric" className="flex-1 bg-transparent outline-none font-mono font-bold text-[14px] min-w-0" style={{ color: "var(--ink)" }} value={Number(amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 11); setAmount((Number(d || "0") / 100).toFixed(2)); }} />
              </div>
            </Field>
            <Field label="Data">
              <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          <div className="flex items-center justify-between mb-1.5 mt-1">
            <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)]">Com o que foi esse gasto?</p>
          </div>
          {suggested && (
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold mb-2" style={{ color: "var(--green)" }}>
              {I.spark({ size: 13 })} Sugestão aprendida: {state.categories.find((c) => c.id === suggested.categoryId)?.name}
              {suggested.subcategory ? ` > ${suggested.subcategory}` : ""}
            </p>
          )}
          <div className="flex gap-2 flex-wrap mb-3">
            {expenseCats.slice(0, 9).map((c) => (
              <button key={c.id} onClick={() => { setCatId(c.id); setSub(""); }} className="chip" style={catId === c.id ? { background: "var(--ink)", borderColor: "var(--ink)", color: "var(--paper)" } : undefined}>
                <Dot color={c.color} size={7} /> {c.name}
              </button>
            ))}
          </div>
          {selCat && selCat.subs.length > 0 && (
            <Field label="Subcategoria">
              <select className="field" value={sub} onChange={(e) => setSub(e.target.value)}>
                <option value="">Sem subcategoria</option>
                {selCat.subs.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          )}
          <Field label="Conta ou cartão">
            <select className="field" value={where} onChange={(e) => setWhere(e.target.value)}>
              {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              {state.cards.map((c) => <option key={c.id} value={`card:${c.id}`}>{c.name} (cartão)</option>)}
            </select>
          </Field>

          <button
            className="btn btn-ink w-full !py-3.5 mt-1"
            onClick={() => {
              const v = Number(amount);
              if (v <= 0) return toast("Não foi possível reconhecer um valor válido. Ajuste manualmente.", "red");
              if (!merchant.trim()) return toast("Informe o estabelecimento.", "red");
              if (!catId) return toast("Selecione uma categoria para o gasto.", "red");
              learnMerchant(merchant.trim(), catId, sub || undefined);
              const isCard = where.startsWith("card:");
              addExpense({
                amount: v,
                date,
                description: merchant.trim(),
                categoryId: catId,
                subcategory: sub || undefined,
                accountId: isCard ? undefined : where,
                cardId: isCard ? where.slice(5) : undefined,
                merchantName: merchant.trim(),
                sourceType: "RECEIPT_OCR",
              });
              pushRecent(catId);
              toast("Gasto salvo — preferência do estabelecimento aprendida.", "green");
              onClose();
            }}
          >
            Salvar gasto
          </button>
          <button className="btn btn-ghost w-full !py-3 mt-2 text-[13px]" onClick={() => setStep("capture")}>
            {I.camera({ size: 15 })} Escanear outro comprovante
          </button>
        </div>
      )}
    </Sheet>
  );
}


