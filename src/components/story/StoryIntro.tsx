export default function StoryIntro() {
  return (
    <article
      className="relative flex min-h-screen w-full shrink-0 items-center justify-center overflow-hidden bg-black px-6 py-28 text-white sm:px-10 lg:h-full lg:w-screen lg:px-20 lg:py-0"
      data-header-theme="dark"
      data-story-panel
    >
      <p className="font-jetbrains absolute bottom-12 right-6 text-[10px] uppercase tracking-[0.3em] text-white/35 sm:right-10 lg:bottom-20 lg:right-20 lg:text-[11px]">
        Scroll to begin
      </p>
      <div className="text-center">
        <p className="font-jetbrains text-xs uppercase tracking-[0.35em] text-white/40">
          Audi Motorsport
        </p>
        <h2 className="mt-8 max-w-[12ch] text-5xl font-black uppercase leading-[0.86] tracking-tight text-white sm:text-7xl lg:text-8xl">
          Where it all started<span className="text-red-500">.</span>
        </h2>
      </div>
    </article>
  )
}
