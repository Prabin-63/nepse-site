# Education Hub — How It Works (a teaching walkthrough)

> Written so you can read it once, then open the code and understand every line.
> No prior React expertise required, but assumes you've seen HTML and a little JavaScript.

---

## 1. The big picture in 30 seconds

The Education Hub is **three pages + one data file**:

```
┌──────────────────────────────────────────────────────────────┐
│  src/data/educationCourses.ts                                │
│  → The "single source of truth": every course, every video,  │
│    every Nepali title lives here. Edit this one file to add  │
│    or change content. UI updates automatically.              │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│ Education.tsx    │ │ LearnFromVideos  │ │ VideoCourse.tsx          │
│ /education       │ │ /education/videos│ │ /education/videos/:id    │
│                  │ │                  │ │                          │
│ Hub landing.     │ │ Lists all 4      │ │ YouTube player on left,  │
│ Hero + 3 paths   │ │ courses with     │ │ playlist on right,       │
│ + glossary.      │ │ numbered cards.  │ │ progress saved locally.  │
└──────────────────┘ └──────────────────┘ └──────────────────────────┘
```

**Routing flow:** User clicks "Learn from Videos" on the hub → goes to the
course list → clicks "Smart Money Concept" → arrives at the player. Each
arrow above is just a call to React Router's `navigate()` function.

---

## 2. The files and what they do

| File | Lines | Purpose |
|---|---|---|
| `src/data/educationCourses.ts` | ~200 | **Data only.** Every course, every video, every title. No JSX. |
| `src/pages/Education.tsx` | ~270 | The hub landing page. Hero, 3 learning paths, glossary. |
| `src/pages/education/LearnFromVideos.tsx` | ~180 | Numbered list of all 4 courses. |
| `src/pages/education/VideoCourse.tsx` | ~400 | YouTube player + playlist + progress tracker. |
| `src/App.tsx` | (3 lines added) | Routes that map URL → page component. |

---

## 3. React concepts you'll see in this code

This is the cheat-sheet — read it once and the code will make perfect sense.

### 3.1 Components are functions that return HTML

```tsx
export default function Education() {
  return (
    <div>
      <h1>Hello</h1>
    </div>
  );
}
```

That's it. A "component" is a function whose name is Capitalized and which
returns JSX (HTML-looking syntax). React calls this function to render the page.

### 3.2 Importing other components and data

```tsx
import { COURSES } from '../data/educationCourses';
```

This pulls the `COURSES` array out of our data file so we can use it. The
`../data/...` is a relative path — `..` means "go up one folder".

### 3.3 The three core hooks we use

**`useState` — remember a value across renders.**
```tsx
const [activeIdx, setActiveIdx] = useState(0);
// activeIdx starts at 0. Calling setActiveIdx(3) updates it and re-renders.
```

**`useEffect` — do something when a value changes.**
```tsx
useEffect(() => {
  window.scrollTo({ top: 0 });
}, [courseId]);
// When courseId changes, scroll to top.
```

**`useNavigate` — change the URL.**
```tsx
const navigate = useNavigate();
navigate('/education/videos'); // moves to that page
```

### 3.4 `useParams` — read variables out of the URL

In `App.tsx` we declared:
```tsx
<Route path="/education/videos/:courseId" element={<VideoCourse />} />
```

The `:courseId` is a placeholder. When the URL is `/education/videos/smart-money`,
React Router gives us:
```tsx
const { courseId } = useParams(); // courseId === 'smart-money'
```

### 3.5 Mapping over an array to render a list

```tsx
{COURSES.map((course, i) => (
  <button key={course.id} onClick={() => navigate(`/education/videos/${course.id}`)}>
    {i + 1}. {course.title}
  </button>
))}
```

`map` returns one JSX element per array item. React needs a `key` prop on each
to track them efficiently — use a unique string (we use `course.id`).

### 3.6 Conditional rendering

```tsx
{hasVideos ? <Player /> : <ComingSoonPanel />}
```

Read it as: "If hasVideos, show Player, otherwise show ComingSoonPanel."

```tsx
{course.titleNepali && <p>{course.titleNepali}</p>}
```

Read: "Only render the `<p>` if `titleNepali` exists." (Common shortcut.)

---

## 4. Why we split data from UI

Look at the bottom of `educationCourses.ts`:
```ts
export const COURSES: Course[] = [
  { id: 'basics', title: 'Basics About Share Market', ... },
  { id: 'smart-money', title: 'Smart Money Concept', videos: [...] },
];
```

And all three pages start with:
```tsx
import { COURSES } from '../data/educationCourses';
```

That means:
- **To add a new video:** edit one line in the data file.
- **To rename a course:** edit one line in the data file.
- **To change colors, fonts or layout:** edit the relevant page file.

You never have to touch UI code to update content. This pattern is called
**"separation of concerns"** and it's one of the most important habits in
clean software.

---

## 5. Tailwind CSS — how the styling works

Instead of writing CSS in separate files, we apply pre-made utility classes
right on the elements. Examples:

| Class | Meaning |
|---|---|
| `text-2xl` | Font size = "2x large" |
| `font-bold` | Font weight = bold |
| `p-6` | Padding on all sides = 6 units (= 24px) |
| `mt-4` | Margin-top = 4 units (= 16px) |
| `flex` | `display: flex` |
| `gap-3` | Spacing between flex children |
| `rounded-2xl` | Big border-radius |
| `bg-bg-surface` | Custom background color (defined in `tailwind.config.js`) |
| `text-brand-cyan` | Custom text color (the brand cyan) |
| `md:text-4xl` | On medium screens and up, switch to `text-4xl` |
| `hover:-translate-y-1` | When hovered, lift the element 1 unit |

**Why we pre-declare the ACCENT map.** Tailwind only generates classes it
*sees* in your source code. If you write `bg-${course.color}/10` it might
work at runtime but won't be in the compiled CSS. So we explicitly list:
```ts
const ACCENT = {
  cyan: { bg: 'bg-brand-cyan/10', ... },
  ...
};
```
…and Tailwind sees every full class name.

---

## 6. Framer Motion — the entrance animations

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}   // start invisible, 20px below
  animate={{ opacity: 1, y: 0 }}    // end fully visible, at rest
  transition={{ duration: 0.5 }}    // takes 0.5 seconds
>
```

That's it. `motion.div` is a drop-in replacement for `<div>` that can animate.

For the playlist, we use `AnimatePresence` + a `key` so when the user clicks
a different lesson, the lesson card *exits* and the new one *enters* smoothly:

```tsx
<AnimatePresence mode="wait">
  <motion.div key={activeVideo.id} ...>...</motion.div>
</AnimatePresence>
```

---

## 7. The watched-progress feature (localStorage)

We persist progress in the browser using `localStorage`:

```ts
const STORAGE_KEY = 'nepse-elite:watched-videos';

function saveWatched(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Silent fail — localStorage might be disabled.
  }
}
```

- We store a `Set` of video IDs the user has marked as watched.
- `Set` can't be JSON-stringified directly, so we convert to an array first.
- The `try/catch` is defensive — private browsing tabs sometimes block writes.

When the page loads, `getWatched()` reads the array back and turns it into a `Set`
again. Then we display:
```tsx
{watched.has(v.id) ? <CheckCircle2 /> : <NumberBadge />}
```

---

## 8. Handling videos that don't have a YouTube link yet

In the data file, some videos have:
```ts
{ id: 'smc-03-liquidity-masterclass', youtubeId: '', ... }
```

Note: `youtubeId: ''` (empty string).

In `VideoCourse.tsx`, we detect that:
```tsx
const isPlayable = !!activeVideo?.youtubeId;
```

`!!something` converts any value to a `true` or `false`. Empty string → `false`.

Then in the JSX:
```tsx
{isPlayable
  ? <iframe src={`https://www.youtube.com/embed/${activeVideo.youtubeId}`} />
  : <PlaceholderMessage />
}
```

Same idea in the playlist: pending lessons show an hourglass icon and the
text "Coming soon" instead of a duration.

**To finish those placeholder lessons later:** just paste the YouTube ID into
the `youtubeId: ''` slot. Nothing else to change.

---

## 9. The YouTube embed URL

```
https://www.youtube.com/embed/VIDEO_ID?rel=0&modestbranding=1
```

| Param | Effect |
|---|---|
| `rel=0` | Hide "related videos" from other channels at the end |
| `modestbranding=1` | Reduce YouTube branding |
| `?autoplay=1` (we don't use) | Would start playing automatically — annoying for older users |

The `allowFullScreen` and `allow=...` attributes are required by YouTube
to enable picture-in-picture and fullscreen buttons.

---

## 10. How navigation actually works — step by step

User clicks the "Learn from Videos" card on `/education`:

1. `onClick={() => navigate('/education/videos')}` runs.
2. React Router changes the URL to `/education/videos` (no full page reload!).
3. React Router checks `App.tsx` Routes, finds:
   ```tsx
   <Route path="/education/videos" element={<LearnFromVideos />} />
   ```
4. It mounts the `<LearnFromVideos />` component, which renders the list.
5. The user clicks "Smart Money Concept" → `navigate('/education/videos/smart-money')`.
6. URL matches `/education/videos/:courseId`. `useParams()` inside
   `VideoCourse.tsx` returns `{ courseId: 'smart-money' }`.
7. `getCourse('smart-money')` finds the course object and renders it.

All without a page refresh — that's the whole point of a **Single Page App (SPA)**.

---

## 11. Tasks you can try now to cement understanding

1. **Add a new video to Smart Money Concept.**
   Open `educationCourses.ts`, find the `smart-money` block, copy an existing
   video object, change the `id`, `title`, `youtubeId`. Save → refresh.

2. **Add a new glossary term.**
   In `Education.tsx`, scroll to the `GLOSSARY` array at the bottom. Add an
   object with `term`, `termNp`, `def`. Save → refresh.

3. **Change the brand-cyan accent.**
   In `src/index.css`, find `--brand-cyan` and change the RGB value.
   Every cyan accent in the whole site updates.

4. **Add a 5th course.**
   In `educationCourses.ts`, copy one course block, change `id`, `title`,
   `color`. It automatically appears in all three pages.

5. **Mark the Basics course as available.**
   In `educationCourses.ts`, change `status: 'coming-soon'` to `status: 'available'`,
   add a few videos, and watch the badges change everywhere.

---

## 12. Common gotchas (things that confused me when learning React)

| Gotcha | Fix |
|---|---|
| Empty page after editing — check the browser DevTools Console | Most likely a typo or unclosed JSX tag |
| New Tailwind class doesn't apply | The class must appear as a *complete string* somewhere in source (no `bg-${color}`) |
| YouTube iframe keeps playing old video when switching | Make sure the iframe has `key={activeVideo.youtubeId}` |
| Progress doesn't save | Open DevTools → Application → Local Storage and check the `nepse-elite:watched-videos` key |
| 404 / blank when refreshing a subroute | Vite dev server handles this automatically; in production you need a fallback to `index.html` |

---

## 13. File map (clickable in most editors)

- Data: [`src/data/educationCourses.ts`](../src/data/educationCourses.ts)
- Hub: [`src/pages/Education.tsx`](../src/pages/Education.tsx)
- List: [`src/pages/education/LearnFromVideos.tsx`](../src/pages/education/LearnFromVideos.tsx)
- Player: [`src/pages/education/VideoCourse.tsx`](../src/pages/education/VideoCourse.tsx)
- Routes: [`src/App.tsx`](../src/App.tsx) — search for `/education/videos`

Open them side by side with this doc. Every section above maps to comments
in those files.

---

## 14. Where to learn more (recommended free resources)

| Topic | Best free resource |
|---|---|
| React fundamentals | [react.dev/learn](https://react.dev/learn) |
| React Router | [reactrouter.com/start/tutorial](https://reactrouter.com/start/tutorial) |
| Tailwind CSS | [tailwindcss.com/docs/utility-first](https://tailwindcss.com/docs/utility-first) |
| Framer Motion | [motion.dev/docs/react-quick-start](https://motion.dev/docs/react-quick-start) |
| TypeScript basics | [typescriptlang.org/docs/handbook/typescript-from-scratch.html](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html) |

---

*Happy hacking. Every time you change a file and save, Vite hot-reloads
the page automatically — no refresh needed. That's the fastest possible
feedback loop for learning. Use it.*
