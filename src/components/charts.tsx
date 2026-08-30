// Lightweight hand-rolled SVG charts — always rendered next to real numbers.

import { useEffect, useState } from "react";

export interface Slice {
  label: string;
  value: number;
  color: string;
}

export function Donut({ slices, size = 168, thickness = 22, centerTop, centerBottom }: { slices: Slice[]; size?: number; thickness?: number; centerTop: string; centerBottom?: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnim(1));
    return () => cancelAnimationFrame(t);
  }, []);
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--paper-2)" strokeWidth={thickness} />
      {slices.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * c * anim;
        const off = -acc * c;
        acc += frac;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={off}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dasharray .8s cubic-bezier(.2,.7,.2,1)", strokeLinecap: "butt" }}
          />
        );
      })}
      <text x="50%" y="47%" textAnchor="middle" className="font-mono" style={{ fontSize: 16, fontWeight: 800, fill: "var(--ink)" }}>
        {centerTop}
      </text>
      {centerBottom && (
        <text x="50%" y="60%" textAnchor="middle" style={{ fontSize: 9.5, fontWeight: 700, fill: "var(--ink-soft)", letterSpacing: "0.1em", textTransform: "uppercase" } as never}>
          {centerBottom}
        </text>
      )}
    </svg>
  );
}

export function GroupedBars({ data, aLabel, bLabel, height = 150 }: { data: { label: string; a: number; b: number }[]; aLabel: string; bLabel: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnim(1));
    return () => cancelAnimationFrame(t);
  }, []);
  const bw = 10;
  const group = 44;
  const w = data.length * group;
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${height + 22}`} style={{ height: height + 22 }}>
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <line key={p} x1={0} x2={w} y1={height - height * p} y2={height - height * p} stroke="var(--line)" strokeDasharray="3 4" />
        ))}
        {data.map((d, i) => {
          const x = i * group + group / 2;
          const ha = (d.a / max) * height * anim;
          const hb = (d.b / max) * height * anim;
          return (
            <g key={i}>
              <rect x={x - bw - 2} y={height - ha} width={bw} height={Math.max(2, ha)} rx={3} fill="var(--green)" style={{ transition: "height .7s ease, y .7s ease" }} />
              <rect x={x + 2} y={height - hb} width={bw} height={Math.max(2, hb)} rx={3} fill="var(--red)" opacity={0.85} style={{ transition: "height .7s ease, y .7s ease" }} />
              <text x={x} y={height + 14} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: "var(--ink-soft)" }}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 mt-1 px-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink-soft)]">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--green)" }} /> {aLabel}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink-soft)]">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--red)", opacity: 0.85 }} /> {bLabel}
        </span>
      </div>
    </div>
  );
}

export function AreaLine({ points, labels, height = 140, color = "var(--green)", unit }: { points: number[]; labels: string[]; height?: number; color?: string; unit?: string }) {
  const max = Math.max(1, ...points);
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnim(1));
    return () => cancelAnimationFrame(t);
  }, []);
  const w = 300;
  const h = height;
  const step = w / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => [i * step, h - (p / max) * (h - 18)]);
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  const gid = `g-${color.replace(/[^a-z]/gi, "")}`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 20}`} style={{ height: h + 20 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.33, 0.66, 1].map((p) => (
        <line key={p} x1={0} x2={w} y1={h - h * p * 0.92} y2={h - h * p * 0.92} stroke="var(--line)" strokeDasharray="3 4" />
      ))}
      <path d={area} fill={`url(#${gid})`} opacity={anim} style={{ transition: "opacity .9s ease" }} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeDasharray={600}
        strokeDashoffset={600 - 600 * anim}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)" }}
      />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c[0]} cy={c[1]} r={i === coords.length - 1 ? 4 : 2.6} fill={color} opacity={anim} />
          <text x={c[0]} y={h + 14} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: "var(--ink-soft)" }}>
            {labels[i]}
          </text>
          {unit && i === coords.length - 1 && (
            <text x={Math.min(w - 4, c[0])} y={c[1] - 9} textAnchor="end" className="font-mono" style={{ fontSize: 10.5, fontWeight: 800, fill: color }}>
              {unit}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function MiniBars({ values, labels, color = "var(--ink)", height = 70, format }: { values: number[]; labels: string[]; color?: string; height?: number; format?: (v: number) => string }) {
  const max = Math.max(1, ...values);
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnim(1));
    return () => cancelAnimationFrame(t);
  }, []);
  const group = 46;
  const w = values.length * group;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height + 18}`} style={{ height: height + 18 }}>
      {values.map((v, i) => {
        const bh = (v / max) * height * anim;
        const x = i * group + group / 2 - 9;
        const last = i === values.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={height - bh} width={18} height={Math.max(2, bh)} rx={4} fill={last ? color : "var(--line-strong)"} style={{ transition: "height .7s ease, y .7s ease" }} />
            {format && last && (
              <text x={x + 9} y={height - bh - 5} textAnchor="middle" className="font-mono" style={{ fontSize: 9.5, fontWeight: 800, fill: color }}>
                {format(v)}
              </text>
            )}
            <text x={x + 9} y={height + 13} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: "var(--ink-soft)" }}>
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
