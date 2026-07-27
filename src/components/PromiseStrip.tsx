import { Layers, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { m } from 'motion/react'

import { inView, riseItem, staggerParent } from './motion'

const promises: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Layers,
    title: 'Mixed files together',
    body: 'HEIC, RAW, PSD, TIFF, WebP, and more.',
  },
  {
    icon: SlidersHorizontal,
    title: 'One set of rules',
    body: 'Choose format, size, quality, and destination once.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    body: 'Conversion stays on your Mac and originals remain untouched.',
  },
]

export function PromiseStrip() {
  return (
    <section className="border-y border-white/[0.07] bg-strip px-5 py-11 sm:px-8 lg:px-[84px]">
      <m.ul
        initial="hidden"
        whileInView="visible"
        viewport={inView}
        variants={staggerParent()}
        className="mx-auto flex max-w-[1272px] list-none flex-col gap-8 lg:flex-row lg:justify-between lg:gap-6"
      >
        {promises.map(({ icon: Icon, title, body }) => (
          <m.li
            key={title}
            variants={riseItem}
            className="flex w-full items-center gap-3.5 lg:w-[360px]"
          >
            <span className="grid size-[42px] shrink-0 place-items-center rounded-lg bg-white/[0.05] text-blue-soft shadow-[inset_0_0_0_1px_#FFFFFF17]">
              <Icon size={19} strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-display text-[18px] leading-tight font-bold text-white">{title}</h2>
              <p className="text-[14px] leading-[1.45] text-pretty text-white/70">{body}</p>
            </div>
          </m.li>
        ))}
      </m.ul>
    </section>
  )
}
