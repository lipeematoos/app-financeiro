import { useEffect, useMemo, useState } from "react";
import { useStore, useCountUp } from "../lib/store";
import type { Account, AssetType, Investment } from "../lib/types";
import { accountBalance, cardAvailable, cardInvoice, netWorth, nextDueDate, daysUntil } from "../lib/engine";
import { brl, brl0, brlSigned, currentMonthKey, dFull, monthLabelFull, num, todayISO, uid } from "../lib/format";
import { Bar, Field, I, Leader, MoneyInput, Paper, Reveal, SectionHead, Sheet, Confirm, EmptyState, Seg } from "../components/ui";

const ASSET_TYPES: AssetType[] = ["Ações", "Fundos Imobiliários", "Tesouro Direto", "CDB", "LCI", "LCA", "Fundos", "Criptomoedas", "Previdência", "Poupança", "Outros"];
const INCOME_TYPES = ["Dividendos", "Juros sobre Capital Próprio", "Rendimentos de FII", "Juros", "Cupons", "Rendimentos de renda fixa", "Outros"];
const ACC_TYPES = ["Conta corrente", "Conta poupança", "Dinheiro", "Carteira digital", "Conta de pagamento", "Outra"];

export default function Wealth({ open }: { open: (o: string) => void }) {
  const { state, toast, upsertAccount, upsertCard, payInvoice, installmentPurchase, addInvestment, updateInvestment, investTransfer, addInvIncome } = useStore();
  const worth = useMemo(() => netWorth(state), [state]);
  const worthAnim = useCountUp(worth.total, 900);

  const [accForm, setAccForm] = useState(false);
  const [cardForm, setCardForm] = useState(false);
  const [payCard, setPayCard] = useState<string | null>(null);
  const [instCard, setInstCard] = useState<string | null>(null);
  const [selAsset, setSelAsset] = useState<Investment | null>(null);
  const [newAsset, setNewAsset] = useState(false);
  const [contribute, setContribute] = useState<Investment | null>(null);
  const [income, setIncome] = useState<Investment | null>(null);
  const [confirmPay, setConfirmPay] = useState(false);
  const [editVal, setEditVal] = useState<string | null>(null);

  useEffect(() => {
    if (!selAsset) setEditVal(null);
  }, [selAsset]);

  // account form state
  const [aName, setAName] = useState("");
  const [aType, setAType] = useState(ACC_TYPES[0]);
  const [aInst, setAInst] = useState("");
  const [aBal, setABal] = useState("0.00");
  const [aIcon, setAIcon] = useState<Account["icon"]>("bank");

  // card form
  const [cName, setCName] = useState("");
  const [cInst, setCInst] = useState("");
  const [cBrand, setCBrand] = useState("Mastercard");
  const [cLimit, setCLimit] = useState("0.00");
  const [cClose, setCClose] = useState("28");
  const [cDue, setCDue] = useState("8");

  // installment form
  const [iDesc, setIDesc] = useState("");
  const [iVal, setIVal] = useState("0.00");
  const [iN, setIN] = useState("3");
  const [iCat, setICat] = useState("");

  // new asset form
  const [nType, setNType] = useState<AssetType>("CDB");
  const [nName, setNName] = useState("");
  const [nTicker, setNTicker] = useState("");
  const [nInst, setNInst] = useState("");
  const [nQty, setNQty] = useState("1");
  const [nAvg, setNAvg] = useState("0.00");
  const [nCur, setNCur] = useState("0.00");
  const [nMat, setNMat] = useState("");

  // contribution / income
  const [ctVal, setCtVal] = useState("0.00");
  const [ctAcc, setCtAcc] = useState(state.accounts[0]?.id ?? "");
  const [ctDate, setCtDate] = useState(todayISO());
  const [inVal, setInVal] = useState("0.00");
  const [inType, setInType] = useState(INCOME_TYPES[0]);
  const [inDate, setInDate] = useState(todayISO());
  const [inAsTx, setInAsTx] = useState(true);

  const inv = useMemo(
    () => [...state.investments].sort((a, b) => b.current - a.current),
    [state.investments],
  );
  const invResult = (i: Investment) => i.current - i.invested;
  const invPct = (i: Investment) => (i.invested > 0 ? (invResult(i) / i.invested) * 100 : 0);

  const closeAll = () => {
    setAccForm(false); setCardForm(false); setPayCard(null); setInstCard(null);
    setSelAsset(null); setNewAsset(false); setContribute(null); setIncome(null);
  };

  const resetForms = () => {
    setAName(""); setAInst(""); setABal("0.00");
    setCName(""); setCInst(""); setCLimit("0.00");
    setIDesc(""); setIVal("0.00"); setICat("");
    setNName(""); setNTicker(""); setNInst(""); setNQty("1"); setNAvg("0.00"); setNCur("0.00"); setNMat("");
    setCtVal("0.00"); setInVal("0.00"); setInAsTx(true);
  };

  const nowKey = currentMonthKey();

  return (
    <div className="px-4 pb-8">
      <header className="pt-5 pb-3 px-1">
        <h1 className="font-display text-[21px]">Patrimônio</h1>
        <p className="text-[12px] text-[var(--ink-soft)] mt-0.5">Contas, cartões e investimentos em um só lugar</p>
      </header>

      {/* NET WORTH */}
      <Reveal>
        <Paper edge className="px-5 pt-4 pb-3">
          <p className="font-mono text-[9.5px] tracking-[0.22em] text-[var(--ink-faint)] text-center mb-2">*** POSIÇÃO CONSOLIDADA ***</p>
          <Leader label="Contas" value={brl(worth.accounts)} />
          <Leader label="Investimentos" value={brl(worth.investments)} />
          <div className="rule-dashed my-2" />
          <Leader label="Total" value={brl(worthAnim)} strong tone={worth.total >= 0 ? "green" : "red"} />
          <p className="font-mono text-[9px] tracking-[0.18em] text-[var(--ink-faint)] text-center mt-3">REGISTRAR · ENTENDER · PLANEJAR · EVOLUIR</p>
        </Paper>
      </Reveal>

      {/* ACCOUNTS */}
      <Reveal delay={60}>
        <div className="mt-8">
          <SectionHead title="CONTAS" action="Nova conta" onAction={() => { resetForms(); setAccForm(true); }} />
          <div className="grid gap-2.5">
            {state.accounts.map((a) => {
              const bal = accountBalance(state, a.id);
              return (
                <Paper key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "var(--paper-2)", color: "var(--ink-soft)", border: "1px solid var(--line)" }}>
                    {a.icon === "cash" ? I.cash({ size: 18 }) : a.icon === "digital" ? I.wallet({ size: 18 }) : a.icon === "piggy" ? I.piggy({ size: 18 }) : I.bank({ size: 18 })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13.5px]">{a.name}</p>
                    <p className="text-[11.5px] text-[var(--ink-soft)]">{a.type} · {a.institution}</p>
                  </div>
                  <span className="font-mono font-bold text-[14px]" style={{ color: bal < 0 ? "var(--red)" : "var(--ink)" }}>{brl(bal)}</span>
                </Paper>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* CARDS */}
      <Reveal delay={80}>
        <div className="mt-8">
          <SectionHead title="CARTÕES DE CRÉDITO" action="Novo cartão" onAction={() => { resetForms(); setCardForm(true); }} />
          <div className="grid gap-3">
            {state.cards.map((c) => {
              const invoice = cardInvoice(state, c.id, nowKey);
              const avail = cardAvailable(state, c);
              const due = nextDueDate(c.dueDay);
              const days = daysUntil(due);
              const usedPct = c.limit > 0 ? (invoice.total / c.limit) * 100 : 0;
              return (
                <div key={c.id} className="paper-card overflow-hidden">
                  <div className="px-4 py-3.5" style={{ background: "var(--ink-card)", color: "var(--ink-card-text)" }}>
                    <div className="flex items-center justify-between">
                      <p className="font-display text-[13px] tracking-wide">{c.name}</p>
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] opacity-70">{c.brand}</span>
                    </div>
                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-60">Fatura atual</p>
                        <p className="font-mono font-extrabold text-[20px] leading-tight">{brl(invoice.total)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-60">Vencimento</p>
                        <p className="font-mono font-bold text-[13px]">{dFull(due).slice(0, 5)}{days <= 3 ? <span className="text-[10px] font-bold ml-1.5 blink">em {days}d</span> : null}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[11.5px] font-semibold text-[var(--ink-soft)]">Limite disponível</span>
                      <span className="font-mono text-[12px] font-bold">{brl(avail)} <span className="text-[var(--ink-faint)] font-semibold">/ {brl0(c.limit)}</span></span>
                    </div>
                    <Bar pct={usedPct} tone={usedPct > 85 ? "red" : usedPct > 60 ? "amber" : "green"} h={7} />
                    <div className="flex gap-2 mt-3">
                      <button className="btn btn-ink flex-1 !py-2.5 text-[12.5px]" disabled={invoice.total <= 0 || invoice.paid} onClick={() => { setPayCard(c.id); setConfirmPay(true); }}>
                        {invoice.paid ? "Fatura paga" : "Pagar fatura"}
                      </button>
                      <button className="btn btn-ghost flex-1 !py-2.5 text-[12.5px]" onClick={() => { resetForms(); setInstCard(c.id); }}>
                        Compra parcelada
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* INVESTMENTS */}
      <Reveal delay={100}>
        <div className="mt-8">
          <SectionHead title="INVESTIMENTOS" action="Novo ativo" onAction={() => { resetForms(); setNewAsset(true); }} />
          {inv.length === 0 ? (
            <EmptyState icon={I.invest({ size: 22 })} title="Você ainda não cadastrou investimentos." hint="Adicione seu primeiro ativo para acompanhar seu patrimônio." action="Adicionar ativo" onAction={() => setNewAsset(true)} />
          ) : (
            <div className="grid gap-2.5">
              {inv.map((i) => {
                const r = invResult(i);
                const p = invPct(i);
                return (
                  <button key={i.id} onClick={() => setSelAsset(i)} className="paper-card px-4 py-3 flex items-center gap-3 text-left pressable hover:bg-[var(--paper-2)]">
                    <span className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 font-display text-[10px]" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
                      {(i.ticker ?? i.name).slice(0, 4).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[13.5px] truncate">{i.name}</p>
                      <p className="text-[11.5px] text-[var(--ink-soft)]">{i.assetType} · {brl0(i.current)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-[13px]" style={{ color: r >= 0 ? "var(--green)" : "var(--red)" }}>{brlSigned(r)}</p>
                      <p className="font-mono text-[10.5px] font-bold" style={{ color: r >= 0 ? "var(--green)" : "var(--red)" }}>{p >= 0 ? "+" : ""}{num(p, 2)}%</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Reveal>

      {/* ---------------- sheets ---------------- */}

      {/* Asset detail */}
      <Sheet open={Boolean(selAsset)} onClose={() => setSelAsset(null)} title="Posição do ativo">
        {selAsset && (
          <div>
            <Paper edge className="px-4 pt-3.5 pb-3 mb-6">
              <p className="font-display text-[15px] text-center mb-2">{selAsset.ticker ? `${selAsset.ticker} · ${selAsset.name}` : selAsset.name.toUpperCase()}</p>
              {selAsset.quantity > 0 && selAsset.assetType !== "CDB" && selAsset.assetType !== "LCI" && (
                <Leader label="Quantidade" value={num(selAsset.quantity, 4)} />
              )}
              {selAsset.avgPrice > 0 && <Leader label="Preço médio" value={brl(selAsset.avgPrice)} />}
              <Leader label="Investido" value={brl(selAsset.invested)} />
              <Leader label="Valor atual" value={brl(selAsset.current)} />
              <div className="rule-dashed my-2" />
              <Leader label="Resultado" value={brlSigned(invResult(selAsset))} tone={invResult(selAsset) >= 0 ? "green" : "red"} strong />
              <Leader label="Rentabilidade" value={`${invPct(selAsset) >= 0 ? "+" : ""}${num(invPct(selAsset), 2)}%`} tone={invPct(selAsset) >= 0 ? "green" : "red"} />
              {selAsset.maturity && <Leader label="Vencimento" value={dFull(selAsset.maturity)} />}
              <p className="font-mono text-[9px] tracking-[0.18em] text-[var(--ink-faint)] text-center mt-3">{selAsset.institution.toUpperCase()}</p>
            </Paper>
            <div className="flex gap-2 mb-2">
              <button className="btn btn-ink flex-1 !py-3 text-[13px]" onClick={() => { resetForms(); setContribute(selAsset); setSelAsset(null); }}>
                {I.down({ size: 15 })} Aportar
              </button>
              <button className="btn btn-green flex-1 !py-3 text-[13px]" onClick={() => { resetForms(); setIncome(selAsset); setSelAsset(null); }}>
                {I.up({ size: 15 })} Rendimento
              </button>
            </div>
            {editVal === null ? (
              <button className="btn btn-ghost w-full !py-2.5 text-[12.5px]" onClick={() => setEditVal(selAsset.current.toFixed(2))}>
                {I.edit({ size: 14 })} Atualizar valor atual
              </button>
            ) : (
              <div className="flex gap-2">
                <div className="field flex items-center gap-1.5 flex-1 !py-[9px]">
                  <span className="font-mono text-[12px] font-bold text-[var(--ink-faint)]">R$</span>
                  <input
                    autoFocus
                    inputMode="numeric"
                    className="flex-1 bg-transparent outline-none font-mono font-bold text-[14px] min-w-0"
                    style={{ color: "var(--ink)" }}
                    value={Number(editVal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setEditVal((Number(d || "0") / 100).toFixed(2));
                    }}
                  />
                </div>
                <button
                  className="btn btn-ink !px-4 !py-2"
                  onClick={() => {
                    const n = Number(editVal);
                    if (!Number.isFinite(n) || n < 0) return toast("Informe um valor válido.", "red");
                    updateInvestment(selAsset.id, { current: n });
                    setSelAsset({ ...selAsset, current: n });
                    setEditVal(null);
                    toast("Valor atualizado.", "green");
                  }}
                >
                  {I.check({ size: 15 })} Salvar
                </button>
                <button className="btn btn-ghost !px-3.5 !py-2" onClick={() => setEditVal(null)} aria-label="Cancelar">
                  {I.x({ size: 15 })}
                </button>
              </div>
            )}
            <p className="text-[11px] text-[var(--ink-faint)] text-center mt-3 leading-relaxed">
              Valores informados manualmente — o Cupom não se conecta à sua corretora.
            </p>
          </div>
        )}
      </Sheet>

      {/* Contribute */}
      <Sheet open={Boolean(contribute)} onClose={() => setContribute(null)} title="Aportar no ativo">
        {contribute && (
          <div>
            <p className="text-[13px] text-[var(--ink-soft)] leading-relaxed mb-3">
              O aporte é uma <strong>transferência patrimonial</strong>: sai da conta e entra no investimento. Seu patrimônio total não muda, apenas a alocação.
            </p>
            <MoneyInput value={ctVal} onChange={setCtVal} autoFocus />
            <Field label="Conta de origem">
              <select className="field" value={ctAcc} onChange={(e) => setCtAcc(e.target.value)}>
                {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {brl(accountBalance(state, a.id))}</option>)}
              </select>
            </Field>
            <Field label="Data">
              <input type="date" className="field" value={ctDate} onChange={(e) => setCtDate(e.target.value)} />
            </Field>
            <button
              className="btn btn-ink w-full !py-3.5 mt-2"
              onClick={() => {
                const v = Number(ctVal);
                if (v <= 0) return toast("O valor deve ser maior que zero.", "red");
                if (!ctAcc) return toast("Selecione uma conta de origem.", "red");
                investTransfer(contribute.id, ctAcc, v, ctDate);
                toast(`Aporte de ${brl(v)} registrado em ${contribute.ticker ?? contribute.name}.`, "green");
                setContribute(null);
              }}
            >
              Confirmar aporte
            </button>
          </div>
        )}
      </Sheet>

      {/* Investment income */}
      <Sheet open={Boolean(income)} onClose={() => setIncome(null)} title="Registrar rendimento">
        {income && (
          <div>
            <MoneyInput value={inVal} onChange={setInVal} autoFocus />
            <Field label="Tipo de rendimento">
              <select className="field" value={inType} onChange={(e) => setInType(e.target.value)}>
                {INCOME_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Data">
              <input type="date" className="field" value={inDate} onChange={(e) => setInDate(e.target.value)} />
            </Field>
            <Field label="Conta destino">
              <select className="field" value={ctAcc} onChange={(e) => setCtAcc(e.target.value)}>
                {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <button
              onClick={() => setInAsTx(!inAsTx)}
              className="w-full flex items-center gap-3 paper-card px-4 py-3 mb-4 text-left"
            >
              <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: inAsTx ? "var(--green)" : "var(--paper-2)", border: "1px solid var(--line-strong)", color: "#fff" }}>
                {inAsTx && I.check({ size: 12 })}
              </span>
              <span>
                <span className="block text-[13px] font-semibold">Registrar também como entrada na conta</span>
                <span className="block text-[11.5px] text-[var(--ink-soft)]">Cria uma entrada de "{inType}" na conta destino.</span>
              </span>
            </button>
            <button
              className="btn btn-green w-full !py-3.5"
              onClick={() => {
                const v = Number(inVal);
                if (v <= 0) return toast("O valor deve ser maior que zero.", "red");
                addInvIncome({ assetId: income.id, amount: v, date: inDate, type: inType, accountId: ctAcc, asTransaction: inAsTx });
                toast(`${inType} de ${brl(v)} registrado.`, "green");
                setIncome(null);
              }}
            >
              Salvar rendimento
            </button>
          </div>
        )}
      </Sheet>

      {/* New investment */}
      <Sheet open={newAsset} onClose={() => setNewAsset(false)} title="Novo ativo" tall>
        <div>
          <Field label="Tipo de ativo">
            <select className="field" value={nType} onChange={(e) => setNType(e.target.value as AssetType)}>
              {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-[1fr_110px] gap-2.5">
            <Field label="Nome do ativo">
              <input className="field" placeholder="Ex.: Tesouro Selic 2029" value={nName} onChange={(e) => setNName(e.target.value)} />
            </Field>
            <Field label="Ticker">
              <input className="field" placeholder="Opcional" value={nTicker} onChange={(e) => setNTicker(e.target.value.toUpperCase())} />
            </Field>
          </div>
          <Field label="Instituição">
            <input className="field" placeholder="Ex.: XP Investimentos" value={nInst} onChange={(e) => setNInst(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Quantidade">
              <input className="field" inputMode="decimal" value={nQty} onChange={(e) => setNQty(e.target.value)} />
            </Field>
            <Field label="Preço médio (R$)">
              <MoneyField value={nAvg} onChange={setNAvg} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Total investido (R$)">
              <MoneyField value={nCur === "0.00" ? nAvg : nCur} onChange={setNCur} />
            </Field>
            <Field label="Vencimento (opcional)">
              <input type="date" className="field" value={nMat} onChange={(e) => setNMat(e.target.value)} />
            </Field>
          </div>
          <button
            className="btn btn-ink w-full !py-3.5 mt-1"
            onClick={() => {
              if (!nName.trim()) return toast("Informe o nome do ativo.", "red");
              const invested = Number(nAvg);
              const current = Number(nCur);
              if (invested <= 0) return toast("Informe o valor investido.", "red");
              addInvestment({
                id: uid(), assetType: nType, name: nName.trim(), ticker: nTicker.trim() || undefined,
                institution: nInst.trim() || "—", quantity: Number(nQty.replace(",", ".")) || 0,
                avgPrice: invested, invested, current: current > 0 ? current : invested,
                acquired: todayISO(), maturity: nMat || undefined,
              });
              toast("Ativo adicionado ao patrimônio.", "green");
              setNewAsset(false);
            }}
          >
            Salvar ativo
          </button>
        </div>
      </Sheet>

      {/* New account */}
      <Sheet open={accForm} onClose={() => setAccForm(false)} title="Nova conta">
        <div>
          <Field label="Nome">
            <input className="field" placeholder="Ex.: Conta Corrente" value={aName} onChange={(e) => setAName(e.target.value)} />
          </Field>
          <Field label="Tipo">
            <select className="field" value={aType} onChange={(e) => setAType(e.target.value)}>
              {ACC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Instituição">
            <input className="field" placeholder="Ex.: Banco do Brasil" value={aInst} onChange={(e) => setAInst(e.target.value)} />
          </Field>
          <Field label="Saldo inicial (R$)">
            <MoneyField value={aBal} onChange={setABal} />
          </Field>
          <Field label="Ícone">
            <div className="flex gap-2">
              {([["bank", I.bank], ["piggy", I.piggy], ["digital", I.wallet], ["cash", I.cash]] as const).map(([k, Icon]) => (
                <button key={k} onClick={() => setAIcon(k)} className="w-11 h-11 rounded-xl flex items-center justify-center transition-all" style={{ background: aIcon === k ? "var(--ink)" : "var(--paper-2)", color: aIcon === k ? "var(--paper)" : "var(--ink-soft)", border: "1px solid var(--line)" }}>
                  {Icon({ size: 18 })}
                </button>
              ))}
            </div>
          </Field>
          <button
            className="btn btn-ink w-full !py-3.5 mt-1"
            onClick={() => {
              if (!aName.trim()) return toast("Informe o nome da conta.", "red");
              upsertAccount({ id: uid(), name: aName.trim(), type: aType, institution: aInst.trim() || "—", initialBalance: Number(aBal), icon: aIcon });
              toast("Conta criada.", "green");
              setAccForm(false);
            }}
          >
            Criar conta
          </button>
          <p className="text-[11px] text-[var(--ink-faint)] text-center mt-3">Saldos são gerenciados manualmente — o Cupom não acessa seu banco.</p>
        </div>
      </Sheet>

      {/* New card */}
      <Sheet open={cardForm} onClose={() => setCardForm(false)} title="Novo cartão" tall>
        <div>
          <Field label="Nome do cartão">
            <input className="field" placeholder="Ex.: Nubank Gold" value={cName} onChange={(e) => setCName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Instituição">
              <input className="field" placeholder="Ex.: Nubank" value={cInst} onChange={(e) => setCInst(e.target.value)} />
            </Field>
            <Field label="Bandeira">
              <select className="field" value={cBrand} onChange={(e) => setCBrand(e.target.value)}>
                {["Mastercard", "Visa", "Elo", "Hipercard", "Amex"].map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Limite de crédito (R$)">
            <MoneyField value={cLimit} onChange={setCLimit} />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Dia de fechamento">
              <input type="number" min={1} max={31} className="field" value={cClose} onChange={(e) => setCClose(e.target.value)} />
            </Field>
            <Field label="Dia de vencimento">
              <input type="number" min={1} max={31} className="field" value={cDue} onChange={(e) => setCDue(e.target.value)} />
            </Field>
          </div>
          <button
            className="btn btn-ink w-full !py-3.5 mt-1"
            onClick={() => {
              if (!cName.trim()) return toast("Informe o nome do cartão.", "red");
              upsertCard({ id: uid(), name: cName.trim(), institution: cInst.trim() || "—", brand: cBrand, limit: Number(cLimit), closingDay: Math.min(31, Math.max(1, Number(cClose) || 28)), dueDay: Math.min(31, Math.max(1, Number(cDue) || 8)) });
              toast("Cartão adicionado.", "green");
              setCardForm(false);
            }}
          >
            Adicionar cartão
          </button>
          <p className="text-[11px] text-[var(--ink-faint)] text-center mt-3">Nunca pedimos número completo ou CVV — o cartão é apenas uma referência de planejamento.</p>
        </div>
      </Sheet>

      {/* Installment purchase */}
      <Sheet open={Boolean(instCard)} onClose={() => setInstCard(null)} title="Compra parcelada">
        {instCard && (
          <div>
            <MoneyInput value={iVal} onChange={setIVal} autoFocus />
            <Field label="Descrição">
              <input className="field" placeholder="Ex.: Geladeira nova" value={iDesc} onChange={(e) => setIDesc(e.target.value)} />
            </Field>
            <Field label="Parcelas">
              <Seg
                options={["2", "3", "4", "6", "10", "12"].map((n) => ({ v: n, label: `${n}x` }))}
                value={iN}
                onChange={setIN}
              />
            </Field>
            <Field label="Categoria">
              <select className="field" value={iCat} onChange={(e) => setICat(e.target.value)}>
                <option value="">Selecione…</option>
                {state.categories.filter((c) => c.kind === "expense" && c.enabled).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {Number(iVal) > 0 && Number(iN) > 0 && (
              <p className="font-mono text-[12.5px] font-bold text-center mb-4" style={{ color: "var(--ink-soft)" }}>
                {iN}x de {brl(Number(iVal) / Number(iN))}
              </p>
            )}
            <button
              className="btn btn-ink w-full !py-3.5"
              onClick={() => {
                const v = Number(iVal);
                if (v <= 0) return toast("O valor deve ser maior que zero.", "red");
                if (!iDesc.trim()) return toast("Informe uma descrição.", "red");
                if (!iCat) return toast("Selecione uma categoria.", "red");
                installmentPurchase({ cardId: instCard, amount: v, installments: Number(iN), description: iDesc.trim(), categoryId: iCat, firstDate: todayISO() });
                toast(`Compra de ${brl(v)} parcelada em ${iN}x na fatura.`, "green");
                setInstCard(null);
              }}
            >
              Gerar parcelas
            </button>
            <p className="text-[11px] text-[var(--ink-faint)] text-center mt-3 leading-relaxed">As parcelas entram nas próximas faturas. O saldo da conta só muda quando você pagar a fatura.</p>
          </div>
        )}
      </Sheet>

      {/* Pay invoice confirm */}
      <Confirm
        open={confirmPay}
        onClose={() => setConfirmPay(false)}
        danger={false}
        title="Pagar fatura?"
        body={`A fatura de ${brl(cardInvoice(state, payCard ?? "", nowKey).total)} será registrada como saída da ${state.accounts[0]?.name ?? "conta"} hoje.`}
        onConfirm={() => {
          if (payCard) {
            const inv = cardInvoice(state, payCard, nowKey);
            payInvoice(payCard, nowKey, state.accounts[0]?.id ?? "", inv.total);
            toast("Fatura paga e registrada.", "green");
          }
          setConfirmPay(false);
          closeAll();
        }}
      />
      <p className="text-center font-mono text-[9.5px] tracking-[0.2em] text-[var(--ink-faint)] mt-6">FIM · {monthLabelFull(nowKey).toUpperCase()}</p>
    </div>
  );
}

/** Compact money field (for grids) — reuses the mask. */
function MoneyField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field flex items-center gap-1.5 !py-[9px]">
      <span className="font-mono text-[12px] font-bold text-[var(--ink-faint)]">R$</span>
      <input
        inputMode="numeric"
        className="flex-1 bg-transparent outline-none font-mono font-bold text-[14px] min-w-0"
        style={{ color: "var(--ink)" }}
        value={value === "0.00" ? "" : Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        placeholder="0,00"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
          onChange((Number(digits || "0") / 100).toFixed(2));
        }}
      />
    </div>
  );
}
