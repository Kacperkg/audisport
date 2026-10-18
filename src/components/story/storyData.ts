export type ChapterLayout =
  | 'split-right'
  | 'image-left'
  | 'centered'
  | 'wide-image'
  | 'offset'

export type StoryChapterData = {
  year: string
  title: string
  subtitle: string
  copy: string
  detail: string
  note: string
  layout: ChapterLayout
  image: string
  imageAlt: string
}

export const CHAPTERS = [
  {
    year: '1980',
    title: 'The quattro Revolution',
    subtitle: 'The moment everything changed.',
    copy: 'Audi introduced quattro all-wheel drive to world rallying, changing the way performance was understood on loose surfaces.',
    detail:
      'It was not just traction. It was a new way to carry speed, rotate a car, and attack terrain that had previously belonged to compromise.',
    note: 'Group B rewrote the rules.',
    layout: 'split-right',
    image: '/audi-quattro-1980-bw.webp',
    imageAlt: 'The original Audi quattro displayed at its 1980 debut',
  },
  {
    year: '1987',
    title: 'Pikes Peak',
    subtitle: 'The mountain was never the same.',
    copy: "Walter Rohrl's Sport quattro S1 became one of Audi's most iconic motorsport moments, turning engineering into legend.",
    detail:
      'The climb turned quattro into theatre: altitude, dust, boost and bravery compressed into one brutal ascent.',
    note: '14,115 ft above sea level.',
    layout: 'image-left',
    image: '/audi-pikes-peak-1987-bw.webp',
    imageAlt: 'Walter Röhrl driving the Audi Sport quattro S1 at Pikes Peak',
  },
  {
    year: '1990s',
    title: 'Touring Car Dominance',
    subtitle: 'quattro conquered the circuit.',
    copy: 'After rallying, Audi carried its technology onto asphalt, proving itself across touring car championships.',
    detail:
      'The surfaces changed, but the idea remained the same: make technology invisible by making the car feel inevitable.',
    note: 'From stages to circuits.',
    layout: 'centered',
    image: '/audi-touring-1990s-bw.webp',
    imageAlt: 'Hans-Joachim Stuck in the Audi V8 quattro touring car',
  },
  {
    year: '2000-2014',
    title: 'The Le Mans Era',
    subtitle: 'Endurance redefined.',
    copy: "Audi built one of endurance racing's greatest dynasties, with the R8, R10 and R18 collecting 13 Le Mans victories.",
    detail:
      'Speed mattered, but so did silence, rhythm and repeatability. Audi made endurance feel engineered down to the second.',
    note: '13 victories at Le Mans.',
    layout: 'wide-image',
    image: '/audi-le-mans-2013-bw.webp',
    imageAlt: 'Audi R18 e-tron quattro race cars at the 24 Hours of Le Mans',
  },
  {
    year: '2024',
    title: 'Dakar Reinvented',
    subtitle: 'Innovation never stops.',
    copy: "The RS Q e-tron continued Audi's tradition of challenging convention, bringing electrified performance to the desert.",
    detail:
      'Dakar demanded a different kind of answer: range, recovery, heat and control across a landscape that refused certainty.',
    note: 'Electrified performance, off road.',
    layout: 'offset',
    image: '/audi-dakar-2024-bw.webp',
    imageAlt: 'The Audi RS Q e-tron Dakar prototype on display',
  },
] satisfies ReadonlyArray<StoryChapterData>

export const CHAPTER_LAYOUTS: Record<
  ChapterLayout,
  { year: string; copy: string; image: string; imageFrame: string }
> = {
  'split-right': {
    year: 'left-6 top-12 2xl:left-20',
    copy: '2xl:col-span-4 2xl:col-start-2',
    image: 'items-center 2xl:col-span-5 2xl:col-start-8',
    imageFrame: 'h-[42vh] w-full 2xl:h-[66vh]',
  },
  'image-left': {
    year: 'right-6 top-14 2xl:right-24',
    copy: '2xl:col-span-4 2xl:col-start-8',
    image: 'items-center 2xl:col-span-5 2xl:col-start-2 2xl:-translate-y-24',
    imageFrame: 'h-[42vh] w-full 2xl:h-[66vh]',
  },
  centered: {
    year: 'left-6 top-12 2xl:left-20',
    copy: '2xl:col-span-5 2xl:col-start-5 2xl:items-center 2xl:text-center',
    image: 'items-end 2xl:col-span-9 2xl:col-start-2 2xl:row-start-1 2xl:pb-14',
    imageFrame: 'h-[26vh] w-full 2xl:h-[18vh]',
  },
  'wide-image': {
    year: 'left-6 top-12 2xl:left-20',
    copy: '2xl:col-span-4 2xl:col-start-2',
    image: 'items-end 2xl:col-span-6 2xl:col-start-7 2xl:pb-20',
    imageFrame: 'h-[34vh] w-full 2xl:h-[42vh]',
  },
  offset: {
    year: 'left-6 top-12 2xl:left-20',
    copy: '2xl:col-span-4 2xl:col-start-2 2xl:justify-end 2xl:pb-24',
    image: 'items-start 2xl:col-span-5 2xl:col-start-8 2xl:pt-24',
    imageFrame: 'h-[42vh] w-[74%] 2xl:h-[52vh]',
  },
}

export const STORY_IMAGE_SOURCES = [
  ...CHAPTERS.map(({ image }) => image),
  '/audi-r26-f1.jpg',
]
