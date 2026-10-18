const BACKGROUND_YEARS = [
  {
    year: '1980',
    className:
      'absolute left-[clamp(1rem,2.5vw,4rem)] top-1/2 -translate-y-1/2 text-[clamp(4.5rem,12vw,16rem)] font-black leading-none font-jetbrains',
  },
  {
    year: '2026',
    className:
      'absolute right-[clamp(1rem,2.5vw,4rem)] top-1/2 -translate-y-1/2 text-[clamp(4.5rem,12vw,16rem)] font-black leading-none font-jetbrains',
  },
]

const STATS = [
  { value: '500', suffix: '+', label: 'Race wins' },
  { value: '13', label: 'Le Mans Victories' },
  { value: '4', label: 'Dakar wins' },
  { value: '7', label: 'Drivers Championships' },
  { value: '100', suffix: '+', label: 'Pole Positions' },
]

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 grid h-full w-full grid-cols-20 grid-rows-3 overflow-hidden text-black/10">
      {BACKGROUND_YEARS.map((item) => (
        <p key={item.year} className={item.className} aria-hidden="true">
          {item.year}
        </p>
      ))}

      <div className="absolute inset-x-0 bottom-[5svh] mx-auto px-4 text-black sm:bottom-[7svh]">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <HorizontalDivider />
          <p className="font-jetbrains text-center text-sm font-medium leading-loose sm:text-xl">
            <span className="inline-flex items-center">
              40 <span className="text-sm ml-1 leading-none">+</span>
            </span>{' '}
            YEARS OF MOTORSPORT
          </p>
          <HorizontalDivider />
        </div>

        <ul className="mt-2 grid grow grid-cols-2 gap-x-5 gap-y-2 p-2 text-3xl leading-none text-black sm:mt-4 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-5 sm:p-4 sm:text-5xl lg:flex lg:flex-row lg:justify-between lg:gap-8 lg:text-7xl">
          {STATS.map((stat, index) => (
            <StatGroup
              key={stat.label}
              stat={stat}
              isLast={index === STATS.length - 1}
              showDivider={index < STATS.length - 1}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

function StatGroup({
  isLast,
  stat,
  showDivider,
}: {
  isLast: boolean
  stat: (typeof STATS)[number]
  showDivider: boolean
}) {
  return (
    <>
      <li
        className={`flex flex-col items-center justify-center text-center ${
          isLast ? 'col-span-2 sm:col-span-1' : ''
        }`}
      >
        {stat.suffix ? (
          <span className="inline-flex items-center">
            {stat.value}
            <span className="text-xl leading-none sm:text-4xl">
              {stat.suffix}
            </span>
          </span>
        ) : (
          <span>{stat.value}</span>
        )}
        <span className="font-jetbrains mt-1 text-[9px] leading-tight text-black/30 sm:text-sm">
          {stat.label}
        </span>
      </li>
      {showDivider && (
        <div className="hidden h-16 w-px shrink-0 bg-black/30 lg:block" />
      )}
    </>
  )
}

function HorizontalDivider() {
  return <div className="h-px w-10 bg-black/30 sm:w-20" />
}
