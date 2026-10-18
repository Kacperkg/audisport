import { useEffect } from 'react'
import type { RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { STORY_IMAGE_SOURCES } from './storyData'

gsap.registerPlugin(ScrollTrigger)

type F1AnimationTargets = {
  stage: HTMLElement | null
  endMarker: HTMLElement | null
  masks: HTMLElement[]
  question: HTMLElement | null
  copyLabel: HTMLElement | null
  copyOverlay: HTMLElement | null
  copyRule: HTMLElement | null
  copySupport: HTMLElement | null
  titleContent: HTMLElement | null
  titleWipe: HTMLElement | null
}

type F1AnimationDurations = {
  question: number
  masks: number
  maskStagger: number
  rule: number
  label: number
  titleIn: number
  titleOut: number
  support: number
}

export function useStoryAnimation(
  sectionRef: RefObject<HTMLElement | null>,
  trackRef: RefObject<HTMLDivElement | null>,
) {
  useStoryImagePreload()

  useGSAP(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    const media = gsap.matchMedia()
    const getScrollDistance = () => track.scrollWidth - window.innerWidth

    const createRevealController = () => {
      const revealItems = gsap.utils.toArray<HTMLElement>(
        track.querySelectorAll('[data-story-reveal-item]'),
      )
      const textContents = gsap.utils.toArray<HTMLElement>(
        track.querySelectorAll('[data-text-content]'),
      )
      const textWipes = gsap.utils.toArray<HTMLSpanElement>(
        track.querySelectorAll('[data-text-wipe]'),
      )
      const storyImages = gsap.utils.toArray<HTMLElement>(
        track.querySelectorAll('[data-story-image]'),
      )
      const select = <T extends HTMLElement>(selector: string) =>
        track.querySelector<T>(selector)
      const f1: F1AnimationTargets = {
        stage: select('[data-f1-stage]'),
        endMarker: select('[data-f1-scroll-end]'),
        masks: gsap.utils.toArray<HTMLElement>(
          track.querySelectorAll('[data-f1-mask]'),
        ),
        question: select('[data-f1-question]'),
        copyLabel: select('[data-f1-copy-label]'),
        copyOverlay: select('[data-f1-copy-overlay]'),
        copyRule: select('[data-f1-copy-rule]'),
        copySupport: select('[data-f1-copy-support]'),
        titleContent: select('[data-f1-title-content]'),
        titleWipe: select('[data-f1-title-wipe]'),
      }
      const revealedItems = new Set<HTMLElement>()

      gsap.set(textContents, { opacity: 0 })
      gsap.set(textWipes, { scaleX: 0, transformOrigin: 'left center' })
      gsap.set(storyImages, { opacity: 0, y: 24 })
      gsap.set(f1.masks, { scaleY: 1, transformOrigin: 'top center' })
      gsap.set([f1.copyLabel, f1.copySupport], { opacity: 0, y: 14 })
      gsap.set(f1.copyOverlay, { visibility: 'hidden' })
      gsap.set(f1.copyRule, { scaleX: 0, transformOrigin: 'left center' })
      gsap.set(f1.titleContent, { opacity: 0 })
      gsap.set(f1.titleWipe, {
        scaleX: 0,
        transformOrigin: 'left center',
      })

      const getTrackOffset = (element: HTMLElement) => {
        let offset = 0
        let current: HTMLElement | null = element

        while (current && current !== track) {
          offset += current.offsetLeft
          current = current.offsetParent as HTMLElement | null
        }

        return offset
      }

      const revealTextItem = (item: HTMLElement) => {
        if (item.dataset.revealType === 'soft') {
          gsap.to(item, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
          })
          return
        }

        const content = item.querySelector<HTMLElement>('[data-text-content]')
        const wipe = item.querySelector<HTMLSpanElement>('[data-text-wipe]')
        if (!content || !wipe) return

        gsap
          .timeline()
          .set(wipe, { transformOrigin: 'left center' })
          .to(wipe, { scaleX: 1, duration: 0.2, ease: 'power3.inOut' })
          .set(content, { opacity: 1 }, 0.16)
          .set(wipe, { transformOrigin: 'right center' }, 0.2)
          .to(wipe, { scaleX: 0, duration: 0.24, ease: 'power3.inOut' }, 0.2)
      }

      const revealItem = (item: HTMLElement) => {
        if (revealedItems.has(item)) return
        revealedItems.add(item)

        if (item.dataset.storyImage !== undefined) {
          gsap.to(item, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            overwrite: 'auto',
          })
          return
        }

        revealTextItem(item)
      }

      const allRevealItems = [...revealItems, ...storyImages]
      const revealActiveItems = () => {
        const trackPosition = Math.abs(Number(gsap.getProperty(track, 'x')))
        const revealPoint = trackPosition + window.innerWidth * 0.75

        allRevealItems.forEach((item) => {
          if (revealPoint >= getTrackOffset(item)) revealItem(item)
        })
      }

      const revealOnScroll = () => {
        allRevealItems.forEach((item) => {
          ScrollTrigger.create({
            trigger: item,
            start: 'top 82%',
            once: true,
            onEnter: () => revealItem(item),
          })
        })
      }

      return { f1, revealActiveItems, revealItem, revealOnScroll }
    }

    media.add('(min-width: 1024px)', () => {
      const revealController = createRevealController()
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${getScrollDistance() + window.innerHeight}`,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: revealController.revealActiveItems,
          onUpdate: revealController.revealActiveItems,
        },
      })

      timeline.to(
        track,
        {
          x: () => -getScrollDistance(),
          ease: 'none',
          duration: getScrollDistance,
        },
        0,
      )

      const viewportHeight = window.innerHeight
      appendF1RevealAnimation(
        timeline,
        revealController.f1,
        {
          question: viewportHeight * 0.08,
          masks: viewportHeight * 0.42,
          maskStagger: viewportHeight * 0.07,
          rule: viewportHeight * 0.05,
          label: viewportHeight * 0.06,
          titleIn: viewportHeight * 0.06,
          titleOut: viewportHeight * 0.08,
          support: viewportHeight * 0.05,
        },
        -20,
      )
    })

    media.add('(max-width: 1023px)', () => {
      const revealController = createRevealController()

      gsap.set(track, { clearProps: 'transform' })
      revealController.revealOnScroll()

      if (revealController.f1.stage && revealController.f1.endMarker) {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: revealController.f1.stage,
            endTrigger: revealController.f1.endMarker,
            start: 'top top',
            end: 'top bottom',
            scrub: 0.35,
            invalidateOnRefresh: true,
          },
        })

        appendF1RevealAnimation(
          timeline,
          revealController.f1,
          {
            question: 0.12,
            masks: 0.64,
            maskStagger: 0.08,
            rule: 0.08,
            label: 0.1,
            titleIn: 0.1,
            titleOut: 0.12,
            support: 0.1,
          },
          -16,
        )
      }

      const firstPanelItems = gsap.utils.toArray<HTMLElement>(
        track.querySelectorAll(
          '[data-story-panel]:first-child [data-story-reveal-item]',
        ),
      )

      firstPanelItems.forEach((item) => {
        if (item.getBoundingClientRect().top < window.innerHeight) {
          revealController.revealItem(item)
        }
      })
    })

    return () => media.revert()
  }, [])
}

function appendF1RevealAnimation(
  timeline: gsap.core.Timeline,
  targets: F1AnimationTargets,
  durations: F1AnimationDurations,
  questionOffset: number,
) {
  timeline
    .to(targets.question, {
      opacity: 0,
      y: questionOffset,
      duration: durations.question,
      ease: 'power2.inOut',
    })
    .to(
      targets.masks,
      {
        scaleY: 0,
        duration: durations.masks,
        ease: 'power3.inOut',
        stagger: { each: durations.maskStagger, from: 'end' },
      },
      '<',
    )
    .set(targets.copyOverlay, { visibility: 'visible' })
    .to(targets.copyRule, {
      scaleX: 1,
      duration: durations.rule,
      ease: 'power2.out',
    })
    .to(
      targets.copyLabel,
      {
        opacity: 1,
        y: 0,
        duration: durations.label,
        ease: 'power2.out',
      },
      '<',
    )
    .to(targets.titleWipe, {
      scaleX: 1,
      duration: durations.titleIn,
      ease: 'power3.inOut',
    })
    .set(targets.titleContent, { opacity: 1 })
    .set(targets.titleWipe, { transformOrigin: 'right center' })
    .to(targets.titleWipe, {
      scaleX: 0,
      duration: durations.titleOut,
      ease: 'power3.inOut',
    })
    .to(targets.copySupport, {
      opacity: 1,
      y: 0,
      duration: durations.support,
      ease: 'power2.out',
    })
}

function useStoryImagePreload() {
  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return

    let cancelled = false

    const preloadImages = async () => {
      for (const source of STORY_IMAGE_SOURCES) {
        if (cancelled) return

        const image = new Image()
        image.decoding = 'async'
        image.src = source

        try {
          await image.decode()
        } catch {
          // The visible image remains the fallback if pre-decoding is interrupted.
        }
      }
    }

    void preloadImages()

    return () => {
      cancelled = true
    }
  }, [])
}
