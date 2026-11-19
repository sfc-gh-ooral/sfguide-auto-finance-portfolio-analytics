'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Animated number that counts up when it first renders.
export function CountUp({ value, format, ms = 900 }: { value: number; format: (n: number) => string; ms?: number }) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(value); return; }
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, ms]);
  return <>{format(v)}</>;
}

export function Kpi({ label, value, format, delta, deltaFormat, goodWhenUp = true, icon, accent }: {
  label: string; value: number; format: (n: number) => string; delta?: number; deltaFormat?: (n: number) => string;
  goodWhenUp?: boolean; icon?: ReactNode; accent: string;
}) {
  const up = (delta ?? 0) >= 0;
  const good = up === goodWhenUp;
  return (
    <div className="card card-hover p-4 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-15" style={{ background: accent }} aria-hidden />
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}>{icon}</span>
        {label}
      </div>
      <div className="mt-3 text-[26px] font-bold tabular-nums display"><CountUp value={value} format={format} /></div>
      {delta !== undefined && deltaFormat && (
        <div className="mt-1 text-xs font-semibold flex items-center gap-1" style={{ color: good ? 'var(--good)' : 'var(--coral)' }}>
          {up ? <ArrowUpRight className="w-3.5 h-3.5" aria-hidden /> : <ArrowDownRight className="w-3.5 h-3.5" aria-hidden />}
          {deltaFormat(delta)} <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>vs prior month</span>
        </div>
      )}
    </div>
  );
}

// Speedometer gauge for a 0..1 rate.
export function Gauge({ value, label, sub }: { value: number; label: string; sub?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => { const id = setTimeout(() => setV(value), 80); return () => clearTimeout(id); }, [value]);
  const angle = -120 + 240 * Math.max(0, Math.min(1, v));
  const arc = (from: number, to: number, r: number) => {
    const p = (a: number) => [100 + r * Math.cos(((a - 90) * Math.PI) / 180), 100 + r * Math.sin(((a - 90) * Math.PI) / 180)];
    const [x1, y1] = p(from), [x2, y2] = p(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 150" className="w-full max-w-[240px]" role="img" aria-label={`${label}: ${(value * 100).toFixed(1)}%`}>
        <defs>
          <linearGradient id="g-arc" x1="0" x2="1"><stop offset="0" stopColor="#F2594B" /><stop offset="0.45" stopColor="#F0A20B" /><stop offset="1" stopColor="#9BDB3E" /></linearGradient>
        </defs>
        <path d={arc(-120, 120, 80)} stroke="var(--surface-3)" strokeWidth="16" fill="none" strokeLinecap="round" />
        <path d={arc(-120, 120, 80)} stroke="url(#g-arc)" strokeWidth="16" fill="none" strokeLinecap="round" strokeDasharray="335" strokeDashoffset={335 * (1 - v)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)' }} />
        {Array.from({ length: 11 }, (_, i) => -120 + i * 24).map((a) => {
          const r1 = 62, r2 = 68, rad = ((a - 90) * Math.PI) / 180;
          return <line key={a} x1={100 + r1 * Math.cos(rad)} y1={100 + r1 * Math.sin(rad)} x2={100 + r2 * Math.cos(rad)} y2={100 + r2 * Math.sin(rad)} stroke="var(--text-3)" strokeWidth="1.5" />;
        })}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: 'transform 1.1s cubic-bezier(.2,.7,.2,1)' }}>
          <path d="M 97 100 L 100 34 L 103 100 Z" fill="var(--text)" />
        </g>
        <circle cx="100" cy="100" r="8" fill="var(--ink)" stroke="var(--teal)" strokeWidth="3" />
        <text x="100" y="135" textAnchor="middle" className="display" style={{ fontSize: 22, fontWeight: 700, fill: 'var(--text)' }}>{(v * 100).toFixed(1)}%</text>
      </svg>
      <div className="text-sm font-semibold -mt-1">{label}</div>
      {sub && <div className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  );
}
