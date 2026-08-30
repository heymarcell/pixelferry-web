import { initConsent, readConsent, saveConsent, type ConsentCategory } from './consent'

/**
 * Wiring for the cookie banner. Loaded only when a tag ID is configured — see
 * CookieConsent.astro, which renders neither the markup nor this script
 * otherwise.
 *
 * The banner markup ships hidden in the HTML rather than being built by this
 * script, so it costs no JS to render and cannot flash in and back out.
 */
export function initCookieBanner(): void {
  const banner = document.querySelector<HTMLElement>('[data-cookie-banner]')
  if (!banner) return

  const detail = banner.querySelector<HTMLElement>('[data-cookie-detail]')
  const manageBtn = banner.querySelector<HTMLElement>('[data-consent-action="manage"]')
  const saveBtn = banner.querySelector<HTMLElement>('[data-consent-action="save"]')
  const boxes = Array.from(
    banner.querySelectorAll<HTMLInputElement>('input[data-consent-category]'),
  )

  /* Re-applies a stored decision, loading only what was granted. */
  const stored = initConsent()
  if (!stored) banner.hidden = false

  function readChoice(): Record<ConsentCategory, boolean> {
    const choice: Record<ConsentCategory, boolean> = { analytics: false, marketing: false }
    for (const box of boxes) {
      const key = box.dataset.consentCategory as ConsentCategory | undefined
      if (key) choice[key] = box.checked
    }
    return choice
  }

  function decide(choice: Record<ConsentCategory, boolean>) {
    saveConsent(choice)
    banner!.hidden = true
    showDetail(false)
  }

  function showDetail(open: boolean) {
    if (detail) detail.hidden = !open
    if (manageBtn) manageBtn.hidden = open
    if (saveBtn) saveBtn.hidden = !open
  }

  banner.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-consent-action]')
    if (!target) return

    switch (target.dataset.consentAction) {
      case 'reject':
        return decide({ analytics: false, marketing: false })
      case 'accept':
        return decide({ analytics: true, marketing: true })
      case 'manage':
        return showDetail(true)
      case 'save':
        return decide(readChoice())
    }
  })

  /* Withdrawal must stay as reachable as the original opt-in. */
  for (const trigger of document.querySelectorAll<HTMLElement>('[data-cookie-settings]')) {
    trigger.addEventListener('click', () => {
      const current = readConsent()
      for (const box of boxes) {
        const key = box.dataset.consentCategory as ConsentCategory | undefined
        if (key) box.checked = current?.[key] ?? false
      }
      showDetail(true)
      banner.hidden = false
      banner.querySelector<HTMLElement>('[data-consent-action="reject"]')?.focus()
    })
  }
}
