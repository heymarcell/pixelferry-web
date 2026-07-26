import { BrandMark } from './BrandMark'
import { TRACKING_CONFIGURED, openCookieSettings } from '../lib/consent'

const links = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Cookies', href: '/cookies' },
  { label: 'Contact', href: 'mailto:hello@pixelferry.app' },
]

export function Footer() {
  return (
    <footer className="bg-void px-5 py-8 sm:px-8 lg:px-16">
      <div className="mx-auto flex max-w-[1312px] flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:gap-8 sm:text-left">
        <div className="flex items-center gap-2.5">
          <BrandMark size={26} radius={7} />
          <span className="font-display text-[17px] font-bold text-white/80">PixelFerry</span>
        </div>

        <p className="text-[12px] font-medium text-white/40">
          © 2026 PixelFerry · Private beta coming soon
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-6">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="rounded text-[13px] font-semibold text-white/56 transition-colors hover:text-white"
            >
              {label}
            </a>
          ))}
          {/* Withdrawal must stay as reachable as the original opt-in. */}
          {TRACKING_CONFIGURED && (
            <button
              type="button"
              onClick={openCookieSettings}
              className="rounded text-[13px] font-semibold text-white/56 transition-colors hover:text-white"
            >
              Cookie settings
            </button>
          )}
        </nav>
      </div>
    </footer>
  )
}
