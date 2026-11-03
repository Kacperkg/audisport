import { WipeText } from './RevealText'

const REVEAL_ROW_COUNT = 5
const REVEAL_ROW_HEIGHT = 100 / REVEAL_ROW_COUNT
const MASK_OVERLAP_PX = 2

export default function FormulaOneChapter() {
  return (
    <article
      className="relative h-[360svh] w-full shrink-0 bg-black text-white story-wide:h-full story-wide:w-screen"
      data-header-theme="dark"
      data-f1-stage
      data-story-panel
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1 z-50 hidden w-2 bg-black story-wide:block"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[120svh] h-px story-wide:hidden"
        data-f1-scroll-end
      />

      <div className="f1-viewport sticky top-0 flex h-[100lvh] w-full items-center justify-center overflow-hidden px-6 py-24 text-center sm:px-10 story-wide:relative story-wide:h-full story-wide:px-20 story-wide:py-0">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-40 flex h-[100svh] items-center justify-center px-6 sm:px-10 story-wide:relative story-wide:inset-auto story-wide:h-auto story-wide:px-0"
          data-f1-question
        >
          <WipeText
            as="h2"
            className="whitespace-nowrap text-[11vw] font-black uppercase leading-[0.82] tracking-[-0.055em] text-white sm:text-[11vw] story-wide:text-[9vw]"
          >
            What's next<span className="text-red-500">?</span>
          </WipeText>
        </div>

        <div
          className="f1-image-stage absolute inset-0 z-20"
          data-header-theme="light"
        >
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
              data-header-theme="dark"
              style={{
                height: `calc(${REVEAL_ROW_HEIGHT}% + ${MASK_OVERLAP_PX * 2}px)`,
                top: `calc(${index * REVEAL_ROW_HEIGHT}% - ${MASK_OVERLAP_PX}px)`,
              }}
            />
          ))}

          <div
            className="absolute inset-x-0 top-0 z-30 h-[100svh] text-left text-black story-wide:inset-0 story-wide:h-auto"
            data-f1-copy-overlay
            data-header-theme="light"
          >
            {/* Leave header clearance when the footer scrolls the stage upward. */}
            <div className="absolute left-6 top-48 sm:left-10 sm:top-52 story-wide:left-20">
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

            <div className="absolute bottom-10 left-6 sm:bottom-12 sm:left-10 story-wide:bottom-16 story-wide:left-20">
              <h2 className="relative inline-block overflow-hidden text-7xl font-black uppercase leading-[0.78] tracking-[-0.06em] sm:text-9xl story-wide:text-[10rem]">
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
          </div>
        </div>
      </div>
    </article>
  )
}
