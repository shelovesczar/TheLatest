import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { SearchProvider } from "../../context/SearchContext";
import Hero from "./Hero";

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>
  );
}

function renderHero(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SearchProvider>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <Hero />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </SearchProvider>
    </MemoryRouter>,
  );
}

describe("Hero mobile search", () => {
  it("submits when the magnifying glass button is tapped", async () => {
    const user = userEvent.setup();
    renderHero("/");

    await user.type(
      screen.getByRole("searchbox", { name: "Search news" }),
      "climate policy",
    );
    await user.click(
      screen.getByRole("button", { name: "Submit mobile search" }),
    );

    expect(screen.getByTestId("location-probe").textContent).toBe(
      "/search?q=climate%20policy",
    );
  });
});
