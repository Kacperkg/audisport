import { WipeText } from './RevealText'

const REVEAL_ROW_COUNT = 5
const REVEAL_ROW_HEIGHT = 100 / REVEAL_ROW_COUNT
const MASK_OVERLAP_PX = 2

export default function FormulaOneChapter() {
  return (
    <article
      className="relative h-[calc(100dvh+160svh)] w-full shrink-0 bg-black text-white lg:h-full lg:w-screen"
      data-header-theme="dark"
      data-f1-stage
      data-story-panel
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1 z-50 hidden w-2 bg-black lg:block"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[20svh] h-px lg:hidden"
        data-f1-scroll-end
      />

      <div className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden px-6 py-24 text-center sm:px-10 lg:relative lg:h-full lg:px-20 lg:py-0">
        <div className="relative z-40" data-f1-question>
          <WipeText
            as="h2"
            className="text-5xl font-black uppercase tracking-tight text-white sm:text-7xl lg:text-8xl"
          >
            What's next<span className="text-red-500">?</span>
          </WipeText>
        </div>

        <div className="absolute inset-0 z-20">
          <img
            alt="Audi R26 Formula 1 car in its special 2026 Singapore livery"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
            loading="lazy"
            src="/audi-r26-f1.jpg"
          />

          {Array.from({ length: REVEAL_ROW_COUNT }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="absolute inset-x-0 origin-top bg-black will-change-transform [backface-visibility:hidden]"
              data-f1-mask
              style={{
                height: `calc(${REVEAL_ROW_HEIGHT}% + ${MASK_OVERLAP_PX * 2}px)`,
                top: `calc(${index * REVEAL_ROW_HEIGHT}% - ${MASK_OVERLAP_PX}px)`,
              }}
            />
          ))}

          <div
            className="absolute inset-0 z-30 text-left text-black"
            data-f1-copy-overlay
            data-header-theme="light"
          >
            <div className="absolute left-6 top-28 sm:left-10 sm:top-32 lg:left-20">
              <div className="h-px w-16 bg-red-600 sm:w-24" data-f1-copy-rule />
              <p
                className="font-jetbrains mt-4 text-[10px] font-semibold uppercase leading-5 tracking-[0.24em] sm:text-xs"
                data-f1-copy-label
              >
                The next chapter
                <br />
                Formula 1 / 2026
              </p>
            </div>

            <div className="absolute bottom-10 left-6 sm:bottom-12 sm:left-10 lg:bottom-16 lg:left-20">
              <h2 className="relative inline-block overflow-hidden text-7xl font-black uppercase leading-[0.78] tracking-[-0.06em] sm:text-9xl lg:text-[10rem]">
                <span data-f1-title-content>
                  R26<span className="text-red-600">.</span>
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 z-10 origin-left scale-x-0 bg-black"
                  data-f1-title-wipe
                />
              </h2>
              <p
                className="font-jetbrains mt-5 text-[10px] font-semibold uppercase tracking-[0.26em] sm:text-xs"
                data-f1-copy-support
              >
                Built to challenge.
              </p>
            </div>

            <a
              className="font-jetbrains absolute bottom-8 right-6 text-right text-[8px] uppercase leading-4 tracking-[0.18em] text-black/40 transition-colors hover:text-black/70 sm:bottom-10 sm:right-10 sm:text-[9px] lg:bottom-14 lg:right-20"
              href="https://kacpergajdarski.com/"
              rel="author"
            >
              Independent project by
              <br />
              Kacper Gajdarski
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
