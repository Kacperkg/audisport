import { WipeText } from './RevealText'

const REVEAL_ROW_COUNT = 5
const REVEAL_ROW_HEIGHT = 100 / REVEAL_ROW_COUNT
const MASK_OVERLAP_PX = 2

export default function FormulaOneChapter() {
  return (
    <article
      className="relative h-[260svh] w-full shrink-0 bg-black text-white 2xl:h-full 2xl:w-screen"
      data-header-theme="dark"
      data-f1-stage
      data-story-panel
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1 z-50 hidden w-2 bg-black 2xl:block"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[20svh] h-px 2xl:hidden"
        data-f1-scroll-end
      />

      <div className="sticky top-0 flex h-[100lvh] w-full items-center justify-center overflow-hidden px-6 py-24 text-center sm:px-10 2xl:relative 2xl:h-full 2xl:px-20 2xl:py-0">
        <div
          className="absolute inset-x-0 top-0 z-40 flex h-[100svh] items-center justify-center px-6 sm:px-10 2xl:relative 2xl:inset-auto 2xl:h-auto 2xl:px-0"
          data-f1-question
        >
          <WipeText
            as="h2"
            className="whitespace-nowrap text-[13vw] font-black uppercase leading-[0.82] tracking-[-0.055em] text-white sm:text-[11vw] 2xl:text-[9vw]"
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
            className="absolute inset-x-0 top-0 z-30 h-[100svh] text-left text-black 2xl:inset-0 2xl:h-auto"
            data-f1-copy-overlay
            data-header-theme="light"
          >
            <div className="absolute left-6 top-28 sm:left-10 sm:top-32 2xl:left-20">
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

            <div className="absolute bottom-10 left-6 sm:bottom-12 sm:left-10 2xl:bottom-16 2xl:left-20">
              <h2 className="relative inline-block overflow-hidden text-7xl font-black uppercase leading-[0.78] tracking-[-0.06em] sm:text-9xl 2xl:text-[10rem]">
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
              className="font-jetbrains absolute bottom-8 right-6 text-right text-[8px] uppercase leading-4 tracking-[0.18em] text-black/40 transition-colors hover:text-black/70 sm:bottom-10 sm:right-10 sm:text-[9px] 2xl:bottom-14 2xl:right-20"
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
