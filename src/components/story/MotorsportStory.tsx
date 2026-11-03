import { useRef } from 'react'
import FormulaOneChapter from './FormulaOneChapter'
import StoryChapter from './StoryChapter'
import StoryIntro from './StoryIntro'
import { CHAPTERS } from './storyData'
import { useStoryAnimation } from './useStoryAnimation'

export default function MotorsportStory() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  useStoryAnimation(sectionRef, trackRef)

  return (
    <>
      <section
        ref={sectionRef}
        aria-label="Motorsport timeline"
        data-story-section
        className="relative bg-black story-wide:h-screen story-wide:overflow-hidden"
      >
        <div
          ref={trackRef}
          className="flex w-full flex-col story-wide:h-full story-wide:w-max story-wide:flex-row"
        >
          <StoryIntro />
          {CHAPTERS.map((chapter) => (
            <StoryChapter key={chapter.title} chapter={chapter} />
          ))}
          <FormulaOneChapter />
        </div>
      </section>
      <footer
        className="relative bg-black px-6 py-10 text-white sm:px-10"
        data-header-theme="dark"
      >
        <a
          className="font-jetbrains inline-block text-xs uppercase leading-6 tracking-wider underline underline-offset-4"
          href="https://kacpergajdarski.com/"
          rel="author"
        >
          Independent project by Kacper Gajdarski
        </a>
      </footer>
    </>
  )
}
