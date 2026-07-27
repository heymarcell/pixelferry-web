import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'

import { BrandMark } from '../BrandMark'
import { TRACKING_CONFIGURED, openCookieSettings } from '../../lib/consent'
import { cookieSchedule, type LegalDoc } from '../../data/legal'

const footerLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Cookie Policy', href: '/cookies' },
  { label: 'Contact', href: 'mailto:privacy@pixelferry.app' },
]

/** Highlights the section currently under the header while scrolling. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-96px 0px -70% 0px' },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [ids])

  return active
}

function CookieScheduleTable() {
  const rows = TRACKING_CONFIGURED
    ? [...cookieSchedule.alwaysSet, ...cookieSchedule.onConsent]
    : cookieSchedule.alwaysSet

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
      <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
        <thead className="bg-[#F1F3F7] text-[#374151]">
          <tr>
            {['Name', 'Provider', 'Purpose', 'Category', 'Duration'].map((h) => (
              <th key={h} className="border-r border-[#E5E7EB] px-2.5 py-3 font-semibold last:border-r-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[#4B5563]">
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-[#E5E7EB]">
              <td className="border-r border-[#E5E7EB] px-2.5 py-3.5 font-mono text-[12px] text-[#111827]">
                {row.name}
              </td>
              <td className="border-r border-[#E5E7EB] px-2.5 py-3.5">{row.provider}</td>
              <td className="border-r border-[#E5E7EB] px-2.5 py-3.5">{row.purpose}</td>
              <td className="border-r border-[#E5E7EB] px-2.5 py-3.5">{row.category}</td>
              <td className="px-2.5 py-3.5">{row.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LegalPage({ doc, current }: { doc: LegalDoc; current: '/privacy' | '/cookies' }) {
  const active = useActiveSection(doc.sections.map((s) => s.id))

  return (
    <div className="min-h-dvh bg-[#F7F8FA]">
      <header className="flex h-[74px] items-center justify-between bg-void px-5 sm:px-8 lg:px-16">
        <a href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="PixelFerry — home">
          <BrandMark size={30} />
          <span className="font-display text-[21px] font-bold text-white">PixelFerry</span>
        </a>
        <a href="/" className="flex items-center gap-2 rounded text-[14px] font-semibold text-white/80 hover:text-white">
          <ArrowLeft size={16} strokeWidth={2} className="text-white/60" aria-hidden="true" />
          Back to home
        </a>
      </header>

      <div className="border-b border-[#E5E7EB] bg-white px-5 py-14 sm:px-8 lg:px-[180px] lg:pt-[72px] lg:pb-16">
        <div className="mx-auto flex max-w-[1080px] flex-col items-start gap-4.5">
          <span className="rounded-full bg-[#FFF4E5] px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.7px] text-[#8A4B08] ring-1 ring-[#F59E0B33]">
            DRAFT FOR LEGAL REVIEW
          </span>
          <h1 className="font-display text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.05] font-bold tracking-display text-[#111827]">
            {doc.title}
          </h1>
          <p className="max-w-[800px] text-[18px] leading-[1.55] text-[#4B5563]">{doc.intro}</p>
          <p className="text-[14px] font-semibold text-[#6B7280]">Effective date: {doc.effectiveDate}</p>
        </div>
      </div>

      <div className="px-5 py-16 sm:px-8 lg:px-[180px] lg:pt-16 lg:pb-24">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-10 lg:flex-row lg:gap-14">
          <nav aria-label="Contents" className="lg:sticky lg:top-8 lg:h-fit lg:w-60 lg:shrink-0">
            <div className="flex flex-col gap-3.5 rounded-lg border border-[#E5E7EB] bg-white p-5">
              <p className="font-mono text-[10px] font-bold tracking-[1px] text-[#6B7280]">CONTENTS</p>
              {doc.sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  aria-current={active === s.id ? 'true' : undefined}
                  className={`rounded text-[14px] transition-colors ${
                    active === s.id ? 'font-bold text-[#0055B8]' : 'font-medium text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  {s.nav}
                </a>
              ))}
            </div>
          </nav>

          <article className="flex min-w-0 max-w-[780px] flex-col gap-10">
            <div className="flex flex-col gap-3 rounded-lg border border-[#0062FF24] bg-[#E8F1FF] p-6">
              <h2 className="font-display text-[24px] font-bold text-[#003B9B]">{doc.summaryTitle}</h2>
              <p className="text-[16px] leading-[1.55] text-[#1E3A5F]">{doc.summaryBody}</p>
            </div>

            {doc.sections.map((s) => (
              <section key={s.id} id={s.id} className="flex scroll-mt-24 flex-col gap-3">
                <h2 className="font-display text-[clamp(1.375rem,2.2vw,1.75rem)] font-bold tracking-[-0.4px] text-[#111827]">
                  {s.heading}
                </h2>
                {/* `pre-line` keeps the design's bullets and paragraph breaks byte-for-byte. */}
                <p className="text-[16px] leading-[1.65] whitespace-pre-line text-[#4B5563]">{s.body}</p>
                {s.id === 'cookie-schedule' && <CookieScheduleTable />}
                {s.id === 'cookie-schedule' && (
                  <button
                    type="button"
                    onClick={openCookieSettings}
                    className="mt-1 self-start rounded text-[14px] font-bold text-[#0055B8] underline-offset-4 hover:underline"
                  >
                    Change your cookie choices
                  </button>
                )}
              </section>
            ))}
          </article>
        </div>
      </div>

      <footer className="bg-void px-5 py-8 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-[1312px] flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-[13px] font-medium text-white/50">© 2026 PixelFerry</p>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {footerLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                aria-current={href === current ? 'page' : undefined}
                className={`rounded text-[13px] font-semibold ${
                  href === current ? 'text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
