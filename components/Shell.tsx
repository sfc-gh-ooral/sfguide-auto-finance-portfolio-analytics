'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CarFront, Gauge, Headset, LayoutGrid, LineChart, Menu, MessageSquareText, Moon, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ModeChip } from './ModeChip';
import { HOSTED_EXAMPLE, REPO } from '@/lib/hosted';

const NAV = [
  { href: '/', label: 'Portfolio overview', icon: LayoutGrid, hint: 'Balances, losses, five stories' },
  { href: '/risk', label: 'Credit & portfolio risk', icon: LineChart, hint: 'Vintages, roll rates, mix' },
  { href: '/collections', label: 'Collections queue', icon: Headset, hint: 'Early delinquency, ranked', ai: true },
  { href: '/dealers', label: 'Dealer performance', icon: CarFront, hint: 'Funnel, FPD, reviews', ai: true },
  { href: '/ask', label: 'Ask the portfolio', icon: MessageSquareText, hint: 'Plain-English questions', ai: true },
];

function useTheme() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const saved = window.localStorage.getItem('afpa-theme');
    const d = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(d);
  }, []);
  useEffect(() => {
    if (dark === null) return;
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  const toggle = () => setDark((d) => { const n = !d; window.localStorage.setItem('afpa-theme', n ? 'dark' : 'light'); return n; });
  return { dark, toggle };
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  useEffect(() => setOpen(false), [path]);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    // Wait out the slide-in transition: links stay visibility:hidden until it ends.
    const t = setTimeout(() => asideRef.current?.querySelector<HTMLElement>('nav a')?.focus(), 200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); menuBtn.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="min-h-screen flex">
      <aside id="app-nav" ref={asideRef} className={`fixed inset-y-0 left-0 z-40 w-[260px] max-w-[85vw] overflow-y-auto flex flex-col transition-transform lg:translate-x-0 lg:visible ${open ? 'translate-x-0' : '-translate-x-full invisible'}`}
        style={{ background: 'var(--grad-ink)', color: '#DCEBE6' }}>
        <div className="px-5 pt-6 pb-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center grad-bar shadow-lg"><Gauge className="w-5 h-5" style={{ color: '#062019' }} aria-hidden /></span>
            <span>
              <span className="block text-[17px] font-bold tracking-tight text-white display">Odometer</span>
              <span className="block text-[11px]" style={{ color: '#8FB3AA' }}>Auto finance portfolio analytics</span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon, hint, ai }) => {
            const on = active(href);
            return (
              <Link key={href} href={href} aria-current={on ? 'page' : undefined}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={on ? { background: 'rgba(155,219,62,0.12)', color: '#fff', boxShadow: 'inset 3px 0 0 #9BDB3E' } : { color: '#A9C4BC' }}>
                <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: on ? '#9BDB3E' : undefined }} aria-hidden />
                <span className="flex-1">
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-[11px] opacity-70 group-hover:opacity-100">{hint}</span>
                </span>
                {ai && <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(0,163,150,0.25)', color: '#7BE8DC' }}>AI</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 m-3 rounded-2xl text-[11px] leading-relaxed" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9DB9B1' }}>
          <div className="font-semibold text-white mb-1">Synthetic example</div>
          Illustrative data and logic only. Not production, credit, collections, regulatory, or compliance advice.
          <a href={REPO} target="_blank" rel="noreferrer" className="block mt-2 underline underline-offset-2" style={{ color: '#9BDB3E' }}>View the repository</a>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <div className="flex-1 lg:ml-[260px] min-w-0">
        <header className="sticky top-0 z-20 glass border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="px-4 sm:px-8 py-2.5 flex items-center gap-3">
            <button ref={menuBtn} className="lg:hidden btn !p-2" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="app-nav" aria-label={open ? 'Close navigation' : 'Open navigation'}>{open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}</button>
            <p className="flex-1 text-xs truncate" style={{ color: 'var(--text-3)' }}>
              {HOSTED_EXAMPLE
                ? <><strong style={{ color: 'var(--text)' }}>Hosted example, Sample mode.</strong> Runs in your browser on synthetic data; AI answers are captured samples.</>
                : <>Synthetic auto finance data, Nov 2024 to Oct 2026. Illustrative only.</>}
            </p>
            <button className="btn !p-2" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <ModeChip />
          </div>
        </header>
        <main className="px-4 sm:px-8 py-7 max-w-[1440px]">{children}</main>
      </div>
    </div>
  );
}
