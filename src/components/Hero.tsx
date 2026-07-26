import { Sparkles } from 'lucide-react'
import { m } from 'motion/react'

import { LightStreaks } from './LightStreaks'
import { WaitlistForm } from './WaitlistForm'
import { riseItem, staggerParent } from './motion'

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-5 pt-14 pb-20 sm:px-8 lg:px-16 lg:pt-[78px] lg:pb-[112px]"
    >
      <LightStreaks />

      <m.div
        initial="hidden"
        animate="visible"
        variants={staggerParent(0.09, 0.06)}
        className="relative mx-auto flex max-w-[1120px] flex-col items-center gap-6 text-center"
      >
        <m.p
          variants={riseItem}
          className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3.5 py-2 shadow-[inset_0_0_0_1px_#FFFFFF1F]"
        >
          <Sparkles size={15} strokeWidth={2} className="text-blue-soft" aria-hidden="true" />
          <span className="font-mono text-[11px] font-bold tracking-[0.8px] text-white/80">
            PRIVATE MAC BETA · OPENING SOON
          </span>
        </m.p>

        <m.h1
          variants={riseItem}
          className="font-display text-[clamp(2.6rem,5.97vw,5.375rem)] leading-[0.96] font-bold text-balance tracking-display text-white"
        >
          <span className="block">Mixed formats.</span>
          <span className="block">One clean batch.</span>
        </m.h1>

        <m.p
          variants={riseItem}
          className="max-w-[690px] text-[clamp(1rem,1.32vw,1.1875rem)] leading-[1.55] text-pretty text-white/72"
        >
          Turn mixed HEIC, RAW, PSD, TIFF, and WebP files into one consistent delivery. Join the beta
          waitlist.
        </m.p>

        <m.div variants={riseItem} className="flex w-full justify-center pt-1">
          <WaitlistForm />
        </m.div>

        {/* The consent checkbox above already carries the Privacy Policy link,
            so this line keeps the reassurance without duplicating it. */}
        <m.p variants={riseItem} className="text-[13px] font-medium text-white/45">
          Launch updates only. Unsubscribe anytime.
        </m.p>

        <m.p variants={riseItem} className="text-[14px] font-semibold text-white/60">
          macOS 13+ · Apple silicon and Intel · Local conversion · Originals untouched
        </m.p>
      </m.div>
    </section>
  )
}
