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
    <section
      ref={sectionRef}
      className="relative bg-black 2xl:h-screen 2xl:overflow-hidden"
    >
      <div
        ref={trackRef}
        className="flex w-full flex-col 2xl:h-full 2xl:w-max 2xl:flex-row"
      >
        <StoryIntro />
        {CHAPTERS.map((chapter) => (
          <StoryChapter key={chapter.title} chapter={chapter} />
        ))}
        <FormulaOneChapter />
      </div>
    </section>
  )
}
