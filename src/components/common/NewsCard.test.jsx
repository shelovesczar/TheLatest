import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NewsCard from "./NewsCard";

describe("NewsCard trust signals", () => {
  it("renders the perspective badge but not the truth score badge (disabled)", () => {
    render(
      <NewsCard
        title="Reuters says markets are repricing inflation bets"
        image="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&q=80"
        source="Reuters"
        timeAgo="2026-08-11T12:00:00.000Z"
        url="https://www.reuters.com/example-story"
        category="Business"
      />,
    );

    expect(screen.getByText("Center")).toBeTruthy();
    expect(screen.queryByText(/Truth score/i)).toBeNull();
  });
});
