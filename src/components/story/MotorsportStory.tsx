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
      className="relative bg-black lg:h-screen lg:overflow-hidden"
    >
      <div
        ref={trackRef}
        className="flex w-full flex-col lg:h-full lg:w-max lg:flex-row"
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
