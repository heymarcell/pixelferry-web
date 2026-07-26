import { m } from 'motion/react'

import { ControlsBar, SummaryBar, WindowChrome } from './Chrome'
import { FileRow } from './FileRow'
import { easeOutSoft, inView } from '../motion'
import { queue } from '../../data/queue'

/**
 * A static, non-interactive rendering of the PixelFerry window. It is exposed
 * to assistive tech as a single image so the simulated buttons never read as
 * real controls.
 */
export function AppPreview() {
  return (
    <m.div
      initial={{ opacity: 0, y: 40, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={inView}
      transition={{ duration: 0.9, ease: easeOutSoft }}
      role="img"
      aria-label="The PixelFerry window: a queue of 24 mixed image files — HEIC, CR3 RAW, PSD, TIFF and WebP — converting to PNG, with 18 done, 2 converting, 4 ready and one failed file offering a retry."
      className="app-preview mx-auto flex w-full max-w-[1100px] flex-col overflow-hidden rounded-xl bg-ap-window shadow-[inset_0_0_0_1px_#FFFFFF26,0_32px_70px_-16px_#00000099,0_10px_90px_-24px_#0062FF3D] lg:h-[670px]"
    >
      <WindowChrome />
      <SummaryBar />

      <m.ol
        initial="hidden"
        whileInView="visible"
        viewport={inView}
        className="flex flex-1 list-none flex-col gap-2.5 bg-ap-queue p-4 sm:px-5"
      >
        {queue.map((row, i) => (
          <FileRow key={row.id} row={row} index={i} />
        ))}
      </m.ol>

      <ControlsBar />
    </m.div>
  )
}
