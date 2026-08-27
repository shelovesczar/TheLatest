import "./LegalPage.css";

const DESIGNATED_AGENT = {
  name: "Jeff Hall",
  email: "jeffhall@thelatest.com",
  phone: "310-709-6215",
};

const sections = [
  {
    id: "our-approach",
    title: "How The Latest Handles Third-Party Content",
    body: [
      "The Latest is a news aggregator: we surface short excerpts of stories from other publishers alongside credit to the original outlet and a link to read the full story at the source. We do not reproduce full articles on our own pages. If you believe something on The Latest goes beyond that — or otherwise infringes a copyright you own — use the notice process below.",
    ],
  },
  {
    id: "filing-a-notice",
    title: "Filing a DMCA Takedown Notice",
    body: [
      "If you believe content on The Latest infringes your copyright, send a written notice to our designated agent (below) that includes all of the following, consistent with 17 U.S.C. § 512(c)(3):",
    ],
    bullets: [
      "Identification of the copyrighted work you claim has been infringed.",
      "The specific URL(s) on The Latest where the allegedly infringing material appears.",
      "Your name, mailing address, telephone number, and email address.",
      "A statement that you have a good faith belief the use is not authorized by the copyright owner, its agent, or the law.",
      "A statement, made under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on the owner's behalf.",
      "Your physical or electronic signature.",
    ],
  },
  {
    id: "counter-notice",
    title: "Counter-Notification",
    body: [
      "If you believe content you posted or that identifies you was removed or disabled by mistake or misidentification, you may send a counter-notice to the same address including:",
    ],
    bullets: [
      "Identification of the material and its location before removal.",
      "A statement under penalty of perjury that you have a good faith belief the material was removed as a result of mistake or misidentification.",
      "Your name, address, telephone number, and a statement that you consent to the jurisdiction of the federal court in your district (or, if outside the U.S., any district in which The Latest may be found), and that you will accept service of process from the person who filed the original notice.",
      "Your physical or electronic signature.",
    ],
  },
  {
    id: "designated-agent",
    title: "Designated Agent",
    body: [
      `Notices and counter-notices should be sent to our designated agent, ${DESIGNATED_AGENT.name}, at ${DESIGNATED_AGENT.email} or ${DESIGNATED_AGENT.phone}.`,
      "A mailing address for the designated agent will be added here once one is finalized. Note that formal U.S. Copyright Office designated-agent registration (required for full DMCA safe-harbor protection) requires a physical address on file, so one will need to be provided before that registration can be completed.",
    ],
  },
  {
    id: "repeat-infringers",
    title: "Repeat Infringers",
    body: [
      "We reserve the right to disable or remove content, and to suspend accounts, in cases of repeated or clear infringement, consistent with standard DMCA safe-harbor practice.",
    ],
  },
];

function DMCAPage() {
  return (
    <main className="legal-page">
      <section className="legal-page__hero">
        <span className="legal-page__eyebrow">DMCA / Copyright</span>
        <h1 className="legal-page__title">
          How to report copyright concerns and how we respond.
        </h1>
        <p className="legal-page__lede">
          This page explains our approach to third-party content, and the
          process for filing a takedown notice or counter-notice under the
          Digital Millennium Copyright Act.
        </p>
        <div className="legal-page__meta">
          <span>Copyright / DMCA policy</span>
          <span>Applies to all aggregated and linked third-party content</span>
        </div>
      </section>

      <section className="legal-page__content">
        <aside className="legal-page__nav" aria-label="DMCA sections">
          <p className="legal-page__nav-title">On this page</p>
          <ul className="legal-page__nav-list">
            {sections.map((section) => (
              <li key={section.id}>
                <a className="legal-page__nav-link" href={`#${section.id}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div className="legal-page__sections">
          {sections.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="legal-page__section"
            >
              <h2 className="legal-page__section-title">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="legal-page__paragraph">
                  {paragraph}
                </p>
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
            <strong>Send notices to</strong>
            <p className="legal-page__paragraph">
              {DESIGNATED_AGENT.name} —{" "}
              <a href={`mailto:${DESIGNATED_AGENT.email}`}>
                {DESIGNATED_AGENT.email}
              </a>{" "}
              — {DESIGNATED_AGENT.phone}
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

export default DMCAPage;
