import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageBackBar from "../components/common/PageBackBar";
import {
  getSourceProfileBySlug,
  getTrustDescriptorForProfile,
  PERSPECTIVE_METHODOLOGY,
} from "../utils/sourceProfiles";
import {
  findRegistryRecord,
  getSourceRegistry,
  mergeSourceProfileWithRegistry,
} from "../services/sourceRegistryService";
import "./LegalPage.css";

function SourceProfilePage() {
  const { sourceSlug } = useParams();
  const [registryRecord, setRegistryRecord] = useState(null);

  const baseProfile = useMemo(
    () => getSourceProfileBySlug(sourceSlug),
    [sourceSlug],
  );

  useEffect(() => {
    let ignore = false;

    getSourceRegistry()
      .then((records) => {
        if (!ignore) {
          setRegistryRecord(findRegistryRecord(records, baseProfile));
        }
      })
      .catch(() => {
        if (!ignore) {
          setRegistryRecord(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [baseProfile]);

  const profile = useMemo(
    () => mergeSourceProfileWithRegistry(baseProfile, registryRecord),
    [baseProfile, registryRecord],
  );

  const trust = useMemo(() => getTrustDescriptorForProfile(profile), [profile]);

  const sections = [
    {
      id: "ownership",
      title: "Ownership And Structure",
      body: [
        profile.ownershipSummary,
        `Funding model: ${profile.fundingModel}.`,
      ],
    },
    {
      id: "editorial-posture",
      title: "Editorial Posture",
      body: [
        `${profile.displayName} is currently mapped as ${profile.perspectiveLabel} in The Latest trust layer. This is a directional framing label, not a verdict on whether any single story is true or false.`,
        `Current trust shorthand: ${profile.factualityLabel}. ${profile.methodologyNote}`,
      ],
    },
    {
      id: "how-to-read",
      title: "How To Read This Profile",
      body: [
        "A source profile is designed to answer three practical questions quickly: who owns this outlet, what kind of incentives shape it, and how its framing usually differs from peers on the same story.",
        "Use the profile as context for comparison, not as a substitute for reading across multiple outlets.",
      ],
      bullets: PERSPECTIVE_METHODOLOGY.map(
        (item) => `${item.title}: ${item.body}`,
      ),
    },
  ];

  return (
    <main className="legal-page">
      <PageBackBar
        fallbackTo="/"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Source Profiles" },
          { label: profile.displayName },
        ]}
        meta={`${profile.ownershipType} · ${profile.country}`}
      />

      <section className="legal-page__hero">
        <span className="legal-page__eyebrow">Source Profile</span>
        <h1 className="legal-page__title">{profile.displayName}</h1>
        <p className="legal-page__lede">{profile.description}</p>
        <div className="legal-page__meta">
          <span>{profile.perspectiveLabel}</span>
          <span>{trust.shortLabel}</span>
          <span>{profile.factualityLabel}</span>
          <span>{profile.ownershipType}</span>
          <span>{profile.country}</span>
          <span>Founded {profile.founded}</span>
        </div>
      </section>

      <section className="legal-page__content">
        <aside className="legal-page__nav" aria-label="Source profile sections">
          <p className="legal-page__nav-title">At a glance</p>
          <ul className="legal-page__nav-list">
            <li>
              <a className="legal-page__nav-link" href="#ownership">
                Ownership
              </a>
            </li>
            <li>
              <a className="legal-page__nav-link" href="#editorial-posture">
                Editorial posture
              </a>
            </li>
            <li>
              <a className="legal-page__nav-link" href="#how-to-read">
                Methodology
              </a>
            </li>
            {profile.homepage ? (
              <li>
                <a
                  className="legal-page__nav-link"
                  href={profile.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit source →
                </a>
              </li>
            ) : null}
          </ul>
        </aside>

        <div className="legal-page__sections">
          <article className="legal-page__section">
            <h2 className="legal-page__section-title">Trust Snapshot</h2>
            <p className="legal-page__paragraph">
              <strong>Owner:</strong> {profile.ownershipName}
            </p>
            <p className="legal-page__paragraph">
              <strong>Ownership type:</strong> {profile.ownershipType}
            </p>
            <p className="legal-page__paragraph">
              <strong>Country:</strong> {profile.country}
            </p>
            <p className="legal-page__paragraph">
              <strong>Truth score:</strong> {trust.score}/100
            </p>
            <p className="legal-page__paragraph">
              <strong>Perspective label:</strong> {profile.perspectiveLabel}
            </p>
            <p className="legal-page__paragraph">
              <strong>Factuality shorthand:</strong> {profile.factualityLabel}
            </p>
            <p className="legal-page__paragraph">
              <strong>What it means:</strong> {trust.rationale}
            </p>
            {profile.registryNotes ? (
              <p className="legal-page__paragraph">
                <strong>Registry note:</strong> {profile.registryNotes}
              </p>
            ) : null}
            {profile.registryUpdatedAt ? (
              <p className="legal-page__paragraph">
                <strong>Last reviewed:</strong>{" "}
                {new Date(profile.registryUpdatedAt).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </p>
            ) : null}
          </article>

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
        </div>
      </section>
    </main>
  );
}

export default SourceProfilePage;
