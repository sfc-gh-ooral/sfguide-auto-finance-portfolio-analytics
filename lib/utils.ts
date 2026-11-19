import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtPct = (r: number, d = 1) => `${(r * 100).toFixed(d)}%`;
export function fmtUsd(n: number, compact = true): string {
  if (!compact) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
export function fmtMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}
export const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
export const div = (a: number, b: number) => (b ? a / b : 0);
export function fmtMonthLong(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
