/*
 * Legal copy transcribed verbatim from the Pencil design's `Legal — Privacy
 * Policy` (KKbOI) and `Legal — Cookie Policy` (n0zten) frames.
 *
 * DO NOT rewrite this text. It is drafted copy pending legal review, and the
 * bracketed placeholders are deliberate — they must be filled in with the real
 * entity details before publication, not paraphrased away.
 */

export type LegalSection = {
  /** Anchor id, also used by the contents sidebar. */
  id: string
  /** Short label in the contents sidebar. */
  nav: string
  heading: string
  body: string
}

export type LegalDoc = {
  title: string
  intro: string
  effectiveDate: string
  summaryTitle: string
  summaryBody: string
  sections: LegalSection[]
}

export const EFFECTIVE_DATE = '2026-07-25'

export const privacyPolicy: LegalDoc = {
  title: 'Privacy Policy',
  intro:
    'This Privacy Policy explains how neongod LLC, operating the PixelFerry website and waitlist, collects and processes personal data. It currently applies only to the website at pixelferry.app and the associated email waitlist, not to the desktop application.',
  effectiveDate: EFFECTIVE_DATE,
  summaryTitle: 'Current scope',
  summaryBody:
    'The landing page collects only waitlist email registrations and the consent records needed to prove signup. No analytics, advertising, tracking pixels, session recording, or image uploads are assumed. A revised policy must be published before the app collects additional personal data.',
  sections: [
    {
      id: 'data-controller',
      nav: '1. Data controller',
      heading: '1. Data controller',
      body: `The controller responsible for your personal data is:

neongod LLC
Principal address: 447 Broadway, 2nd Floor, New York, NY 10013, United States
State of organisation: Wyoming, United States
Email: [PRIVACY EMAIL ADDRESS]

EU or EEA representative under Article 27 GDPR: not yet appointed. One will be designated and named here before the beta opens.`,
    },
    {
      id: 'personal-data',
      nav: '2. Personal data',
      heading: '2. Personal data we process',
      body: `WAITLIST REGISTRATION AND EMAIL UPDATES

When you join the PixelFerry waitlist, we process:
• Your email address
• The date and time of registration
• The verbatim consent wording you agreed to, and when
• The version of the consent wording and Privacy Policy presented to you
• The signup source or webpage
• A salted, one-way pseudonym derived from your IP address, used to document registration and limit abuse. Your IP address itself is never stored

We use this information to register you for the waitlist, confirm your email address, send launch and early-access updates, manage unsubscribe requests, and demonstrate that valid consent was obtained. The legal basis is consent under Article 6(1)(a) GDPR. Providing your email is voluntary.

WEBSITE OPERATION AND SECURITY

Hosting and infrastructure providers may process limited technical information such as IP address, browser and device type, requested pages, request time, referrer, and error or security data. The legal basis is our legitimate interest under Article 6(1)(f) GDPR in operating and protecting the website. We do not use this information to create marketing profiles.`,
    },
    {
      id: 'email-consent',
      nav: '3. Email consent',
      heading: '3. Email consent and withdrawal',
      body: `You may withdraw consent at any time by selecting the unsubscribe link in an email or contacting [PRIVACY EMAIL ADDRESS]. Withdrawal does not affect processing carried out before consent was withdrawn. Unsubscribing is free.

After you unsubscribe, we stop marketing and product-update emails. We may retain a limited suppression record so we can respect your request and avoid contacting you again.`,
    },
    {
      id: 'retention',
      nav: '4. Retention',
      heading: '4. Retention periods',
      body: `• Waitlist email and registration data: kept as the record of your consent, and deleted when you ask us to erase it. NOTE — there is currently no automated deletion schedule for this data; a retention period will be set before this policy leaves draft.
• Website security and server logs: normally no longer than 30 days, unless needed to investigate an incident
• Suppression records: minimum information may be retained for up to five years
• Compliance records: consent and withdrawal records may be retained for the applicable legal limitation period

Information may be retained longer where required by law or needed to establish, exercise, or defend legal claims.`,
    },
    {
      id: 'service-providers',
      nav: '5. Service providers',
      heading: '5. Service providers and recipients',
      body: `We may disclose personal data to providers acting on our instructions:
• Website hosting and content delivery: Cloudflare, Inc. (United States), which serves this site and the waitlist API
• Bot protection on the signup form: Cloudflare Turnstile, operated by the same provider
• Email and waitlist list management, including the confirmation email: Brevo (Sendinblue SAS, France)

Providers may process data only for the services they provide and must protect it under appropriate contractual and security obligations. We may disclose information where required by law or needed for legal claims. We do not sell personal data.`,
    },
    {
      id: 'transfers',
      nav: '6. Transfers',
      heading: '6. International transfers',
      body: `Cloudflare, Inc. is established in the United States, so personal data processed by it is transferred outside the European Economic Area. Brevo (Sendinblue SAS) is established in France. Where data is transferred outside the EEA, we use an applicable safeguard, which may include:
• A European Commission adequacy decision
• EU Standard Contractual Clauses
• The EU-US Data Privacy Framework, where applicable
• Additional contractual, organizational, or technical safeguards

Contact us for information about the safeguards used.`,
    },
    {
      id: 'your-rights',
      nav: '7. Your rights',
      heading: '7. Your rights',
      body: `Subject to applicable conditions and exceptions, you may have the right to:
• Confirm whether we process your data
• Request access or correction
• Request deletion or restriction
• Receive data you provided in a structured, machine-readable format
• Withdraw consent at any time
• Object to legitimate-interest processing
• Object to direct marketing
• Lodge a complaint with a data protection authority

To exercise rights, contact [PRIVACY EMAIL ADDRESS]. We normally respond within one month and may request information needed to confirm identity.`,
    },
    {
      id: 'complaints',
      nav: '8. Complaints',
      heading: '8. Complaints',
      body: `You may complain to the data protection authority where you live, work, or believe an infringement occurred.

Hungarian National Authority for Data Protection and Freedom of Information, NAIH
1055 Budapest, Falk Miksa utca 9-11
Hungary

We encourage you to contact us first so we can attempt to resolve your concern.`,
    },
    {
      id: 'automated-decisions',
      nav: '9. Automated decisions',
      heading: '9. Automated decision-making',
      body: 'We do not use waitlist data for automated decision-making or profiling that produces legal or similarly significant effects.',
    },
    {
      id: 'children',
      nav: '10. Children',
      heading: '10. Children',
      body: "The PixelFerry waitlist is not directed to children under 16. If we learn that a child's personal data was collected without valid authorization, we will delete it where required.",
    },
    {
      id: 'security',
      nav: '11. Security',
      heading: '11. Security',
      body: 'We use reasonable technical and organizational measures designed to protect personal data against unauthorized access, disclosure, alteration, loss, or destruction. No internet transmission or electronic storage method is completely secure, and absolute security cannot be guaranteed.',
    },
    {
      id: 'changes',
      nav: '12. Changes',
      heading: '12. Changes to this policy',
      body: 'We may update this Privacy Policy when the website, application, providers, or processing activities change. The latest version will be published with an updated effective date. Where a change materially affects consent-based processing, we will request new consent where required.',
    },
    {
      id: 'contact',
      nav: '13. Contact',
      heading: '13. Contact',
      body: `Questions, requests, and complaints may be sent to:

neongod LLC
Email: [PRIVACY EMAIL ADDRESS]
Address: 447 Broadway, 2nd Floor, New York, NY 10013, United States`,
    },
  ],
}

export const cookiePolicy: LegalDoc = {
  title: 'Cookie Policy',
  intro:
    'This Cookie Policy explains how neongod LLC, operating PixelFerry, uses cookies and similar technologies on pixelferry.app.',
  effectiveDate: EFFECTIVE_DATE,
  summaryTitle: 'Plain-language summary',
  summaryBody:
    'The PixelFerry coming-soon website assumes no analytics, advertising, tracking pixels, session recording, or marketing attribution. Only technologies strictly necessary for security, routing, the waitlist form, and privacy preferences may be used.',
  sections: [
    {
      id: 'what-cookies-are',
      nav: '1. What cookies are',
      heading: '1. What cookies and similar technologies are',
      body: 'Cookies are small text files placed on a device when a website is visited. Similar technologies include local storage, session storage, tracking pixels, tags, software-development kits, and device or browser identifiers. This policy refers to these technologies collectively as cookies unless stated otherwise.',
    },
    {
      id: 'cookies-used',
      nav: '2. Cookies currently used',
      heading: '2. Cookies currently used',
      body: `The PixelFerry coming-soon website does not currently use cookies for:
• Advertising
• Cross-site tracking
• Behavioral profiling
• Personalized advertising
• Audience measurement
• Marketing attribution
• Session recording

The site may use strictly necessary cookies or similar technologies for website security, network routing, load balancing, fraud prevention, processing the waitlist form, and remembering privacy choices where a preference tool is implemented. Strictly necessary technologies cannot be disabled through the website because the requested service could not be provided securely or correctly without them.`,
    },
    {
      id: 'cookie-schedule',
      nav: '3. Cookie schedule',
      heading: '3. Cookie schedule',
      body: 'The final schedule must reflect technologies found on the live production website. Remove unused rows and do not publish placeholder names.',
    },
    {
      id: 'non-essential',
      nav: '4. Non-essential cookies',
      heading: '4. Non-essential cookies',
      body: `We will not place or access analytics, advertising, personalization, or other non-essential cookies unless you receive clear information and actively consent to the relevant category. Non-essential technologies remain blocked before consent.

If a consent tool is introduced, it will allow visitors to accept, reject, select categories, and change consent later. Rejecting optional cookies will not prevent access to the basic website or waitlist form.`,
    },
    {
      id: 'third-parties',
      nav: '5. Third parties',
      heading: '5. Third-party services',
      body: `Providers involved in hosting, security, or waitlist processing may use strictly necessary technologies.

Website hosting and content delivery: Cloudflare, Inc. (United States)
Waitlist and confirmation email: Brevo (Sendinblue SAS, France)
Bot protection on the signup form: Cloudflare Turnstile

Add links to provider privacy documentation after production services are selected.`,
    },
    {
      id: 'managing-cookies',
      nav: '6. Managing cookies',
      heading: '6. Managing cookies',
      body: 'Browser settings usually allow visitors to inspect, block, or delete cookies. Blocking strictly necessary cookies may prevent parts of the website, including the waitlist form, from working correctly. If non-essential cookies are introduced, a Cookie Settings or Privacy Settings link will remain available on the website.',
    },
    {
      id: 'cookie-changes',
      nav: '7. Changes',
      heading: '7. Changes to this policy',
      body: 'We may update this policy when website technologies, providers, purposes, retention periods, or legal requirements change. The effective date at the top identifies the latest revision.',
    },
    {
      id: 'cookie-contact',
      nav: '8. Contact',
      heading: '8. Contact',
      body: `Questions may be sent to:

neongod LLC
Email: [PRIVACY EMAIL ADDRESS]
Address: 447 Broadway, 2nd Floor, New York, NY 10013, United States`,
    },
  ],
}

export type CookieRow = {
  name: string
  provider: string
  purpose: string
  category: string
  duration: string
}

/**
 * The live cookie schedule. The design ships placeholder rows but instructs
 * "do not publish placeholder names", so this lists real technologies only.
 *
 * `alwaysSet` is what the site stores with no tags configured. `onConsent` is
 * added to the published table only when VITE_GTM_ID / VITE_META_PIXEL_ID are
 * set, and only ever written after opt-in.
 *
 * VERIFY these names and durations against the live site before publishing —
 * container-suffixed GA cookies and vendor defaults change.
 */
export const cookieSchedule: { alwaysSet: CookieRow[]; onConsent: CookieRow[] } = {
  /*
   * EMPTY ON PURPOSE. With no analytics configured the site sets no cookie and
   * writes no storage key — `test/e2e/security.spec.ts` asserts it in a real
   * browser. A `pf-consent` row used to sit here describing a key nothing
   * writes, which is a published cookie schedule naming a fiction. The row
   * belongs back only in the same change that ships a consent tool.
   */
  alwaysSet: [],
  onConsent: [
    {
      name: '_ga, _ga_*',
      provider: 'Google',
      purpose: 'Distinguishes visitors and sessions for Google Analytics.',
      category: 'Analytics',
      duration: '2 years',
    },
    {
      name: '_fbp',
      provider: 'Meta',
      purpose: 'Identifies the browser for Meta advertising measurement and targeting.',
      category: 'Marketing',
      duration: '3 months',
    },
  ],
}
