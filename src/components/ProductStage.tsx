import { m } from 'motion/react'

import { AppPreview } from './preview/AppPreview'
import { inView, riseItem, staggerParent } from './motion'

export function ProductStage() {
  return (
    <section id="preview" className="px-5 pb-20 sm:px-8 md:pb-[110px] lg:px-16">
      <m.div
        initial="hidden"
        whileInView="visible"
        viewport={inView}
        variants={staggerParent(0.1)}
        className="mx-auto flex max-w-[1312px] flex-col items-center gap-7"
      >
        <m.div
          variants={riseItem}
          className="flex flex-wrap items-center justify-center gap-2.5 text-center"
        >
          <span className="font-mono text-[11px] font-bold tracking-[1.2px] text-blue-soft">
            A FIRST LOOK
          </span>
          <span aria-hidden="true" className="h-px w-14 bg-[#7FA4FF66]" />
          <span className="text-[14px] font-semibold text-white/60">One queue. One set of rules.</span>
        </m.div>

        <AppPreview />
      </m.div>
    </section>
  )
}
