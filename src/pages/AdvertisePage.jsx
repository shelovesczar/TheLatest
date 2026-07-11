import './LegalPage.css'

const sections = [
  {
    id: 'why-partner',
    title: 'Why Partner With The Latest',
    body: [
      'The Latest is designed for readers who move quickly across breaking news, opinion, video, podcasts, and social context. Advertising on the platform is a fit for brands that want premium adjacency around high-intent news discovery rather than low-signal traffic.'
    ]
  },
  {
    id: 'available-placements',
    title: 'Available Placements',
    body: [
      'We support homepage, section, and in-stream placements built on the shared ad system already used across the product. Placement decisions can be tailored around categories, content formats, and campaign goals.'
    ],
    bullets: [
      'Homepage and section sponsorship opportunities.',
      'In-feed placements across editorial surfaces.',
      'Category-aligned campaigns for politics, business, tech, culture, and more.',
      'Flexible creative formats that map to the platform\'s existing responsive ad slots.'
    ]
  },
  {
    id: 'what-to-send',
    title: 'What To Send Us',
    body: [
      'If you want to advertise on The Latest, send a short campaign brief with your timeline, target audience, desired placement types, creative dimensions, and budget range. That gives us enough context to respond with realistic placement options instead of generic rate-card language.'
    ]
  },
  {
    id: 'contact',
    title: 'Advertising Contact',
    body: [
      'Send advertising inquiries to support@thelatest.news with the subject line "Advertising Inquiry." We can route brand, agency, sponsorship, and custom placement requests from there until a dedicated sales inbox is published.'
    ]
  }
]

function AdvertisePage() {
  return (
    <main className="legal-page">
      <section className="legal-page__hero">
        <span className="legal-page__eyebrow">Advertise With The Latest</span>
        <h1 className="legal-page__title">Reach readers where breaking news, analysis, and media discovery actually happen.</h1>
        <p className="legal-page__lede">
          The Latest offers advertising opportunities across a fast-moving editorial product built for high-signal
          reading, topic discovery, and repeat daily usage.
        </p>
        <div className="legal-page__meta">
          <span>Advertising overview</span>
          <span>Placements, sponsorships, and campaign inquiries</span>
        </div>
      </section>

      <section className="legal-page__content">
        <aside className="legal-page__nav" aria-label="Advertising page sections">
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

export default AdvertisePage