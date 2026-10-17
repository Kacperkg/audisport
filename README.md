# AudiSport

AudiSport is a React experience exploring Audi's motorsport history.
It is built as a frontend showcase: responsive typography, scroll-linked
storytelling, smooth scrolling, animated text reveals, and an adaptive fixed
header are combined into a cinematic single-page index.

This is an independent portfolio project. It is not affiliated with or endorsed
by Audi AG.

## Project status

### Implemented

- Responsive index page with mobile, tablet, and desktop layouts.
- Full-viewport hero composition with locally served photography.
- Lenis smooth scrolling integrated with GSAP ScrollTrigger.
- Scroll-linked hero, typography, masked-copy, and color-reveal animations.
- Desktop horizontal story sequence with pinned scrolling and measured travel.
- Mobile/tablet vertical fallback with viewport-triggered reveals.
- Fixed header that samples the content underneath and changes contrast between
  light and dark sections.
- File-based TanStack Router routes and server/client production bundles.
- Local PP Neue Montreal fonts using `font-display: swap`, plus system fallbacks.

### In progress or incomplete

- `/heritage` and `/legends` are placeholder pages.
- Navigation for those routes exists in code but is currently commented out.
- Story image regions after the hero are red placeholder blocks rather than
  final media.
- `Footer` exists but is not rendered by the root document.
- No automated tests or CI workflow are committed.
- No reduced-motion mode is implemented for the loader or scroll animations.
- Motorsport statistics and copy need citations before publication.

## Technology stack

| Area | Technologies |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Application framework | TanStack Start, TanStack Router, Vite, Nitro |
| Motion | GSAP, `@gsap/react`, ScrollTrigger, Lenis |
| Tooling | pnpm, ESLint, Prettier, Vitest (configured, no tests) |

`motion` is installed and imported in one component, but the current experience
is implemented with GSAP and Lenis.

## Architecture and interaction design

```text
TanStack Start root document
  ├─ global metadata and styles
  ├─ adaptive fixed header
  └─ file-based route outlet
       └─ index route
            ├─ animated ring loader
            ├─ sticky, scaled hero
            ├─ scroll-revealed editorial statement
            └─ responsive motorsport timeline
                 ├─ desktop: pinned horizontal track
                 └─ mobile/tablet: vertical panels
```

Content is held in typed configuration arrays close to the components, keeping
repeated statistics, statements, and timeline chapters consistent. GSAP scopes
animations through `useGSAP`; media-query branches build different interaction
models for desktop and smaller screens and are reverted on cleanup. Lenis is
connected to GSAP's ticker and explicitly disconnected on unmount.

The header avoids a hard-coded scroll threshold. It samples three points beneath
it with `elementsFromPoint` and reads `data-header-theme` markers, then batches
scroll/resize work through `requestAnimationFrame`.

## Responsive design and accessibility

- Tailwind breakpoints reshape the hero statistics and editorial sections.
- The story changes from a pinned horizontal track at `1024px` to normal
  vertical document flow below that breakpoint.
- Decorative per-letter spans are hidden from assistive technology while their
  heading exposes a complete `aria-label`.
- Navigation uses semantic links and story panels use headings and articles.

Remaining accessibility work:

- honor `prefers-reduced-motion` and provide a non-animated loader/story path;
- review heading hierarchy (several sections currently use multiple `h1`s);
- provide accessible text context for the CSS background hero image;
- expose and keyboard-test the currently disabled primary navigation;
- test contrast, zoom, focus order, and screen-reader output.

## Performance notes

- Route output is split into index, Heritage, Legends, and shared chunks.
- Development tools are removed from the production bundle.
- Local fonts use `font-display: swap`.
- Scroll listeners are passive and header updates are animation-frame batched.

The hero JPEG is approximately 1.7 MB in the production output and is not served
with responsive variants. Ten OTF font files are committed while only a subset
of weights appears necessary, and additional Google Font imports are present.
Image conversion (`avif`/`webp`), `srcset`/`<picture>`, font subsetting, and
removing unused font requests are the clearest performance follow-ups.

## Screenshots

No rendered application screenshots are committed. The file
`public/AU090348_medium.jpg` is source artwork, not a UI screenshot.

Recommended captures:

1. The expanded hero at desktop width.
2. The typography reveal and philosophy/purpose section.
3. A desktop timeline chapter during horizontal scrolling.
4. The same chapter in the mobile vertical layout.
5. The header over both light and dark content.

## Getting started

Requirements: Node.js and pnpm.

```bash
pnpm install
pnpm dev
```

The development server runs on `http://localhost:3000`.

Create a production bundle and preview it locally:

```bash
pnpm build
pnpm preview
```

The production build completed successfully during the documentation audit on
16 October 2026.

## Testing and code quality

```bash
pnpm test
pnpm lint
pnpm check
```

Current limitations:

- `pnpm test` exits with “No test files found”. Vitest and Testing Library are
  installed, but no tests exist.
- `pnpm lint` currently fails because generated `.output` JavaScript and
  `tailwind.config.js` are included while ESLint expects files from the TypeScript
  project. Add suitable ignores or parser configuration before using lint in CI.
- `pnpm check` checks Prettier formatting only; it does not run TypeScript or
  ESLint despite the package script name.

High-value tests would cover responsive story-mode selection, animation cleanup,
header theme switching, route rendering, and a reduced-motion fallback.

## Deployment

TanStack Start and Nitro generate a Node server bundle in `.output`. No hosting
configuration, CI/CD workflow, verified live URL, or production analytics setup
is committed, so this README does not claim the site is deployed.

## Technical decisions and trade-offs

- **Two story modes:** separate desktop-horizontal and mobile-vertical behavior
  protects smaller screens from a desktop interaction pattern, but increases the
  number of paths to test.
- **Measured scroll distance:** deriving movement from `scrollWidth` supports
  content changes better than a fixed pixel distance, while still requiring
  careful refresh behavior after assets and fonts load.
- **Theme markers:** declarative `data-header-theme` regions keep contrast logic
  out of individual sections, though DOM sampling on scroll should be profiled.
- **Animation-led presentation:** GSAP offers precise choreography, but reduced
  motion, focus behavior, and content availability must remain first-class.

## Before using this as a primary portfolio showcase

- Finish or remove the Heritage and Legends routes and restore intentional nav.
- Replace timeline placeholder blocks with licensed, optimized imagery.
- Add reduced-motion behavior and targeted interaction tests.
- Fix lint scope and add CI for format, lint, test, and build.
- Verify factual copy/statistics and document image/font licensing.
- Add real responsive screenshots and a verified live link when deployed.
