import { ChevronDown, Plus, Scaling, Send, Settings, SlidersHorizontal, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { HeaderMark } from '../BrandMark'
import { summary } from '../../data/queue'

/*
 * Shared glass treatment for the toolbar pills (light theme tokens). The
 * `image:`/`color:` hints keep Tailwind from emitting a gradient as a
 * `background-color`, which browsers discard outright.
 */
const glassPill =
  'bg-[image:linear-gradient(180deg,#00000012,#00000004)] bg-[color:#00000008] shadow-[inset_0_0_0_1px_#00000024,0_0.5px_0.5px_#00000008]'

export function WindowChrome() {
  return (
    <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-ap-hairline bg-ap-window px-3 sm:px-[18px]">
      <div className="flex w-16 items-center gap-2 sm:w-20">
        {(['#FF5F57', '#FEBC2E', '#28C840'] as const).map((color) => (
          <span key={color} className="size-3 rounded-full" style={{ backgroundColor: color }} />
        ))}
      </div>

      <div className="flex items-center gap-2.5 text-ap-mark">
        <HeaderMark />
        <span className="text-[15px] font-semibold text-ap-chrome">PixelFerry</span>
      </div>

      <div className="flex w-16 items-center justify-end sm:w-20">
        <span className="grid size-8 place-items-center rounded-[9px] bg-ap-glass text-ap-chrome shadow-[inset_0_0_0_1px_#00000014]">
          <Settings size={15} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
    </header>
  )
}

/*
 * Counts drop off from the right as the window narrows — the file total and
 * overall size are the two that always survive.
 */
const counts = [
  { text: summary.done, tone: 'text-ap-success-text', at: 'flex' },
  { text: summary.converting, tone: 'text-ap-accent-text', at: 'hidden sm:flex' },
  { text: summary.ready, tone: 'text-[#6B7280]', at: 'hidden md:flex' },
]

export function SummaryBar() {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ap-divider bg-[image:linear-gradient(0deg,#00000006,#00000004)] bg-[color:#00000004] px-4 py-2.5 text-[12px] sm:px-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className="shrink-0 font-semibold text-ap-label">{summary.files}</span>
        {counts.map(({ text, tone, at }) => (
          <span key={text} className={`${at} shrink-0 items-center gap-2 sm:gap-3`}>
            <span aria-hidden="true" className="text-ap-dim">
              ·
            </span>
            <span className={tone}>{text}</span>
          </span>
        ))}
      </div>
      <span className="shrink-0 text-ap-label">{summary.total}</span>
    </div>
  )
}

/*
 * `display` is the caller's to set. Tailwind orders `hidden` and `inline-flex`
 * by its own rules, not by class-attribute order, so baking `inline-flex` in
 * here would silently beat any responsive `hidden` a caller passes.
 */
function Pill({
  icon: Icon,
  label,
  chevron,
  display = 'inline-flex',
}: {
  icon?: LucideIcon
  label?: string
  chevron?: boolean
  display?: string
}) {
  return (
    <span
      className={`${display} h-[34px] shrink-0 items-center gap-[5px] rounded-[17px] px-2.5 text-[12px] font-medium whitespace-nowrap text-ap-label ${glassPill}`}
    >
      {Icon && <Icon size={16} strokeWidth={2} className="text-ap-dim" aria-hidden="true" />}
      {label}
      {chevron && <ChevronDown size={12} strokeWidth={2.5} className="text-ap-dim" aria-hidden="true" />}
    </span>
  )
}

export function ControlsBar() {
  return (
    <footer className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-ap-divider bg-ap-window px-4">
      <div className="flex items-center gap-2">
        {/* Output format — the one pill the design tints with the accent. */}
        <span className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[17px] bg-[image:linear-gradient(180deg,#005FCC12,#007AFF05)] bg-[color:#005FCC12] px-3 text-[12px] font-semibold tracking-[0.5px] text-ap-accent-text shadow-[inset_0_0_0_1px_#005FCC30,0_0.5px_0.5px_#005FCC12]">
          PNG
          <ChevronDown size={12} strokeWidth={2.5} className="text-[#0055B8CC]" aria-hidden="true" />
        </span>

        <span className={`grid size-[34px] shrink-0 place-items-center rounded-[17px] ${glassPill}`}>
          <SlidersHorizontal size={16} strokeWidth={2} className="text-ap-dim" aria-hidden="true" />
        </span>

        <Pill icon={Scaling} label="None" display="hidden md:inline-flex" />
        <Pill icon={Send} label="Save · Input folder" chevron display="hidden lg:inline-flex" />
      </div>

      <div className="flex items-center gap-2">
        <Pill icon={Plus} label="Add Files" display="hidden md:inline-flex" />
        <Pill label="Clear Queue" display="hidden lg:inline-flex" />

        <span className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[17px] bg-[image:linear-gradient(180deg,#0757B8,#004FAF)] px-4 text-[12px] font-semibold tracking-[0.3px] whitespace-nowrap text-white shadow-[0_4px_12px_#005FCC40,0_0.5px_1px_#00000030]">
          <Zap size={14} strokeWidth={2.5} aria-hidden="true" />
          Convert All
        </span>
      </div>
    </footer>
  )
}
