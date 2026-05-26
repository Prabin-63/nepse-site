// ═══════════════════════════════════════════════════════════════════════════
//  NEPSE Elite — Education Hub course catalog
// ═══════════════════════════════════════════════════════════════════════════
//
//  WHAT IS THIS FILE?
//  ------------------
//  This is the "single source of truth" for every video course shown in the
//  Education Hub. The pages (Education.tsx, LearnFromVideos.tsx, VideoCourse.tsx)
//  all read from the COURSES array exported below.
//
//  WHY KEEP IT SEPARATE?
//  ---------------------
//  In React, we prefer to keep DATA separate from VIEW (the UI components).
//  That way, if you ever want to add a new video, change a title, or move a
//  course, you only touch THIS file — no UI code changes needed.
//
//  HOW TO ADD A NEW VIDEO
//  ----------------------
//  1. Open YouTube and copy the video URL.
//     e.g.  https://www.youtube.com/watch?v=5PnTjqyT_BQ
//        or https://youtu.be/5PnTjqyT_BQ?si=abc123
//  2. The `youtubeId` is the part right after `v=` or right after `youtu.be/`.
//     In the example above, it's:  5PnTjqyT_BQ
//  3. Scroll down to the course you want (e.g. `smart-money`) and append
//     a new object to its `videos: [ ... ]` array. Copy an existing block
//     to use as a template.
//  4. Save the file. Vite will hot-reload and the new video appears instantly.
//
//  Videos play in the order they appear in the array (top = lesson 1).
// ═══════════════════════════════════════════════════════════════════════════

// ───── TYPE DEFINITIONS (the "shape" of our data) ─────
// Defining types up-front means TypeScript will warn us if we forget a field
// or use a wrong value somewhere.

export type VideoLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface CourseVideo {
  id: string;                // unique within a course (e.g. 'smc-rs-01')
  title: string;             // English title
  titleNepali?: string;      // optional Devanagari title
  youtubeId: string;         // YouTube video ID — empty string '' = placeholder
  duration?: string;         // human readable, e.g. '45:10'
  instructor?: string;
  channel?: string;
  description?: string;
  level?: VideoLevel;
}

export interface Course {
  id: string;                // URL slug, e.g. 'smart-money' → /education/videos/smart-money
  title: string;
  titleNepali?: string;
  tagline: string;           // one-line hook
  description: string;       // longer paragraph
  level: VideoLevel;
  estimatedHours: number;
  color: 'cyan' | 'gold' | 'violet' | 'green' | 'red';   // theme accent
  icon: 'sprout' | 'book-open' | 'line-chart' | 'crown' | 'shield' | 'calculator';
  status: 'available' | 'coming-soon';
  videos: CourseVideo[];
  prerequisites?: string[];
  whatYouLearn?: string[];
}

// ───── THE COURSE CATALOG ─────
// Order matters: courses appear on the page in the order written here.

export const COURSES: Course[] = [
  // ─── Course 1: Basics (Level 0) ─────────────────────────────────────────
  {
    id: 'basics',
    title: 'Basics About Share Market',
    titleNepali: 'सेयर बजारको आधारभूत ज्ञान',
    tagline: 'Level 0 — Start from absolute zero',
    description:
      'Everything a brand-new investor needs: what shares are, how NEPSE works, how to open a Demat account, and how to place your first trade safely.',
    level: 'Beginner',
    estimatedHours: 6,
    color: 'cyan',
    icon: 'sprout',
    status: 'coming-soon',
    whatYouLearn: [
      'What a stock, IPO, secondary market and broker actually are',
      'How NEPSE trading hours, T+3 settlement and circuit breakers work',
      'How to open a Demat / Mero Share account step by step',
      'How to place your first buy & sell order without mistakes',
    ],
    videos: [],   // empty for now → page will show "Coming soon"
  },

  // ─── Course 2: Fundamental Analysis ─────────────────────────────────────
  {
    id: 'fundamental',
    title: 'Fundamental Analysis',
    titleNepali: 'फन्डामेन्टल विश्लेषण',
    tagline: 'Pick winning companies, not just hot tickers',
    description:
      'Learn to read balance sheets, income statements and ratios like P/E, EPS, ROE and book value so you can buy genuinely strong companies.',
    level: 'Intermediate',
    estimatedHours: 10,
    color: 'gold',
    icon: 'book-open',
    status: 'coming-soon',
    prerequisites: ['Basics About Share Market'],
    whatYouLearn: [
      "How to read a Nepali company's quarterly report",
      'Key ratios: EPS, P/E, P/B, ROE, NPL, CD ratio for banks',
      'Sector-specific fundamentals (Banks, Hydro, Insurance, MFI)',
      'Spotting overvalued vs undervalued stocks',
    ],
    videos: [],
  },

  // ─── Course 3: Advanced Technical Analysis ──────────────────────────────
  {
    id: 'technical-advanced',
    title: 'Advanced Technical Analysis',
    titleNepali: 'एड्भान्स्ड टेक्निकल एनालाइसिस',
    tagline: 'Read price action like a professional',
    description:
      'Beyond beginner candlesticks — master Elliott Waves, Fibonacci, harmonic patterns, divergences, multi-timeframe analysis and pro-grade chart setups.',
    level: 'Advanced',
    estimatedHours: 14,
    color: 'violet',
    icon: 'line-chart',
    status: 'coming-soon',
    prerequisites: ['Basics About Share Market', 'Fundamental Analysis'],
    whatYouLearn: [
      'Elliott Wave theory applied to NEPSE charts',
      'Fibonacci retracement, extension & confluence zones',
      'Harmonic patterns: Gartley, Bat, Butterfly, Crab',
      'RSI / MACD divergences and multi-timeframe alignment',
    ],
    videos: [],
  },

  // ─── Course 4: Smart Money Concept (Rajan Subedi curriculum) ────────────
  // This is the only fully-populated course right now. Lessons are ordered
  // from foundation → entries → traps, so a learner can follow top to bottom.
  {
    id: 'smart-money',
    title: 'Smart Money Concept',
    titleNepali: 'स्मार्ट मनी कन्सेप्ट',
    tagline: 'Trade with the institutions, not against them',
    description:
      'Learn how big money (banks, funds, brokers) actually moves NEPSE — market structure, liquidity grabs, order blocks, BOS, CHoCH, FVGs and premium/discount zones.',
    level: 'Advanced',
    estimatedHours: 8,
    color: 'green',
    icon: 'crown',
    status: 'available',
    prerequisites: ['Basic candlestick reading', 'Support & resistance'],
    whatYouLearn: [
      'Reading market structure — BOS and CHoCH on NEPSE charts',
      'Identifying liquidity pools and stop-loss hunts',
      'Order blocks, Fair Value Gaps (FVG) and mitigation zones',
      'Premium & discount zones for high-probability entries',
      'How smart money accumulates and distributes in Nepali stocks',
    ],

    // ─── VIDEOS (the playlist) ────────────────────────────────────────────
    // Order = lesson number. Edit / reorder / add as needed.
    videos: [
      // Lesson 0 — broad overview by Rajan Subedi & Basanta Pandey
      {
        id: 'smc-00-overview',
        title: 'Smart Money Concept — Full Overview',
        titleNepali: 'स्मार्ट मनी कन्सेप्टको परिचय',
        youtubeId: '5PnTjqyT_BQ',
        duration: '45:10',
        instructor: 'Rajan Subedi & Basanta Pandey',
        channel: 'Bajarko Chirfar',
        level: 'Advanced',
        description:
          'The complete masterclass: how SMC applies to NEPSE, why institutions move the market, and real Nepali stock examples. Start here.',
      },

      // Lesson 1 — Structure mapping (foundation skill)
      {
        id: 'smc-01-structure',
        title: 'Structure Mapping',
        titleNepali: 'मार्केट स्ट्रक्चर म्यापिङ',
        youtubeId: '2wwYl-UjFdc',
        instructor: 'Rajan Subedi',
        level: 'Advanced',
        description:
          'Learn to map market structure correctly — swing highs, swing lows, BOS (Break of Structure) and CHoCH (Change of Character). This is the foundation every later concept builds on.',
      },

      // Lesson 2 — Order blocks & FVGs (the entry tools)
      {
        id: 'smc-02-orderblock-fvg',
        title: 'Order Block and Fair Value Gaps',
        titleNepali: 'अर्डर ब्लक र फेयर भ्यालू ग्याप',
        youtubeId: 'g5If4R3u6iU',
        instructor: 'Rajan Subedi',
        level: 'Advanced',
        description:
          'Master the two most powerful SMC entry tools — order blocks (where institutions placed huge orders) and fair value gaps (price imbalances that often get filled).',
      },

      // Lesson 3 — Liquidity Masterclass (placeholder until YouTube link is shared)
      {
        id: 'smc-03-liquidity-masterclass',
        title: 'Liquidity Masterclass',
        titleNepali: 'लिक्विडिटी मास्टरक्लास',
        youtubeId: '', // ← PASTE THE YOUTUBE ID HERE when ready
        instructor: 'Rajan Subedi',
        level: 'Advanced',
        description:
          'Where does the liquidity sit on a NEPSE chart? Stop-loss clusters, equal highs/lows, trendline liquidity and how smart money targets them.',
      },

      // Lesson 4 — Entries & exits using liquidity
      {
        id: 'smc-04-entry-exit-liquidity',
        title: 'Entry & Exit Strategies based on Liquidity',
        titleNepali: 'लिक्विडिटीको आधारमा एन्ट्री र एक्जिट',
        youtubeId: '5moT9joSvqQ',
        instructor: 'Rajan Subedi',
        level: 'Advanced',
        description:
          'Practical entry and exit playbook — when to enter after a liquidity sweep, where to place your stop-loss, and how to set realistic take-profit targets.',
      },

      // Lesson 5 — Identifying traps (placeholder until YouTube link is shared)
      {
        id: 'smc-05-smart-money-traps',
        title: 'How to Identify Traps of Smart Money',
        titleNepali: 'स्मार्ट मनीका ट्र्यापहरू पहिचान',
        youtubeId: '', // ← PASTE THE YOUTUBE ID HERE when ready
        instructor: 'Rajan Subedi',
        level: 'Advanced',
        description:
          'The retail-trader traps: fakeouts, false breakouts, induced moves, and the typical patterns where retailers get caught. Learn to spot them before you click buy.',
      },
    ],
  },
];

// ───── HELPER FUNCTIONS ─────
// Small utilities the pages call. Putting them here keeps the page code clean.

export const getCourse = (id: string): Course | undefined =>
  COURSES.find((c) => c.id === id);

export const getCoursesByStatus = (status: Course['status']): Course[] =>
  COURSES.filter((c) => c.status === status);
