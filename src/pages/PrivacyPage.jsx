import './LegalPage.css'

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    body: [
      'The Latest is built to surface news, commentary, video, podcasts, and social context without turning your account data into a product. This policy explains what we collect, why we collect it, and how we handle it across reading, search, account, and analytics features.',
      'If we materially change these practices, we will update this page and revise the effective date so users can evaluate the change before continuing to use the service.'
    ]
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    body: [
      'We collect account information you provide directly, such as your email address and authentication data when you register or sign in. We also store product activity that is necessary to run the service, including saved stories, follows, engagement events, and search queries used to improve relevance and monitor product health.'
    ],
    bullets: [
      'Account details you submit during registration or login.',
      'Session and security data required to keep your account authenticated and protect internal tools.',
      'Usage signals such as page views, search requests, follows, and saved stories.',
      'Operational logs used to diagnose failures, abuse, and feed-quality issues.'
    ]
  },
  {
    id: 'how-we-use-data',
    title: 'How We Use Data',
    body: [
      'We use personal and product data to operate the site, personalize what you choose to follow, secure accounts, detect misuse, maintain feed quality, and understand which parts of the product are working. We do not use your private account data to publish or expose your reading habits to other users.'
    ]
  },
  {
    id: 'sharing',
    title: 'When Data Is Shared',
    body: [
      'We share data only when it is necessary to run infrastructure, comply with law, or protect the platform. That includes service providers that host the app, authentication systems, analytics transport, and storage providers that process data on our behalf under contractual restrictions.'
    ]
  },
  {
    id: 'retention',
    title: 'Retention and Security',
    body: [
      'We retain data for as long as it is needed for account access, saved content, product integrity, and legal obligations. We use access controls, token hashing, and administrative authorization checks to reduce unnecessary exposure of session and operational data.'
    ]
  },
  {
    id: 'your-controls',
    title: 'Your Controls',
    body: [
      'You can manage saved items, followed topics, and other account-level content directly inside the product. You can also contact us to request account deletion, export, or correction of information associated with your profile, subject to applicable law and security verification.'
    ]
  }
]

function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-page__hero">
        <span className="legal-page__eyebrow">Privacy Policy</span>
        <h1 className="legal-page__title">Your account data should support the product, not undermine trust.</h1>
        <p className="legal-page__lede">
          This policy covers how The Latest collects, uses, stores, and protects information tied to reading,
          search, account, and analytics features across the platform.
        </p>
        <div className="legal-page__meta">
          <span>Effective date: June 17, 2026</span>
          <span>Applies to all web experiences operated by The Latest</span>
        </div>
      </section>

      <section className="legal-page__content">
        <aside className="legal-page__nav" aria-label="Privacy policy sections">
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
            <strong>Privacy requests</strong>
            <p className="legal-page__paragraph">
              For access, deletion, correction, or security questions, contact <a href="mailto:privacy@thelatest.news">privacy@thelatest.news</a>.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}

export default PrivacyPage