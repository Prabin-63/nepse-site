// ═══════════════════════════════════════════════════════════════════════════
//  PAGE: Learn from Videos — course list
//  Route: /education/videos
// ═══════════════════════════════════════════════════════════════════════════
//
//  PURPOSE
//  -------
//  Show the 4 video courses (Basics, Fundamental, Technical, Smart Money) as
//  a clean numbered list. The user picks one, then we navigate them to
//  /education/videos/:courseId (rendered by VideoCourse.tsx).
//
//  WHY A SEPARATE PAGE
//  -------------------
//  The Education hub (/education) is meant to be quick to scan. Listing every
//  course in full detail there would make it noisy. So we created a dedicated
//  page where each course gets room to breathe.
//
//  KEY CONCEPTS USED
//  -----------------
//    • `useNavigate()`  — change the URL when a card is clicked
//    • `motion.button`  — Framer Motion's animated <button> wrapper
//    • Tailwind grid    — `grid-cols-1` etc. for responsive layout
//    • Reading from the central COURSES data — no hard-coded titles here
// ═══════════════════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  PlayCircle,
  Lock,
  Clock,
  CheckCircle2,
  Crown,
  TrendingUp,
  BookMarked,
  ShieldCheck,
  Calculator,
} from 'lucide-react';
import { COURSES } from '../../data/educationCourses';

// Color → Tailwind class mapping. Same idea as in Education.tsx — we can't
// build dynamic Tailwind class names, so we list them explicitly.
const ACCENT: Record<string, { text: string; bg: string; border: string; gradient: string }> = {
  cyan:   { text: 'text-brand-cyan',   bg: 'bg-brand-cyan/10',   border: 'border-brand-cyan/30',   gradient: 'from-brand-cyan/20 to-brand-cyan/0' },
  gold:   { text: 'text-brand-gold',   bg: 'bg-brand-gold/10',   border: 'border-brand-gold/30',   gradient: 'from-brand-gold/20 to-brand-gold/0' },
  violet: { text: 'text-brand-violet', bg: 'bg-brand-violet/10', border: 'border-brand-violet/30', gradient: 'from-brand-violet/20 to-brand-violet/0' },
  green:  { text: 'text-bull-green',   bg: 'bg-bull-green/10',   border: 'border-bull-green/30',   gradient: 'from-bull-green/20 to-bull-green/0' },
  red:    { text: 'text-bear-red',    bg: 'bg-bear-red/10',     border: 'border-bear-red/30',     gradient: 'from-bear-red/20 to-bear-red/0' },
};

// Icon mapping — string keys in the data file map to actual icon components.
const ICONS: Record<string, any> = {
  'sprout':      TrendingUp,
  'book-open':   BookMarked,
  'line-chart':  TrendingUp,
  'crown':       Crown,
  'shield':      ShieldCheck,
  'calculator':  Calculator,
};

export default function LearnFromVideos() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 pb-10">
      {/* Breadcrumb / back button — clear escape route for nervous users */}
      <button
        onClick={() => navigate('/education')}
        className="flex items-center gap-2 text-sm font-medium text-text-secondary transition hover:text-brand-cyan"
      >
        <ArrowLeft size={16} /> Back to Education Hub
      </button>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-3"
      >
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan">
          Video Library
        </span>
        <h1 className="font-syne text-4xl font-black md:text-5xl">
          Learn from <span className="gradient-text-cyan">Videos</span>
        </h1>
        <p className="font-noto-devanagari text-lg text-text-secondary">
          भिडियो हेर्दै सजिलैसँग सिक्नुहोस्
        </p>
        <p className="max-w-3xl text-base leading-relaxed text-text-secondary md:text-lg">
          Pick a topic to begin. Each course is an ordered playlist — start at the top
          and work your way down. Pause, rewind, re-watch as much as you need.
        </p>
      </motion.div>

      {/* Friendly hint banner */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-4">
        <PlayCircle size={20} className="mt-0.5 shrink-0 text-brand-cyan" />
        <p className="text-sm text-text-secondary md:text-base">
          <strong className="text-text-primary">सुझाव:</strong> If you are new, start with{' '}
          <strong className="text-brand-cyan">Basics About Share Market</strong>. The
          courses get more advanced as you go down.
        </p>
      </div>

      {/* ──────────── Course list ────────────
        We .map() over the COURSES array (imported from data file). Each course
        becomes one big clickable button. Clicking navigates to its detail page.
      */}
      <div className="space-y-4">
        {COURSES.map((course, i) => {
          const c = ACCENT[course.color];
          const Icon = ICONS[course.icon] || PlayCircle;
          const available = course.status === 'available';

          return (
            <motion.button
              key={course.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
              onClick={() => navigate(`/education/videos/${course.id}`)}
              className={`group relative w-full overflow-hidden rounded-2xl border ${c.border} bg-bg-surface p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-2xl md:p-7`}
            >
              {/* Decorative right-side gradient — purely visual */}
              <div className={`pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l ${c.gradient} opacity-50`} />

              <div className="relative z-10 flex flex-col items-start gap-5 md:flex-row md:items-center">
                {/* Number badge + icon (icon hidden on mobile to save space) */}
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl font-syne text-2xl font-black ${c.bg} ${c.text} shrink-0`}>
                    {i + 1}
                  </div>
                  <div className={`hidden h-14 w-14 items-center justify-center rounded-2xl ${c.bg} ${c.text} md:flex shrink-0`}>
                    <Icon size={28} strokeWidth={1.8} />
                  </div>
                </div>

                {/* Title + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-syne text-2xl font-bold md:text-3xl">
                      {course.title}
                    </h2>
                    {available ? (
                      <span className="flex items-center gap-1 rounded-full border border-bull-green/30 bg-bull-green/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-bull-green">
                        <CheckCircle2 size={12} /> Available
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full border border-neutral-yellow/30 bg-neutral-yellow/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-neutral-yellow">
                        <Lock size={12} /> Coming Soon
                      </span>
                    )}
                  </div>

                  {course.titleNepali && (
                    <p className="mt-1 font-noto-devanagari text-base text-text-secondary">
                      {course.titleNepali}
                    </p>
                  )}

                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-secondary">
                    {course.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
                      {course.level}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-text-secondary">
                      <Clock size={14} /> ~{course.estimatedHours} hours
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-text-secondary">
                      <PlayCircle size={14} /> {course.videos.length}{' '}
                      {course.videos.length === 1 ? 'video' : 'videos'}
                    </span>
                  </div>
                </div>

                {/* Right-side CTA */}
                <div className={`shrink-0 font-syne text-base font-bold ${available ? c.text : 'text-text-muted'}`}>
                  <span className="inline-flex items-center gap-1.5 transition-transform group-hover:translate-x-1">
                    {available ? 'Start' : 'Preview'} <ArrowRight size={18} />
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="rounded-xl border border-bg-border bg-bg-surface/60 p-5 text-center">
        <p className="text-sm text-text-secondary">
          More courses, instructors and Nepali subtitles are on the way.
          <br className="hidden md:block" />
          सुझाव छ? <strong className="text-brand-cyan">Use Saarathi AI</strong> to request a topic.
        </p>
      </div>
    </div>
  );
}
