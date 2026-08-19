import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <main className="legal-page">
      <section className="legal-page__hero">
        <span className="legal-page__eyebrow">404</span>
        <h1 className="legal-page__title">We couldn't find that page.</h1>
        <p className="legal-page__lede">
          The link may be outdated, the page may have moved, or the URL may be
          mistyped.
        </p>
        <div className="legal-page__meta">
          <span>Page not found</span>
          <span>
            <Link to="/">Back to home</Link>
          </span>
        </div>
      </section>
    </main>
  );
}

export default NotFoundPage;
