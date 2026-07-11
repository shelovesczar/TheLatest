import './LegalPage.css'

const sections = [
  {
    id: 'general',
    title: 'General Contact',
    body: [
      'Use the addresses below for editorial questions, product feedback, privacy requests, or corrections. Include the page URL and enough context for us to reproduce the issue when you are reporting a bug or broken story route.'
    ]
  },
  {
    id: 'response-scope',
    title: 'What To Include',
    body: [
      'The fastest way to resolve an issue is to include the affected page, approximate time, device or browser, and a short description of what you expected versus what happened. For content issues, include the story title and source label shown in the product.'
    ]
  }
]

function ContactPage() {
  return (
    <main className="legal-page">
      <section className="legal-page__hero">
        <span className="legal-page__eyebrow">Contact</span>
        <h1 className="legal-page__title">Questions are useful only if they reach the right queue.</h1>
        <p className="legal-page__lede">
          Contact The Latest for editorial questions, product issues, privacy requests, or corrections. Route-specific
          details help us fix problems faster.
        </p>
        <div className="legal-page__meta">
          <span>Support and policy contacts</span>
          <span>Include page URLs for faster triage</span>
        </div>
      </section>

      <section className="legal-page__content">
        <aside className="legal-page__nav" aria-label="Contact page sections">
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
            </article>
          ))}

          <section className="legal-page__contact">
            <strong>Contact directories</strong>
            <p className="legal-page__paragraph">Editorial: <a href="mailto:editorial@thelatest.news">editorial@thelatest.news</a></p>
            <p className="legal-page__paragraph">Corrections: <a href="mailto:corrections@thelatest.news">corrections@thelatest.news</a></p>
            <p className="legal-page__paragraph">Privacy: <a href="mailto:privacy@thelatest.news">privacy@thelatest.news</a></p>
            <p className="legal-page__paragraph">Product support: <a href="mailto:support@thelatest.news">support@thelatest.news</a></p>
          </section>
        </div>
      </section>
    </main>
  )
}

export default ContactPage