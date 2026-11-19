'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ResultTable } from '@/lib/types';
import { fmtInt, fmtMonth, fmtPct, fmtUsd } from '@/lib/utils';

// Picks a sensible chart for an Analyst result set: the first text/date column is the axis,
// the last numeric column is the measure.
export function valueFormatter(col: string, values: number[]): (n: number) => string {
  const c = col.toUpperCase();
  if (/AMOUNT|FUNDED_AMOUNT|VOLUME|FUNDED$/.test(c) && Math.max(...values) > 10000) return (n) => fmtUsd(n);
  if (/RATE|SHARE|L2B|DPD|APPROVAL|DECLINE/.test(c) && Math.max(...values) <= 1.0001) return (n) => fmtPct(n);
  if (/APR/.test(c)) return (n) => `${n.toFixed(2)}%`;
  if (/MINUTE/.test(c)) return (n) => `${n.toFixed(1)} min`;
  return (n) => (Number.isInteger(n) ? fmtInt(n) : n.toFixed(2));
}

export function labelOf(v: unknown): string {
  const s = String(v ?? '');
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return fmtMonth(s.slice(0, 7));
  if (s === 'true') return 'Weekend';
  if (s === 'false') return 'Weekday';
  return s;
}

export function ResultChart({ result, kind }: { result: ResultTable; kind?: 'bar' | 'line' | 'none' }) {
  if (!result.rows.length || result.columns.length < 2) return null;
  const yIdx = result.columns.length - 1;
  const data = result.rows.map((r) => ({ x: labelOf(r[0]), y: Number(r[yIdx]) }));
  if (data.some((d) => !Number.isFinite(d.y))) return null;
  const fmt = valueFormatter(result.columns[yIdx], data.map((d) => d.y));
  const asLine = kind === 'line' || (kind === undefined && /^\d{4}-\d{2}/.test(String(result.rows[0][0])));
  if (kind === 'none') return null;
  const common = { data, margin: { top: 8, right: 12, left: 4, bottom: 0 } };
  const horizontal = !asLine && (data.length > 6 || Math.max(...data.map((d) => d.x.length)) > 14);
  return (
    <div style={{ height: horizontal ? Math.max(200, data.length * 30 + 30) : 230 }}>
      <ResponsiveContainer>
        {asLine ? (
          <LineChart {...common}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="x" tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} tickFormatter={fmt} width={62} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Line type="monotone" dataKey="y" name={result.columns[yIdx]} stroke="#00A396" strokeWidth={3} dot={{ r: 2.5 }} />
          </LineChart>
        ) : horizontal ? (
          <BarChart {...common} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
            <defs><linearGradient id="g-hbar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#00A396" /><stop offset="1" stopColor="#9BDB3E" /></linearGradient></defs>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={fmt} />
            <YAxis type="category" dataKey="x" tickLine={false} axisLine={false} width={190} interval={0} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Bar dataKey="y" name={result.columns[yIdx]} fill="url(#g-hbar)" radius={[0, 8, 8, 0]} maxBarSize={22} />
          </BarChart>
        ) : (
          <BarChart {...common}>
            <defs><linearGradient id="g-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00A396" /><stop offset="1" stopColor="#9BDB3E" /></linearGradient></defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="x" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: data.length > 6 ? 9 : 11 }} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={fmt} width={62} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Bar dataKey="y" name={result.columns[yIdx]} fill="url(#g-bar)" radius={[8, 8, 0, 0]} maxBarSize={56} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function ResultTableView({ result }: { result: ResultTable }) {
  const yIdx = result.columns.length - 1;
  const nums = result.rows.map((r) => Number(r[yIdx])).filter(Number.isFinite);
  const fmt = nums.length ? valueFormatter(result.columns[yIdx], nums) : (n: number) => String(n);
  return (
    <div className="max-h-[260px] overflow-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <table className="table">
        <thead><tr>{result.columns.map((c) => <th key={c}>{c.replace(/_/g, ' ')}</th>)}</tr></thead>
        <tbody>
          {result.rows.map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j} className={j === yIdx ? 'tabular-nums font-semibold' : ''}>{j === yIdx && Number.isFinite(Number(v)) ? fmt(Number(v)) : labelOf(v)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
