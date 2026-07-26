import type { Transition, Variants } from 'motion/react'

/** The design's decelerate curve, shared by every reveal on the page. */
export const easeOutSoft = [0.16, 1, 0.3, 1] as const

export const reveal: Transition = { duration: 0.7, ease: easeOutSoft }

/**
 * Parent/child pair for staggered entrances. Children inherit `hidden` and
 * `visible` from the parent, so only the parent needs `whileInView`.
 */
export const staggerParent = (stagger = 0.08, delay = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: reveal },
}

/** Viewport config: fire once, slightly before the element is fully on screen. */
export const inView = { once: true, margin: '0px 0px -12% 0px' } as const
