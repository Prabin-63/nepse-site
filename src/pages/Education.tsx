// ═══════════════════════════════════════════════════════════════════════════
//  PAGE: Education Hub — landing page
//  Route: /education
// ═══════════════════════════════════════════════════════════════════════════
//
//  WHAT THIS PAGE DOES
//  -------------------
//  This is the FIRST page a learner sees. Its job is to:
//    1. Welcome them with a clear hero (no jargon)
//    2. Offer 3 clear learning paths — Videos / Glossary / Saarathi AI
//    3. Explain why this academy is built for Nepal
//    4. Provide a quick glossary of must-know NEPSE terms
//
//  DESIGN PRINCIPLES (for older traders)
//  -------------------------------------
//    • Big readable text (>=16px body, >=24px headings)
//    • High contrast colors, generous spacing
//    • Bilingual labels (English + Devanagari Nepali)
//    • Each clickable item has BOTH an icon AND a text label
//    • Only ONE primary action per section
//
//  HOW IT'S BUILT
//  --------------
//    • Tailwind CSS for all styling (utility-first classes like `text-2xl`)
//    • Framer Motion for entrance animations (`motion.section`)
//    • Lucide React for crisp SVG icons
//    • react-router's `useNavigate()` to move between pages
// ═══════════════════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlayCircle,
  Library,
  MessageCircleQuestion,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  Volume2,
  ArrowRight,
} from 'lucide-react';
import { COURSES } from '../data/educationCourses';

// ─────────────────────────────────────────────────────────────────────────────
//  ACCENT MAP
//  Tailwind can't generate classes from dynamic strings at build time, so we
//  pre-declare every color combination we use. The data file's `color: 'cyan'`
//  is then looked up here. This keeps the data file clean and the UI flexible.
// ─────────────────────────────────────────────────────────────────────────────
const ACCENT: Record<string, { text: string; bg: string; border: string }> = {
  cyan:   { text: 'text-brand-cyan',   bg: 'bg-brand-cyan/10',   border: 'border-brand-cyan/30' },
  gold:   { text: 'text-brand-gold',   bg: 'bg-brand-gold/10',   border: 'border-brand-gold/30' },
  violet: { text: 'text-brand-violet', bg: 'bg-brand-violet/10', border: 'border-brand-violet/30' },
  green:  { text: 'text-bull-green',   bg: 'bg-bull-green/10',   border: 'border-bull-green/30' },
};

// ─────────────────────────────────────────────────────────────────────────────
//  ANIMATION VARIANTS
//  Define entrance motion once, reuse on multiple elements. Each child gets
//  a small delay so cards "stagger in" rather than popping all at once.
// ─────────────────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45 },
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function Education() {
  // useNavigate gives us a function to change the URL programmatically.
  // We use it on button clicks to move to /education/videos, etc.
  const navigate = useNavigate();

  // The 3 learning paths shown on the hub. Each is a small object so the
  // JSX below stays readable — it just maps over this array.
  const paths = [
    {
      icon: PlayCircle,
      title: 'Learn from Videos',
      titleNp: 'भिडियोबाट सिक्नुहोस्',
      desc: `${COURSES.length} curated courses — Basics, Fundamentals, Technical & Smart Money Concept.`,
      action: 'Start watching',
      color: 'cyan',
      featured: true,
      onClick: () => navigate('/education/videos'),
    },
    {
      icon: Library,
      title: 'Glossary',
      titleNp: 'शब्दकोश',
      desc: 'Quick plain-language definitions of every NEPSE term you will meet.',
      action: 'Open glossary',
      color: 'violet',
      onClick: () => document.getElementById('glossary')?.scrollIntoView({ behavior: 'smooth' }),
    },
    {
      icon: MessageCircleQuestion,
      title: 'Ask Saarathi AI',
      titleNp: 'सारथी एआई',
      desc: 'Your personal Nepali/English tutor. Ask anything about the market, 24×7.',
      action: 'Open chat',
      color: 'green',
      onClick: () => {
        // Saarathi chat opens via a hidden trigger button planted in the layout.
        const btn = document.querySelector('[data-saarathi-trigger]') as HTMLButtonElement | null;
        btn?.click();
      },
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* ═════════════ HERO ═════════════ */}
      {/*
        The hero uses a soft gradient + glow blobs for a premium feel without
        being noisy. Heading is large (text-4xl→6xl) so it's easy to read.
      */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-brand-cyan/20 bg-gradient-to-br from-brand-cyan/10 via-brand-violet/10 to-bg-surface p-8 md:p-12"
      >
        {/* Background glow blobs (decoration only, not clickable) */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-cyan/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-brand-violet/20 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/40 bg-bg-base/60 px-4 py-1.5 backdrop-blur">
            <Sparkles size={16} className="text-brand-cyan" />
            <span className="text-sm font-semibold tracking-wide text-brand-cyan">
              NEPSE Elite Academy
            </span>
          </div>

          <h1 className="font-syne text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
            Learn to invest in <span className="gradient-text-cyan">Nepal&apos;s</span>
            <br />
            stock market — the right way.
          </h1>

          <p className="font-noto-devanagari text-lg text-text-secondary md:text-xl">
            शिक्षाबाट सुरु, अनुशासनले निरन्तर, अनुभवले सफल।
          </p>

          <p className="max-w-xl text-base leading-relaxed text-text-secondary md:text-lg">
            Clear lessons. Plain language. Real Nepali examples. From your first share
            to Smart Money Concept.
          </p>

          {/* Single primary CTA — clear "what do I do next" for new visitors */}
          <button
            onClick={() => navigate('/education/videos')}
            className="group inline-flex items-center gap-2 rounded-full bg-brand-cyan px-7 py-3.5 text-base font-bold text-bg-base shadow-glow-cyan transition-all hover:scale-[1.03] active:scale-95"
          >
            <PlayCircle size={20} /> Start Learning
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </motion.section>

      {/* ═════════════ LEARNING PATHS (3 cards) ═════════════ */}
      {/*
        Only 3 paths — Videos (the main one, full width on small screens),
        Glossary, and Saarathi AI. Removed the duplicate "course preview"
        section that used to live here — that content is on /education/videos.
      */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Choose your path"
          title="How would you like to learn?"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {paths.map((p, i) => {
            const Icon = p.icon;
            const c = ACCENT[p.color];
            return (
              <motion.button
                key={p.title}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                onClick={p.onClick}
                className={`group flex flex-col items-start gap-4 rounded-2xl border ${c.border} bg-bg-surface p-6 text-left transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-[0.99] ${
                  p.featured ? 'md:col-span-3 md:flex-row md:items-center' : ''
                }`}
              >
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${c.bg} ${c.text}`}>
                  <Icon size={28} strokeWidth={1.8} />
                </div>

                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="font-syne text-xl font-bold text-text-primary md:text-2xl">
                      {p.title}
                    </h3>
                    <p className="font-noto-devanagari text-sm text-text-secondary">
                      {p.titleNp}
                    </p>
                  </div>
                  <p className="text-base text-text-secondary">{p.desc}</p>
                </div>

                <div className={`inline-flex items-center gap-1.5 text-base font-bold ${c.text} transition-transform group-hover:translate-x-1`}>
                  {p.action} <ArrowRight size={18} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ═════════════ WHY LEARN HERE (3 pillars) ═════════════ */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: Lightbulb,   title: 'Plain language', titleNp: 'सरल भाषा',  desc: 'No confusing jargon. Every concept explained like a teacher would.', color: 'gold' },
          { icon: ShieldCheck, title: 'Made for Nepal', titleNp: 'नेपालकै लागि', desc: 'Real NEPSE stocks, real brokers, real Nepali rules — not foreign markets.', color: 'cyan' },
          { icon: Volume2,     title: 'Watch & listen', titleNp: 'हेर्न र सुन्न', desc: 'Pause, rewind, re-watch — learn at your own pace, as many times as you like.', color: 'violet' },
        ].map((b, i) => {
          const Icon = b.icon;
          const c = ACCENT[b.color];
          return (
            <motion.div
              key={b.title}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-2xl border border-bg-border bg-bg-surface p-6"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} ${c.text}`}>
                <Icon size={24} />
              </div>
              <h4 className="font-syne text-xl font-bold">{b.title}</h4>
              <p className="font-noto-devanagari text-sm text-text-secondary">{b.titleNp}</p>
              <p className="mt-3 text-base leading-relaxed text-text-secondary">{b.desc}</p>
            </motion.div>
          );
        })}
      </section>

      {/* ═════════════ GLOSSARY ═════════════ */}
      {/* `id="glossary"` lets the "Glossary" path card scroll the user here. */}
      <section id="glossary" className="space-y-4">
        <SectionHeader
          eyebrow="Reference"
          title="Quick Glossary"
          subtitle="The terms every NEPSE investor must know."
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {GLOSSARY.map((g) => (
            <div
              key={g.term}
              className="rounded-xl border border-bg-border bg-bg-surface p-4 transition hover:border-brand-cyan/40"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-syne text-lg font-bold text-brand-cyan">{g.term}</span>
                {g.termNp && (
                  <span className="font-noto-devanagari text-xs text-text-muted">{g.termNp}</span>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{g.def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═════════════ DISCLAIMER ═════════════ */}
      <div className="rounded-xl border border-bg-border bg-bg-surface/60 p-5 text-center">
        <p className="text-sm text-text-secondary">
          <strong className="text-text-primary">शिक्षा मात्र हो, सल्लाह होइन।</strong>{' '}
          Content here is for education only — not investment advice. Always do your own
          research and consult a SEBON-registered advisor before investing.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENT: SectionHeader
//  A small reusable header (eyebrow + title + optional subtitle).
//  Keeping it inside this file because it's only used here.
// ═══════════════════════════════════════════════════════════════════════════
function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan">
        {eyebrow}
      </span>
      <h2 className="font-syne text-3xl font-black md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-0.5 text-base text-text-secondary">{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  GLOSSARY DATA
//  Kept inline since this is the only place that uses it. If it grows large,
//  move it to a separate file (e.g. src/data/glossary.ts) like we did for
//  educationCourses.ts.
// ─────────────────────────────────────────────────────────────────────────────
const GLOSSARY = [
  { term: 'LTP',        termNp: 'अन्तिम मूल्य',           def: 'Last Traded Price — the most recent price at which a stock was bought or sold today.' },
  { term: 'EPS',        termNp: 'प्रति सेयर आम्दानी',     def: 'Earnings Per Share — net profit of the company divided by total number of shares.' },
  { term: 'P/E',        termNp: 'मूल्य-आम्दानी अनुपात',    def: 'Price-to-Earnings ratio — how many rupees you pay for every rupee of company profit.' },
  { term: 'BOID',       termNp: 'बेनिफिसियल ओनर आईडी',    def: 'Beneficial Owner Identification — your unique 16-digit ID to hold shares in demat form.' },
  { term: 'CGT',        termNp: 'पुँजीगत लाभकर',         def: 'Capital Gains Tax — 7.5% on profits if sold within 365 days, 5% if held longer (for individuals).' },
  { term: 'IPO',        termNp: 'प्रारम्भिक सार्वजनिक निष्कासन', def: 'Initial Public Offering — when a company sells shares to the public for the first time.' },
  { term: 'T+3',        termNp: 'टी प्लस ३',             def: 'Settlement cycle — shares appear in your Demat account 3 working days after you buy them.' },
  { term: 'NAV',        termNp: 'नेट एसेट भ्यालू',        def: 'Net Asset Value — the per-unit value of a mutual fund. Used to price MF buy/sell.' },
  { term: 'Floorsheet', termNp: 'फ्लोरसिट',              def: "NEPSE's daily record of every single trade — buyer broker, seller broker, stock, price and quantity." },
];
