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
      aria-label="Motorsport timeline"
      data-story-section
      className="relative bg-black story-wide:h-screen story-wide:overflow-clip"
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
  )
}
