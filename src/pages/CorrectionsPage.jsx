import './LegalPage.css'

const sections = [
  {
    id: 'reporting-issues',
    title: 'Reporting an Issue',
    body: [
      'If you spot a factual error, a broken route, incorrect source labeling, or generated fallback copy that appears misleading, contact us with the story URL and a short description of the issue. We review corrections requests with priority when they affect factual clarity, attribution, or user trust.'
    ]
  },
  {
    id: 'what-we-correct',
    title: 'What We Correct',
    body: [
      'We correct our own headlines, descriptions, source labels, routing metadata, and generated briefings when they are materially wrong or create a misleading impression. We do not rewrite third-party articles, but we may update routing and context around them.'
    ],
    bullets: [
      'Incorrect attribution or source labeling.',
      'Broken or unstable story routing that prevents retrieval.',
      'Generated briefings that misstate the underlying coverage context.',
      'Metadata errors that meaningfully distort topic, category, or timing.'
    ]
  },
  {
    id: 'timing',
    title: 'Correction Timing',
    body: [
      'We aim to review correction requests quickly, but timing depends on severity, reproducibility, and whether the issue is local to our product or originates in upstream source feeds. Material errors affecting multiple surfaces are prioritized first.'
    ]
  }
]

function CorrectionsPage() {
  return (
    <main className="legal-page">
      <section className="legal-page__hero">
        <span className="legal-page__eyebrow">Corrections</span>
        <h1 className="legal-page__title">Trust improves only if mistakes can be reported and fixed.</h1>
        <p className="legal-page__lede">
          This page explains how to flag factual, routing, labeling, or generated-content issues and how The Latest
          handles corrections when they affect the product.
        </p>
        <div className="legal-page__meta">
          <span>Correction workflow</span>
          <span>Applies to editorial framing, metadata, and generated fallback content</span>
        </div>
      </section>

      <section className="legal-page__content">
        <aside className="legal-page__nav" aria-label="Corrections sections">
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
            <strong>Report a correction</strong>
            <p className="legal-page__paragraph">
              Send the story URL, a short description, and any supporting source to <a href="mailto:corrections@thelatest.news">corrections@thelatest.news</a>.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}

export default CorrectionsPage