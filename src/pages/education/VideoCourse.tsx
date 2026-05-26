// ═══════════════════════════════════════════════════════════════════════════
//  PAGE: Video Course — player + playlist
//  Route: /education/videos/:courseId
// ═══════════════════════════════════════════════════════════════════════════
//
//  PURPOSE
//  -------
//  Show one course's lessons. The user picks a lesson from the right-side
//  playlist, the YouTube embed on the left plays it. Progress is saved in
//  localStorage so they can resume later.
//
//  REACT CONCEPTS DEMONSTRATED HERE
//  --------------------------------
//    • `useParams()`   — read the `:courseId` from the URL
//    • `useState()`    — track which lesson is active, which are watched
//    • `useEffect()`   — reset to lesson 0 when the course changes
//    • Conditional rendering — show player or "Coming soon" or "Not found"
//    • Side-effects (localStorage) wrapped in try/catch for safety
//
//  HANDLING PLACEHOLDER VIDEOS
//  ---------------------------
//  Some videos in the data file have `youtubeId: ''`. That means the lesson
//  is planned but the YouTube link hasn't been added yet. We detect this and
//  show a friendly "Link coming soon" message instead of a broken player.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
  Users,
  Award,
  AlertCircle,
  ListVideo,
  Sparkles,
  Hourglass,
} from 'lucide-react';
import { getCourse } from '../../data/educationCourses';

const ACCENT: Record<string, { text: string; bg: string; border: string; bgSolid: string }> = {
  cyan:   { text: 'text-brand-cyan',   bg: 'bg-brand-cyan/10',   border: 'border-brand-cyan/40',   bgSolid: 'bg-brand-cyan' },
  gold:   { text: 'text-brand-gold',   bg: 'bg-brand-gold/10',   border: 'border-brand-gold/40',   bgSolid: 'bg-brand-gold' },
  violet: { text: 'text-brand-violet', bg: 'bg-brand-violet/10', border: 'border-brand-violet/40', bgSolid: 'bg-brand-violet' },
  green:  { text: 'text-bull-green',   bg: 'bg-bull-green/10',   border: 'border-bull-green/40',   bgSolid: 'bg-bull-green' },
  red:    { text: 'text-bear-red',    bg: 'bg-bear-red/10',     border: 'border-bear-red/40',     bgSolid: 'bg-bear-red' },
};

// ─────────────────────────────────────────────────────────────────────────────
//  LOCALSTORAGE HELPERS
//  We persist the "watched" lesson IDs in the browser so progress survives
//  page reloads. Wrapped in try/catch because localStorage can be disabled
//  (private browsing, quota errors, etc.) — we never want to crash the page.
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'nepse-elite:watched-videos';

function getWatched(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveWatched(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Silent fail — losing progress is annoying but not catastrophic.
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function VideoCourse() {
  // 1. Read the courseId from the URL (e.g. "smart-money")
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // 2. Look up the course object from our central data file
  const course = courseId ? getCourse(courseId) : undefined;

  // 3. Local UI state
  const [activeIdx, setActiveIdx] = useState(0);
  const [watched, setWatched] = useState<Set<string>>(() => getWatched());

  // 4. When the courseId changes (user navigates from one course to another),
  //    reset to lesson 0 and scroll to top. Otherwise they'd see lesson 5 of
  //    the new course because activeIdx was stale.
  useEffect(() => {
    setActiveIdx(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [courseId]);

  // ─── Edge case: invalid course id in URL ───
  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle size={48} className="text-bear-red" />
        <h2 className="mt-4 font-syne text-2xl font-bold">Course not found</h2>
        <p className="mt-2 text-text-secondary">
          The course you are looking for doesn&apos;t exist.
        </p>
        <button
          onClick={() => navigate('/education/videos')}
          className="btn-primary mt-6 px-6 py-2.5"
        >
          Back to courses
        </button>
      </div>
    );
  }

  // ─── Derived values from course ───
  const c = ACCENT[course.color];
  const hasVideos = course.videos.length > 0;
  const activeVideo = hasVideos ? course.videos[activeIdx] : null;
  // A "playable" video has a real YouTube ID. Empty string = placeholder.
  const isPlayable = !!activeVideo?.youtubeId;

  const toggleWatched = (videoId: string) => {
    const next = new Set(watched);
    if (next.has(videoId)) next.delete(videoId);
    else next.add(videoId);
    setWatched(next);
    saveWatched(next);
  };

  const watchedCount = course.videos.filter((v) => watched.has(v.id)).length;
  const progress = hasVideos ? Math.round((watchedCount / course.videos.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button onClick={() => navigate('/education')} className="text-text-secondary transition hover:text-brand-cyan">
          Education
        </button>
        <span className="text-text-muted">/</span>
        <button onClick={() => navigate('/education/videos')} className="text-text-secondary transition hover:text-brand-cyan">
          Learn from Videos
        </button>
        <span className="text-text-muted">/</span>
        <span className={`font-semibold ${c.text}`}>{course.title}</span>
      </div>

      {/* ──────── Course Header ──────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-6 md:p-8`}
      >
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-current opacity-10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            {/* Meta pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full ${c.bg} ${c.text} border ${c.border} px-3 py-1 text-xs font-bold uppercase tracking-wider`}>
                {course.level}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-bg-border bg-bg-base/60 px-3 py-1 text-xs font-medium text-text-secondary">
                <Clock size={12} /> ~{course.estimatedHours} hours
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-bg-border bg-bg-base/60 px-3 py-1 text-xs font-medium text-text-secondary">
                <PlayCircle size={12} /> {course.videos.length} videos
              </span>
            </div>

            <h1 className="font-syne text-3xl font-black md:text-4xl">{course.title}</h1>
            {course.titleNepali && (
              <p className="font-noto-devanagari text-base text-text-secondary md:text-lg">
                {course.titleNepali}
              </p>
            )}
            <p className={`text-base font-semibold ${c.text}`}>{course.tagline}</p>
            <p className="max-w-3xl text-sm leading-relaxed text-text-secondary md:text-base">
              {course.description}
            </p>
          </div>

          {/* Progress card on the right */}
          {hasVideos && (
            <div className="min-w-[180px] rounded-xl border border-bg-border bg-bg-base/60 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-text-secondary">
                <Award size={14} /> Your Progress
              </div>
              <div className={`mt-2 font-syne text-3xl font-black ${c.text}`}>{progress}%</div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-border">
                <div className={`h-full ${c.bgSolid} transition-all duration-500`} style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 text-xs text-text-secondary">
                {watchedCount} of {course.videos.length} watched
              </div>
            </div>
          )}
        </div>

        {/* What you'll learn list */}
        {course.whatYouLearn && course.whatYouLearn.length > 0 && (
          <div className="relative z-10 mt-6 rounded-xl border border-bg-border bg-bg-base/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className={c.text} />
              <h3 className="font-syne text-sm font-bold uppercase tracking-wider">
                What you&apos;ll learn
              </h3>
            </div>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {course.whatYouLearn.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary md:text-base">
                  <CheckCircle2 size={18} className={`${c.text} mt-0.5 shrink-0`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.section>

      {/* ──────── Player + Playlist ──────── */}
      {hasVideos && activeVideo ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* ─── Player column ─── */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-bg-border bg-bg-base shadow-card">
              <div className="relative aspect-video w-full bg-black">
                {isPlayable ? (
                  // Real YouTube embed.
                  // `key` forces React to re-create the iframe when video changes
                  // (otherwise YouTube sometimes keeps playing the old video).
                  <iframe
                    key={activeVideo.youtubeId}
                    src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?rel=0&modestbranding=1`}
                    title={activeVideo.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                ) : (
                  // Placeholder (video not added yet) — friendly empty state.
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <Hourglass size={48} className={c.text} />
                    <p className="font-syne text-xl font-bold text-text-primary">
                      Video link coming soon
                    </p>
                    <p className="max-w-md text-sm text-text-secondary">
                      The instructor is preparing this lesson. Try the lessons above —
                      they are ready to watch now.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Lesson detail card. AnimatePresence does a small fade when
                the user switches lessons — gives a polished feel. */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeVideo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-bg-border bg-bg-surface p-5 md:p-6"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full ${c.bg} ${c.text} px-2.5 py-0.5 font-bold uppercase tracking-wider`}>
                    Lesson {activeIdx + 1}
                  </span>
                  {activeVideo.duration && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-bg-border bg-bg-base/60 px-2.5 py-0.5 text-text-secondary">
                      <Clock size={12} /> {activeVideo.duration}
                    </span>
                  )}
                  {activeVideo.level && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-bg-border bg-bg-base/60 px-2.5 py-0.5 text-text-secondary">
                      {activeVideo.level}
                    </span>
                  )}
                </div>

                <h2 className="mt-3 font-syne text-2xl font-bold md:text-3xl">
                  {activeVideo.title}
                </h2>
                {activeVideo.titleNepali && (
                  <p className="mt-1 font-noto-devanagari text-base text-text-secondary">
                    {activeVideo.titleNepali}
                  </p>
                )}

                {(activeVideo.instructor || activeVideo.channel) && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                    {activeVideo.instructor && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={14} className={c.text} />
                        <strong className="text-text-primary">{activeVideo.instructor}</strong>
                      </span>
                    )}
                    {activeVideo.channel && <span>· {activeVideo.channel}</span>}
                  </div>
                )}

                {activeVideo.description && (
                  <p className="mt-4 text-sm leading-relaxed text-text-secondary md:text-base">
                    {activeVideo.description}
                  </p>
                )}

                {/* Action row */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleWatched(activeVideo.id)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                      watched.has(activeVideo.id)
                        ? 'border-bull-green/40 bg-bull-green/10 text-bull-green'
                        : 'border-bg-border bg-bg-base text-text-secondary hover:border-brand-cyan/40 hover:text-text-primary'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    {watched.has(activeVideo.id) ? 'Marked as watched' : 'Mark as watched'}
                  </button>

                  {isPlayable && (
                    <a
                      href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full border border-bg-border bg-bg-base px-4 py-2 text-sm font-bold text-text-secondary transition hover:border-brand-cyan/40 hover:text-text-primary"
                    >
                      <ExternalLink size={16} /> Open in YouTube
                    </a>
                  )}

                  {activeIdx < course.videos.length - 1 && (
                    <button
                      onClick={() => setActiveIdx(activeIdx + 1)}
                      className={`ml-auto flex items-center gap-2 rounded-full ${c.bgSolid} px-5 py-2 text-sm font-bold text-bg-base hover:brightness-110`}
                    >
                      Next Lesson →
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ─── Playlist column ─── */}
          <aside className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-bg-border bg-bg-surface px-4 py-3">
              <div className="flex items-center gap-2">
                <ListVideo size={18} className={c.text} />
                <h3 className="font-syne font-bold">Course Playlist</h3>
              </div>
              <span className="text-xs text-text-secondary">
                {watchedCount}/{course.videos.length}
              </span>
            </div>

            <ol className="space-y-2">
              {course.videos.map((v, i) => {
                const isActive = i === activeIdx;
                const isWatched = watched.has(v.id);
                const isPending = !v.youtubeId; // placeholder lesson

                return (
                  <li key={v.id}>
                    <button
                      onClick={() => setActiveIdx(i)}
                      className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                        isActive
                          ? `${c.border} ${c.bg} shadow-card`
                          : 'border-bg-border bg-bg-surface hover:border-brand-cyan/30 hover:bg-bg-elevated/60'
                      }`}
                    >
                      {/* Left badge: shows checkmark if watched, hourglass if pending, else lesson number */}
                      <div
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-syne text-base font-black ${
                          isActive
                            ? `${c.bgSolid} text-bg-base`
                            : isWatched
                            ? 'bg-bull-green/15 text-bull-green'
                            : isPending
                            ? 'bg-bg-base text-text-muted'
                            : 'bg-bg-base text-text-secondary'
                        }`}
                      >
                        {isPending && !isActive ? (
                          <Hourglass size={18} />
                        ) : isWatched && !isActive ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          i + 1
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className={`line-clamp-2 text-sm font-semibold leading-snug ${isActive ? c.text : 'text-text-primary'}`}>
                          {v.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
                          {isPending ? (
                            <span className="text-text-muted">Coming soon</span>
                          ) : (
                            <>
                              {v.duration && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock size={10} /> {v.duration}
                                </span>
                              )}
                              {v.instructor && <span className="truncate">· {v.instructor}</span>}
                            </>
                          )}
                        </div>
                      </div>

                      {isActive && isPlayable && (
                        <PlayCircle size={18} className={`${c.text} shrink-0 animate-pulse`} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      ) : (
        // Whole course is "Coming Soon" — no videos at all yet.
        <ComingSoonPanel courseColor={course.color} courseTitle={course.title} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENT: ComingSoonPanel
//  Shown when a course exists but has zero videos in the data file yet.
// ═══════════════════════════════════════════════════════════════════════════
function ComingSoonPanel({
  courseColor,
  courseTitle,
}: {
  courseColor: string;
  courseTitle: string;
}) {
  const c = ACCENT[courseColor];
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border ${c.border} ${c.bg} p-8 text-center md:p-12`}
    >
      <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl ${c.bg} ${c.text} border ${c.border}`}>
        <ListVideo size={40} />
      </div>
      <h2 className="mt-5 font-syne text-3xl font-black">Videos coming soon</h2>
      <p className="font-noto-devanagari mt-2 text-base text-text-secondary">छिट्टै थपिनेछ</p>
      <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
        The <strong className="text-text-primary">{courseTitle}</strong> course is being curated.
        Meanwhile, you can start with the{' '}
        <strong className={c.text}>Smart Money Concept</strong> course which is fully available.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => navigate('/education/videos/smart-money')}
          className={`flex items-center gap-2 rounded-full ${c.bgSolid} px-6 py-3 text-base font-bold text-bg-base hover:brightness-110`}
        >
          <PlayCircle size={18} /> Go to Smart Money Concept
        </button>
        <button
          onClick={() => navigate('/education/videos')}
          className="rounded-full border border-bg-border bg-bg-surface px-6 py-3 text-base font-bold hover:border-brand-cyan/40"
        >
          Back to courses
        </button>
      </div>
    </motion.div>
  );
}
