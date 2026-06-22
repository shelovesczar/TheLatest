import './LegalPage.css'

const sections = [
  {
    id: 'acceptance',
    title: 'Using The Service',
    body: [
      'By accessing The Latest, you agree to these terms and to use the product lawfully, responsibly, and in a way that does not interfere with editorial systems, infrastructure, or other users. If you do not agree, you should not use the service.'
    ]
  },
  {
    id: 'accounts',
    title: 'Accounts and Access',
    body: [
      'You are responsible for maintaining the confidentiality of your account credentials and for activity that occurs under your account. We may suspend or terminate access if we detect abuse, fraudulent behavior, attempts to bypass security, or misuse of internal or administrative functionality.'
    ]
  },
  {
    id: 'content',
    title: 'Content and Availability',
    body: [
      'The Latest aggregates and presents content from editorial feeds, partner sources, and platform-generated organization. We work to keep the service current and accurate, but we do not guarantee uninterrupted availability, perfect accuracy, or permanent availability of any specific source, story, or feature.'
    ]
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    body: [
      'You may not reverse engineer protected systems, scrape the service in violation of our policies, interfere with platform operations, attempt unauthorized access, or use the product to distribute unlawful, abusive, or malicious material.'
    ],
    bullets: [
      'Do not automate abusive traffic against public or internal endpoints.',
      'Do not impersonate other users or attempt credential theft.',
      'Do not copy, redistribute, or republish protected content beyond what law or licenses permit.',
      'Do not interfere with feed integrity, ranking systems, or platform security controls.'
    ]
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    body: [
      'The Latest brand, product design, code, and original editorial framing belong to The Latest or its licensors. Third-party headlines, embeds, and source content remain subject to their respective owners and terms.'
    ]
  },
  {
    id: 'liability',
    title: 'Disclaimers and Liability',
    body: [
      'The service is provided on an as-is and as-available basis to the maximum extent permitted by law. We disclaim warranties not expressly stated here and are not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the service.'
    ]
  }
]

function TermsPage() {
  return (
    <main className="legal-page">
      <section className="legal-page__hero">
        <span className="legal-page__eyebrow">Terms of Use</span>
        <h1 className="legal-page__title">The platform stays usable only if access and behavior stay bounded.</h1>
        <p className="legal-page__lede">
          These terms define the rules for access, account use, platform behavior, content handling, and the limits
          of responsibility across The Latest.
        </p>
        <div className="legal-page__meta">
          <span>Effective date: June 17, 2026</span>
          <span>Applies to web, authenticated, and administrative product surfaces</span>
        </div>
      </section>

      <section className="legal-page__content">
        <aside className="legal-page__nav" aria-label="Terms sections">
          <p className="legal-page__nav-title">On this page</p>
          <ul className="legal-page__nav-list">
            {sections.map((section) => (
              <li key={section.id}>
                <a className="legal-page__nav-link" href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ul>
        </aside>

        <div className="legal-page__sections">
          {sections.map((section) => (
            <article key={section.id} id={section.id} className="legal-page__section">
              <h2 className="legal-page__section-title">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="legal-page__paragraph">{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="legal-page__list">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}

          <section className="legal-page__contact">
            <strong>Legal inquiries</strong>
            <p className="legal-page__paragraph">
              Questions about these terms can be sent to <a href="mailto:legal@thelatest.news">legal@thelatest.news</a>.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}

export default TermsPage