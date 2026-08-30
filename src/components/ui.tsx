// Shared UI primitives — receipt-inspired, all inline SVG iconography.

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Severity } from "../lib/types";
import { sevLabel } from "../lib/engine";
import { maskMoney } from "../lib/format";

/* --------------------------------- icons -------------------------------- */

type IconProps = { size?: number; className?: string; sw?: number };
const S = ({ size = 18, className, sw = 1.9, children }: IconProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {children}
  </svg>
);

export const I = {
  home: (p?: IconProps) => <S {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></S>,
  list: (p?: IconProps) => <S {...p}><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></S>,
  plus: (p?: IconProps) => <S {...p} sw={2.4}><path d="M12 5v14M5 12h14" /></S>,
  wallet: (p?: IconProps) => <S {...p}><path d="M20 7H5a2 2 0 0 1-2-2 2 2 0 0 1 2-2h13v4" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1" /><path d="M16.5 13.5h.01" /></S>,
  chart: (p?: IconProps) => <S {...p}><path d="M3 3v18h18" /><path d="M7 15v3M12 10v8M17 6v12" /></S>,
  gear: (p?: IconProps) => <S {...p}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" /></S>,
  scan: (p?: IconProps) => <S {...p}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M4 12h16" /></S>,
  up: (p?: IconProps) => <S {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></S>,
  down: (p?: IconProps) => <S {...p}><path d="M17 7 7 17" /><path d="M16 17H7V8" /></S>,
  card: (p?: IconProps) => <S {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19" /></S>,
  bank: (p?: IconProps) => <S {...p}><path d="M3 9.5 12 4l9 5.5" /><path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7" /><path d="M3 20h18" /></S>,
  cash: (p?: IconProps) => <S {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 12h.01M18 12h.01" /></S>,
  invest: (p?: IconProps) => <S {...p}><path d="M3 17c2.5 0 3-6 5.5-6S11 14 13 14s2.5-8 5-8" /><path d="M15 5.5h3.5V9" /><path d="M3 21h18" /></S>,
  cal: (p?: IconProps) => <S {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></S>,
  bell: (p?: IconProps) => <S {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></S>,
  search: (p?: IconProps) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></S>,
  x: (p?: IconProps) => <S {...p} sw={2.2}><path d="M18 6 6 18M6 6l12 12" /></S>,
  check: (p?: IconProps) => <S {...p} sw={2.4}><path d="m4.5 12.5 5 5 10-11" /></S>,
  alert: (p?: IconProps) => <S {...p}><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></S>,
  radar: (p?: IconProps) => <S {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12l6-6.5" /><path d="M12 12h.01" /></S>,
  tag: (p?: IconProps) => <S {...p}><path d="M12.6 2.6 21.4 11.4a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6Z" /><path d="M7.5 7.5h.01" /></S>,
  repeat: (p?: IconProps) => <S {...p}><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></S>,
  sun: (p?: IconProps) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></S>,
  moon: (p?: IconProps) => <S {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></S>,
  chevR: (p?: IconProps) => <S {...p}><path d="m9 6 6 6-6 6" /></S>,
  chevL: (p?: IconProps) => <S {...p}><path d="m15 6-6 6 6 6" /></S>,
  trash: (p?: IconProps) => <S {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></S>,
  edit: (p?: IconProps) => <S {...p}><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></S>,
  download: (p?: IconProps) => <S {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></S>,
  shield: (p?: IconProps) => <S {...p}><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" /></S>,
  user: (p?: IconProps) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></S>,
  info: (p?: IconProps) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 16v-5M12 8h.01" /></S>,
  camera: (p?: IconProps) => <S {...p}><path d="M14.5 4h-5L7.8 6.5H4a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-3.8Z" /><circle cx="12" cy="13" r="3.5" /></S>,
  spark: (p?: IconProps) => <S {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></S>,
  transfer: (p?: IconProps) => <S {...p}><path d="M4 7h13l-3-3M20 17H7l3 3" /></S>,
  piggy: (p?: IconProps) => <S {...p}><path d="M19 10c.6.5 1 1.2 1 2 0 .6-.2 1.1-.6 1.5l-.4 3.5h-3l-.5-2h-3l-.5 2H9l-.4-3.1A6 6 0 0 1 12 5c3.3 0 6 2.2 6 5Z" /><path d="M9 5 8 3.5M2.5 11H5c0-1 .3-2 .8-2.8" /><path d="M15.5 10h.01" /></S>,
  receipt: (p?: IconProps) => <S {...p}><path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21Z" /><path d="M9 8h6M9 12h6M9 16h4" /></S>,
  target: (p?: IconProps) => <S {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></S>,
};

/* ------------------------------ primitives ------------------------------ */

export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-end justify-between px-1 mb-2.5">
      <h2 className="font-display text-[13px] tracking-[0.16em] text-[var(--ink)]">{title}</h2>
      {action && (
        <button onClick={onAction} className="text-[12px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors flex items-center gap-0.5">
          {action} {I.chevR({ size: 13 })}
        </button>
      )}
    </div>
  );
}

export function Paper({ className = "", children, edge = false, style }: { className?: string; children: ReactNode; edge?: boolean; style?: CSSProperties }) {
  return (
    <div style={style} className={`paper-card ${edge ? "receipt-edge" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Leader({ label, value, strong = false, tone = "ink" }: { label: string; value: ReactNode; strong?: boolean; tone?: "ink" | "green" | "red" }) {
  const color = tone === "green" ? "var(--green)" : tone === "red" ? "var(--red)" : "var(--ink)";
  return (
    <div className="leader py-[5px]">
      <span className="lbl">{label}</span>
      <span className="dots" />
      <span className="val" style={{ color, fontWeight: strong ? 800 : 600, fontSize: strong ? 16 : 13.5 }}>
        {value}
      </span>
    </div>
  );
}

export function SevBadge({ sev, small = false }: { sev: Severity; small?: boolean }) {
  const map: Record<Severity, string> = {
    NORMAL: "var(--green)",
    ATTENTION: "var(--amber)",
    HIGH: "var(--red)",
    CRITICAL: "var(--red)",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-[0.12em] ${small ? "text-[9px]" : "text-[10px]"}`}
      style={{ color: map[sev] }}
    >
      <span className="relative inline-block w-2 h-2 rounded-full pulse-dot" style={{ background: map[sev], color: map[sev] }} />
      {sevLabel[sev]}
    </span>
  );
}

export function Bar({ pct, tone = "ink", h = 8 }: { pct: number; tone?: "ink" | "green" | "amber" | "red"; h?: number }) {
  const color = tone === "green" ? "var(--green)" : tone === "amber" ? "var(--amber)" : tone === "red" ? "var(--red)" : "var(--ink)";
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ background: "var(--paper-2)", height: h, border: "1px solid var(--line)" }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: color }}
      />
    </div>
  );
}

export function Chip({ on, onClick, children }: { on?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`chip ${on ? "on" : ""}`}>
      {children}
    </button>
  );
}

/* --------------------------------- sheet -------------------------------- */

export function Sheet({ open, onClose, title, children, tall = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; tall?: boolean }) {
  const [render, setRender] = useState(open);
  useEffect(() => {
    if (open) setRender(true);
    else {
      const t = setTimeout(() => setRender(false), 200);
      return () => clearTimeout(t);
    }
  }, [open]);
  if (!render) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button aria-label="Fechar" onClick={onClose} className={`absolute inset-0 bg-black/45 anim-fade ${open ? "" : "opacity-0"}`} style={{ transition: "opacity .2s" }} />
      <div className="relative paper-card !rounded-b-none !rounded-t-[20px] flex flex-col anim-sheet" style={{ maxHeight: tall ? "94%" : "88%" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-10 h-1 rounded-full absolute left-1/2 -translate-x-1/2 top-2" style={{ background: "var(--line-strong)" }} />
          <h3 className="font-display text-[14px] tracking-[0.1em] uppercase pt-2">{title}</h3>
          <button onClick={onClose} className="pressable p-2 -mr-2 rounded-full text-[var(--ink-soft)] hover:bg-[var(--paper-2)]" aria-label="Fechar">
            {I.x({ size: 17 })}
          </button>
        </div>
        <div className="overflow-y-auto app-scroll px-5 pb-8 pt-1">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, body, danger = true }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: string; danger?: boolean }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <button aria-label="Cancelar" className="absolute inset-0 bg-black/50 anim-fade" onClick={onClose} />
      <div className="relative paper-card p-5 w-full max-w-[320px] anim-rise">
        <p className="font-display text-[15px] mb-1.5">{title}</p>
        <p className="text-[13.5px] text-[var(--ink-soft)] leading-relaxed mb-4">{body}</p>
        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1 !py-2.5" onClick={onClose}>Cancelar</button>
          <button className={`btn flex-1 !py-2.5 ${danger ? "btn-red" : "btn-ink"}`} onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- toasts -------------------------------- */

export function ToastHost({ toasts }: { toasts: { id: string; text: string; tone: string }[] }) {
  return (
    <div className="absolute bottom-24 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-6 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="anim-rise px-4 py-2.5 rounded-full text-[13px] font-semibold shadow-lg flex items-center gap-2 max-w-full"
          style={{
            background: t.tone === "green" ? "var(--green)" : t.tone === "red" ? "var(--red)" : "var(--ink)",
            color: t.tone === "ink" ? "var(--paper)" : "#fff",
          }}
        >
          {t.tone !== "red" ? I.check({ size: 14 }) : I.alert({ size: 14 })}
          <span className="truncate">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- form bits ------------------------------- */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block mb-3.5">
      <span className="block text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)] mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11.5px] text-[var(--ink-faint)] mt-1">{hint}</span>}
    </label>
  );
}

export function MoneyInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="paper-card !rounded-xl px-4 py-3 flex items-center gap-2 mb-4" style={{ borderColor: "var(--line-strong)" }}>
      <span className="font-mono font-bold text-[17px] text-[var(--ink-soft)]">R$</span>
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        className="flex-1 bg-transparent outline-none font-mono font-extrabold text-[26px] tracking-tight min-w-0"
        style={{ color: "var(--ink)" }}
        value={value === "0.00" ? "" : Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        placeholder="0,00"
        onChange={(e) => onChange(maskMoney(e.target.value))}
      />
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { v: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl p-1 gap-1 mb-4" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className="flex-1 rounded-lg py-2 text-[12.5px] font-bold transition-all duration-200 flex items-center justify-center gap-1.5"
          style={value === o.v ? { background: "var(--ink)", color: "var(--paper)", boxShadow: "0 4px 12px -6px rgba(0,0,0,.4)" } : { color: "var(--ink-soft)" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- reveal -------------------------------- */

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action, onAction }: { icon: ReactNode; title: string; hint?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="paper-card px-6 py-9 text-center">
      <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--paper-2)", color: "var(--ink-soft)" }}>
        {icon}
      </div>
      <p className="font-display text-[14px] mb-1">{title}</p>
      {hint && <p className="text-[13px] text-[var(--ink-soft)] leading-relaxed max-w-[240px] mx-auto">{hint}</p>}
      {action && (
        <button onClick={onAction} className="btn btn-ghost mt-4 !py-2.5 text-[13px]">
          {action}
        </button>
      )}
    </div>
  );
}

export function Dot({ color, size = 9 }: { color: string; size?: number }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: color }} />;
}
