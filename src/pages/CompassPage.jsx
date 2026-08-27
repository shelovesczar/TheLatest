import { useEffect, useState } from "react";
import { fetchRSSNews } from "../newsService";
import { fetchStoryClusters } from "../services/clusterService";
import TopStories from "../components/sections/TopStories";
import "./CompassPage.css";

function CompassPage() {
  const [topStories, setTopStories] = useState([]);
  const [storyClusters, setStoryClusters] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const loadContent = async () => {
      setLoading(true);

      try {
        const [newsResult, clusterResult] = await Promise.allSettled([
          fetchRSSNews(),
          fetchStoryClusters({ type: "news", category: "news", limit: 8 }),
        ]);

        if (isCancelled) return;

        setTopStories(
          newsResult.status === "fulfilled" ? newsResult.value || [] : [],
        );
        setStoryClusters(
          clusterResult.status === "fulfilled" ? clusterResult.value || [] : [],
        );
      } catch (error) {
        console.error("Error loading Compass content:", error);
        if (!isCancelled) {
          setTopStories([]);
          setStoryClusters([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="compass-page">
      <section className="compass-hero">
        <div className="compass-hero-inner">
          <div className="compass-eyebrow">The Compass</div>
          <h1 className="compass-hero-title">
            Compare how outlets across the spectrum cover the same story.
          </h1>
          <p className="compass-hero-description">
            Every story below is tagged Left, Center, or Right based on the
            outlet's editorial history — not the story itself. Filter by lean
            or cycle through sources to see how coverage differs.
          </p>
        </div>
      </section>

      <TopStories
        topStories={topStories}
        loading={loading}
        activeStory={activeStory}
        setActiveStory={setActiveStory}
        defaultPerspectiveView={true}
        showPerspectiveToggle={true}
        sideBySideClusters={storyClusters}
        sideBySideTitle="The Compass"
      />
    </div>
  );
}

export default CompassPage;
