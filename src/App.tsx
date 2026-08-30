import { useEffect, useRef, useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import Home from "./screens/Home";
import Transactions from "./screens/Transactions";
import Wealth from "./screens/Wealth";
import Analytics from "./screens/Analytics";
import { QuickAddSheet, ExpenseSheet, IncomeSheet, TransferSheet, ScannerSheet } from "./screens/Sheets";
import type { SheetKind } from "./screens/Sheets";
import { Planning, BudgetsOverlay, SettingsScreen } from "./screens/Extras";
import { I, ToastHost } from "./components/ui";

type Tab = "home" | "transactions" | "wealth" | "analytics";
type Overlay = null | "settings" | "planning" | "budgets";

function Shell() {
  const { toasts } = useStore();
  const [tab, setTab] = useState<Tab>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [analyticsTab, setAnalyticsTab] = useState("geral");
  const scrollRef = useRef<HTMLDivElement>(null);

  const go = (t: string) => {
    if (t.startsWith("analytics:")) {
      setAnalyticsTab(t.split(":")[1]);
      setTab("analytics");
    } else {
      setTab(t as Tab);
    }
    setOverlay(null);
    setSheet(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const open = (o: string) => {
    if (o === "settings" || o === "planning" || o === "budgets") setOverlay(o as Overlay);
    else setSheet(o as SheetKind);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  const NavBtn = ({ t, label, icon }: { t: Tab; label: string; icon: (p?: { size?: number }) => React.ReactNode }) => (
    <button
      onClick={() => go(t)}
      className="flex flex-col items-center gap-1 flex-1 pt-2 pb-1 pressable"
      style={{ color: tab === t ? "var(--ink)" : "var(--ink-faint)" }}
    >
      {icon({ size: 20 })}
      <span className="text-[9.5px] font-bold tracking-wide">{label}</span>
      <span
        className="w-1 h-1 rounded-full transition-all duration-300"
        style={{ background: tab === t ? "var(--red)" : "transparent", transform: tab === t ? "scale(1)" : "scale(0)" }}
      />
    </button>
  );

  return (
    <div className="ambient fixed inset-0 flex items-center justify-center overflow-hidden">
      {/* ambient watermarks */}
      <div className="ambient-watermark absolute -left-16 top-[8%] text-[280px] leading-none hidden lg:block select-none rotate-[-8deg]">R$</div>
      <div className="ambient-watermark absolute -right-10 bottom-[4%] text-[220px] leading-none hidden lg:block select-none rotate-[6deg]">***</div>
      <div className="ambient-watermark absolute left-[16%] bottom-[-40px] text-[140px] leading-none hidden xl:block select-none">CUPOM</div>

      {/* Phone frame */}
      <div className="relative w-full h-full md:w-[412px] md:h-[min(880px,calc(100vh-44px))] md:rounded-[34px] md:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.85)] md:ring-1 md:ring-white/10 overflow-hidden flex flex-col paper-bg">
        {/* scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto app-scroll overflow-x-hidden">
          {tab === "home" && <Home go={go} open={open} />}
          {tab === "transactions" && <Transactions open={open} />}
          {tab === "wealth" && <Wealth open={open} />}
          {tab === "analytics" && <Analytics key={analyticsTab} initialTab={analyticsTab} />}
          <div className="h-24" />
        </div>

        {/* bottom navigation */}
        <nav
          className="shrink-0 relative z-20 flex items-start px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-1"
          style={{ background: "var(--paper)", borderTop: "1px solid var(--line)", boxShadow: "0 -12px 30px -18px rgba(0,0,0,.25)" }}
        >
          <NavBtn t="home" label="Início" icon={I.home} />
          <NavBtn t="transactions" label="Movim." icon={I.list} />
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => setSheet(sheet === "quickadd" ? null : "quickadd")}
              aria-label="Novo lançamento"
              className="w-[54px] h-[54px] -mt-6 rounded-[18px] flex items-center justify-center pressable"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                boxShadow: "0 14px 28px -10px rgba(27,29,25,.6)",
                transform: sheet === "quickadd" ? "rotate(45deg)" : "rotate(0deg)",
                transition: "transform .3s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              {I.plus({ size: 24 })}
            </button>
          </div>
          <NavBtn t="wealth" label="Patrimônio" icon={I.wallet} />
          <NavBtn t="analytics" label="Análises" icon={I.chart} />
        </nav>

        {/* overlays (full screens inside the frame) */}
        {overlay === "settings" && <SettingsScreen onClose={() => setOverlay(null)} />}
        {overlay === "planning" && <Planning onClose={() => setOverlay(null)} />}
        {overlay === "budgets" && <BudgetsOverlay onClose={() => setOverlay(null)} />}

        {/* action sheets */}
        <QuickAddSheet open={sheet === "quickadd"} onClose={() => setSheet(null)} go={(k) => setSheet(k)} />
        <ExpenseSheet open={sheet === "expense"} onClose={() => setSheet(null)} />
        <IncomeSheet open={sheet === "income"} onClose={() => setSheet(null)} />
        <TransferSheet open={sheet === "transfer"} onClose={() => setSheet(null)} />
        <ScannerSheet open={sheet === "scanner"} onClose={() => setSheet(null)} />

        <ToastHost toasts={toasts} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
