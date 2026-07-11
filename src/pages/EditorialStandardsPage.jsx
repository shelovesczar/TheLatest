import './LegalPage.css'

const sections = [
  {
    id: 'core-standard',
    title: 'Core Standard',
    body: [
      'We aim to distinguish clearly between original source reporting, aggregated editorial framing, and generated fallback content. Readers should be able to tell what type of item they are looking at before they click and again while reading it.'
    ]
  },
  {
    id: 'source-selection',
    title: 'Source Selection and Ranking',
    body: [
      'Feeds are selected for consistency, relevance, and coverage breadth. Ranking may consider freshness, topical fit, diversity, and source availability. These systems are product decisions, not guarantees that any one outlet or perspective will always appear.'
    ]
  },
  {
    id: 'generated-content',
    title: 'Generated Content Standards',
    body: [
      'Generated content is used only as a fallback when coverage is thin or absent. It must be labeled, routed on-site, and treated as a briefing layer rather than a substitute for primary reporting. When a generated briefing links to an original report, that link should remain available to the reader.'
    ],
    bullets: [
      'Generated items must show an explicit fallback or AI-origin label.',
      'Generated items should not present unverified claims as direct eyewitness reporting.',
      'Generated items should be reviewed through product constraints that favor neutral tone and concise scope.',
      'When live reporting becomes available, feed coverage should outrank fallback material.'
    ]
  },
  {
    id: 'corrections',
    title: 'Corrections and Updates',
    body: [
      'When we identify a material error in our own framing, metadata, or generated fallback copy, we update the item and preserve the corrected route. If a problem originates in third-party source material, we update our labeling or routing as appropriate and direct readers to the corrected source coverage when available.'
    ]
  }
]

function EditorialStandardsPage() {
  return (
    <main className="legal-page">
      <section className="legal-page__hero">
        <span className="legal-page__eyebrow">Editorial Standards</span>
        <h1 className="legal-page__title">Aggregation still needs standards, especially when automation is involved.</h1>
        <p className="legal-page__lede">
          These standards explain how The Latest handles source selection, generated fallback content, labeling,
          and corrections across the product.
        </p>
        <div className="legal-page__meta">
          <span>Editorial policy for product surfaces</span>
          <span>Applies to feeds, story routes, summaries, and generated briefings</span>
        </div>
      </section>

      <section className="legal-page__content">
        <aside className="legal-page__nav" aria-label="Editorial standards sections">
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

export default EditorialStandardsPage