import './LegalPage.css'

const sections = [
  {
    id: 'mission',
    title: 'Mission',
    body: [
      'The Latest is built for readers who want a fast, high-signal view of what matters across news, opinion, video, podcasts, and social context. The goal is not volume for its own sake. The goal is sharper coverage paths, faster verification, and clearer routing into the original reporting.'
    ]
  },
  {
    id: 'how-it-works',
    title: 'How The Product Works',
    body: [
      'The platform combines feed aggregation, topic clustering, source-aware ranking, and on-site reading utilities to reduce the friction between headline discovery and deeper context. When live feed coverage is thin, we may publish clearly labeled generated briefings so sections do not collapse into empty states.'
    ]
  },
  {
    id: 'what-we-prioritize',
    title: 'What We Prioritize',
    body: [
      'We prioritize source transparency, stable story routing, fast retrieval, abuse controls around expensive endpoints, and clear labeling whenever content is generated, cached, or reconstructed from fallback systems.'
    ],
    bullets: [
      'Link users to the original reporting when live source material exists.',
      'Preserve durable story routes so coverage remains reachable after feed churn.',
      'Keep generated summaries and generated story briefings visibly labeled.',
      'Monitor feed failures, fallback volume, and endpoint health before they become user-facing regressions.'
    ]
  }
]

function AboutPage() {
  return (
    <main className="legal-page">
      <section className="legal-page__hero">
        <span className="legal-page__eyebrow">About The Latest</span>
        <h1 className="legal-page__title">A news product should reduce noise, not repackage it.</h1>
        <p className="legal-page__lede">
          The Latest is designed to help readers move from discovery to context quickly, while keeping source
          transparency and product trust visible on every important surface.
        </p>
        <div className="legal-page__meta">
          <span>Editorial product overview</span>
          <span>Updated for persistent routing, fallback labeling, and platform monitoring</span>
        </div>
      </section>

      <section className="legal-page__content">
        <aside className="legal-page__nav" aria-label="About page sections">
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
        </div>
      </section>
    </main>
  )
}

export default AboutPage