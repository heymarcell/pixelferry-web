import {
  Check,
  CircleCheck,
  Copy,
  FolderOpen,
  Loader,
  Play,
  RefreshCw,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { m } from 'motion/react'

import { easeOutSoft } from '../motion'
import type { QueueRow, RowStatus } from '../../data/queue'

/*
 * The row's surface treatment, per status, straight from the Pencil tokens.
 * The `image:`/`color:` hints are load-bearing — without them Tailwind guesses
 * `background-color` for a gradient value and the browser drops the rule.
 */
const sheen = 'bg-[image:linear-gradient(180deg,#00000010,#00000003)]'

const surface: Record<RowStatus, string> = {
  complete: `${sheen} bg-[color:#00000006] shadow-[inset_0_0_0_1px_#00000022,0_1px_3px_#00000006]`,
  converting: `${sheen} bg-[color:#00000008] shadow-[inset_0_0_0_1px_#0000002E,0_1px_3px_#00000006]`,
  ready: `${sheen} bg-[color:#00000006] shadow-[inset_0_0_0_1px_#00000022,0_0.5px_1px_#00000006]`,
  error: 'bg-ap-error-fill shadow-[inset_0_0_0_1px_#B4231824,0_1px_3px_#FF3B3008]',
}

type BadgeSpec = { icon: LucideIcon; label: string; className: string; spin?: boolean }

const badges: Record<RowStatus, BadgeSpec> = {
  complete: {
    icon: Check,
    label: 'Done',
    className: 'bg-ap-success-fill text-ap-success shadow-[inset_0_0_0_1px_#30D15830]',
  },
  converting: {
    icon: Loader,
    label: 'Converting',
    className: 'bg-ap-accent-fill text-ap-accent shadow-[inset_0_0_0_1px_#005FCC28]',
    spin: true,
  },
  ready: {
    icon: CircleCheck,
    label: 'Ready',
    className: 'bg-ap-glass text-ap-label shadow-[inset_0_0_0_1px_#00000024]',
  },
  error: {
    icon: TriangleAlert,
    label: 'Error',
    className: 'bg-[#B423180A] text-ap-error shadow-[inset_0_0_0_1px_#B4231820]',
  },
}

/** Action affordances shown at the right edge of a row, per status. */
const actions: Record<RowStatus, { icon: LucideIcon; label: string; accent?: boolean }[]> = {
  complete: [
    { icon: RefreshCw, label: 'Convert again' },
    { icon: Copy, label: 'Copy path' },
    { icon: FolderOpen, label: 'Open folder' },
    { icon: X, label: 'Remove' },
  ],
  converting: [],
  ready: [
    { icon: Play, label: 'Convert', accent: true },
    { icon: X, label: 'Remove' },
  ],
  error: [
    { icon: RefreshCw, label: 'Retry' },
    { icon: X, label: 'Remove' },
  ],
}

function StatusBadge({ status }: { status: RowStatus }) {
  const { icon: Icon, label, className, spin } = badges[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[12px] leading-none font-medium ${className}`}
    >
      <Icon size={14} strokeWidth={2} className={spin ? 'animate-[spin-slow_1.6s_linear_infinite]' : ''} />
      {label}
    </span>
  )
}

export function FileRow({ row, index }: { row: QueueRow; index: number }) {
  const rowActions = actions[row.status]

  return (
    <m.li
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: easeOutSoft, delay: 0.35 + index * 0.06 },
        },
      }}
      className={`relative flex h-14 items-center gap-3 overflow-hidden rounded-2xl px-4 ${surface[row.status]}`}
    >
      <img
        src={row.thumb}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        decoding="async"
        className="size-9 shrink-0 rounded-[10px] bg-ap-glass object-cover"
      />

      <div className={`flex min-w-0 flex-1 flex-col ${row.status === 'converting' ? 'gap-1.5' : 'gap-0.5'}`}>
        <span className="truncate text-[13px] leading-tight font-medium text-ap-ink">{row.name}</span>
        <span className="truncate text-[12px] leading-tight text-ap-dim">{row.meta}</span>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3">
        <div className="flex h-8 items-center justify-end sm:w-[120px]">
          <StatusBadge status={row.status} />
        </div>

        {/* Below `lg` the window is too narrow for the action cluster; the
            status badge alone still communicates the row's state. */}
        <div className="hidden h-8 w-[140px] items-center justify-end gap-1 lg:flex">
          {rowActions.map(({ icon: Icon, label, accent }) => (
            <span
              key={label}
              title={label}
              className={`grid size-8 place-items-center rounded-lg ${
                accent ? 'text-ap-accent-text' : label === 'Remove' ? 'text-ap-label' : 'text-ap-dim'
              }`}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>

      {row.status === 'converting' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden"
        >
          <span className="block h-full w-[30%] rounded-sm bg-[image:linear-gradient(90deg,#007AFF04,#0055B8_50%,#007AFF04)] animate-[sweep_2.4s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
        </span>
      )}
    </m.li>
  )
}
