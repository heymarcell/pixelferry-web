import { mount } from './bootstrap'
import { CookieConsent } from './components/CookieConsent'
import { LegalPage } from './components/legal/LegalPage'
import { cookiePolicy } from './data/legal'

mount(
  <>
    <LegalPage doc={cookiePolicy} current="/cookies" />
    <CookieConsent />
  </>,
)
