import { useEffect, useId, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'

import { easeOutSoft } from './motion'
import {
  OPEN_SETTINGS_EVENT,
  TRACKING_CONFIGURED,
  initConsent,
  readConsent,
  saveConsent,
  type ConsentCategory,
} from '../lib/consent'

const categories: { key: ConsentCategory; label: string; description: string }[] = [
  {
    key: 'analytics',
    label: 'Analytics',
    description:
      'Google Analytics, loaded through Google Tag Manager, to measure visits and improve the launch page.',
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Meta Pixel, used to measure and target advertising for the launch.',
  },
]

const btn =
  'h-[42px] w-full rounded-md px-4 text-[14px] font-bold transition-colors duration-150 sm:w-40'

export function CookieConsent() {
  const titleId = useId()
  // Computed during render so the banner's first paint already reflects a
  // stored decision, rather than flashing in and back out from an effect.
  const [open, setOpen] = useState(() => TRACKING_CONFIGURED && !readConsent())
  const [managing, setManaging] = useState(false)
  const [choice, setChoice] = useState<Record<ConsentCategory, boolean>>({
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    // Nothing to consent to when no tag IDs are configured — showing a banner
    // for storage that does not exist would be misleading.
    if (!TRACKING_CONFIGURED) return
    // Re-applies a stored decision (and loads only what was granted).
    initConsent()

    const reopen = () => {
      const stored = readConsent()
      setChoice({ analytics: stored?.analytics ?? false, marketing: stored?.marketing ?? false })
      setManaging(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen)
  }, [])

  if (!TRACKING_CONFIGURED) return null

  const decide = (next: Record<ConsentCategory, boolean>) => {
    saveConsent(next)
    setOpen(false)
    setManaging(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <m.div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.45, ease: easeOutSoft }}
          className="fixed inset-x-0 bottom-0 z-[100] bg-[#11141D] px-5 py-6 shadow-[0_-8px_24px_#00000066] ring-1 ring-white/12 sm:px-8 lg:px-12"
        >
          <div className="mx-auto flex max-w-[1344px] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="flex min-w-0 flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-blue/12 text-blue-soft shadow-[inset_0_0_0_1px_#0062FF33]">
                  <ShieldCheck size={19} strokeWidth={2} aria-hidden="true" />
                </span>
                <h2 id={titleId} className="font-display text-[19px] font-bold text-white">
                  We use cookies
                </h2>
              </div>

              <p className="max-w-[760px] text-[14px] leading-[1.5] text-white/70">
                Essential cookies keep the waitlist working. With your permission, analytics help us
                understand visits and improve the launch page.
              </p>

              {managing && (
                <ul className="flex list-none flex-col gap-3 pt-2">
                  <li className="flex items-start gap-3 text-[13px] text-white/60">
                    <span className="mt-0.5 rounded bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70">
                      Always on
                    </span>
                    <span>Strictly necessary: security, routing, the waitlist form, and this choice.</span>
                  </li>
                  {categories.map(({ key, label, description }) => (
                    <li key={key} className="flex items-start gap-3">
                      <input
                        id={`consent-${key}`}
                        type="checkbox"
                        checked={choice[key]}
                        onChange={(e) => setChoice((c) => ({ ...c, [key]: e.target.checked }))}
                        className="mt-0.5 size-[18px] shrink-0 accent-blue"
                      />
                      <label htmlFor={`consent-${key}`} className="text-[13px] leading-[1.45] text-white/70">
                        <span className="font-semibold text-white/90">{label}</span> — {description}
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-4.5 pt-1">
                <a href="/privacy" className="rounded text-[13px] font-semibold text-white/60 hover:text-white">
                  Privacy policy
                </a>
                <a href="/cookies" className="rounded text-[13px] font-semibold text-white/60 hover:text-white">
                  Cookie policy
                </a>
              </div>
            </div>

            {/* Refusing is exactly as easy as accepting — same size, same prominence. */}
            <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:w-[520px] lg:justify-end">
              <button
                type="button"
                onClick={() => decide({ analytics: false, marketing: false })}
                className={`${btn} bg-[#242934] text-white/85 ring-1 ring-white/17 hover:bg-[#2c323f]`}
              >
                Reject optional
              </button>

              {managing ? (
                <button
                  type="button"
                  onClick={() => decide(choice)}
                  className={`${btn} bg-[#11141D] text-white/85 ring-1 ring-white/17 hover:bg-[#191d28]`}
                >
                  Save choices
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setManaging(true)}
                  className={`${btn} bg-[#11141D] text-white/85 ring-1 ring-white/17 hover:bg-[#191d28]`}
                >
                  Manage choices
                </button>
              )}

              <button
                type="button"
                onClick={() => decide({ analytics: true, marketing: true })}
                className={`${btn} bg-blue text-white shadow-[0_5px_14px_-4px_#0062FF45] hover:bg-[#1A73FF]`}
              >
                Accept optional
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
