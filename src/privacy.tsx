import { mount } from './bootstrap'
import { CookieConsent } from './components/CookieConsent'
import { LegalPage } from './components/legal/LegalPage'
import { privacyPolicy } from './data/legal'

mount(
  <>
    <LegalPage doc={privacyPolicy} current="/privacy" />
    <CookieConsent />
  </>,
)
