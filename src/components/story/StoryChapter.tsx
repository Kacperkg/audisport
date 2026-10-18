import { SoftRevealText, WipeText } from './RevealText'
import { CHAPTER_LAYOUTS } from './storyData'
import type { StoryChapterData } from './storyData'

export default function StoryChapter({
  chapter,
}: {
  chapter: StoryChapterData
}) {
  const layout = CHAPTER_LAYOUTS[chapter.layout]

  return (
    <article
      className="relative grid min-h-screen w-full shrink-0 grid-cols-1 gap-12 overflow-hidden bg-black px-6 py-24 text-white sm:px-10 2xl:h-full 2xl:w-[106vw] 2xl:grid-cols-12 2xl:gap-0 2xl:px-24 2xl:py-16"
      data-header-theme="dark"
      data-story-panel
    >
      <p
        className={`pointer-events-none absolute font-jetbrains text-[32vw] font-black leading-none text-white/[0.035] 2xl:text-[20vw] ${layout.year}`}
        aria-hidden="true"
      >
        {chapter.year}
      </p>

      <div
        className={`relative z-10 flex flex-col justify-center ${layout.copy}`}
      >
        <WipeText className="font-jetbrains mb-8 flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-white/50 sm:text-[11px] sm:tracking-[0.28em]">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <span>{chapter.year}</span>
        </WipeText>

        <WipeText
          as="h2"
          className="max-w-[10ch] text-5xl font-black uppercase leading-[0.9] tracking-tight text-white sm:text-6xl 2xl:text-7xl"
        >
          {chapter.title}
          <span className="text-red-500">.</span>
        </WipeText>
        <WipeText className="font-jetbrains mt-7 text-xs uppercase tracking-[0.18em] text-white/60 sm:text-sm sm:tracking-[0.2em]">
          {chapter.subtitle}
        </WipeText>
        <SoftRevealText className="mt-8 max-w-[46ch] text-base leading-7 text-white/70">
          {chapter.copy}
        </SoftRevealText>
        <SoftRevealText className="mt-8 max-w-[50ch] text-sm leading-6 text-white/45">
          {chapter.detail}
        </SoftRevealText>
        <SoftRevealText className="mt-10 font-jetbrains text-[11px] uppercase tracking-[0.22em] text-white/45">
          {chapter.note}
        </SoftRevealText>
      </div>

      <div className={`relative flex ${layout.image}`}>
        <div
          className={`overflow-hidden ${layout.imageFrame}`}
          data-story-image
        >
          <img
            alt={chapter.imageAlt}
            className="h-full w-full object-cover"
            decoding="async"
            loading="lazy"
            src={chapter.image}
          />
        </div>
      </div>
    </article>
  )
}
