import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Header from "./Header";
import { AuthProvider } from "../../context/AuthContext";
import { SearchProvider } from "../../context/SearchContext";
import { ConsentProvider } from "../../context/ConsentContext";

function RouteControls() {
  const navigate = useNavigate();

  return (
    <div>
      <button type="button" onClick={() => navigate("/search?q=ai")}>
        Go Search
      </button>
      <button type="button" onClick={() => navigate("/category/politics")}>
        Go Politics
      </button>
      <button type="button" onClick={() => navigate("/topic/ai")}>
        Go Topic
      </button>
    </div>
  );
}

function LocationProbe() {
  const location = useLocation();

  return (
    <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>
  );
}

function renderHeader(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ConsentProvider>
        <AuthProvider>
          <SearchProvider>
            <Routes>
              <Route
                path="*"
                element={
                  <>
                    <Header
                      darkMode
                      toggleTheme={() => {}}
                      setMenuOpen={() => {}}
                      breakingNews={["Breaking item"]}
                    />
                    <RouteControls />
                    <LocationProbe />
                  </>
                }
              />
            </Routes>
          </SearchProvider>
        </AuthProvider>
      </ConsentProvider>
    </MemoryRouter>,
  );
}

describe("Header route traversal regression", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps the unified landing header variant across route changes", async () => {
    const user = userEvent.setup();
    const { container } = renderHeader("/");

    const header = container.querySelector(".header");
    const nav = container.querySelector(".nav");

    expect(header?.classList.contains("header--landing")).toBe(true);
    expect(nav?.classList.contains("nav--landing")).toBe(true);
    expect(screen.getByRole("link", { name: "News" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search news" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Go Search" }));
    expect(
      container.querySelector(".header")?.classList.contains("header--landing"),
    ).toBe(true);
    expect(
      container.querySelector(".nav")?.classList.contains("nav--landing"),
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Go Politics" }));
    expect(
      container.querySelector(".header")?.classList.contains("header--landing"),
    ).toBe(true);
    expect(
      container.querySelector(".nav")?.classList.contains("nav--landing"),
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Go Topic" }));
    expect(
      container.querySelector(".header")?.classList.contains("header--landing"),
    ).toBe(true);
    expect(
      container.querySelector(".nav")?.classList.contains("nav--landing"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "Politics" })).toBeTruthy();
  });

  it("opens a category flyout on desktop hover intent", async () => {
    const user = userEvent.setup();
    renderHeader("/");

    const politicsLink = screen.getByRole("link", { name: "Politics" });
    await user.hover(politicsLink);

    expect(
      await screen.findByRole("link", { name: "All Politics" }),
    ).toBeTruthy();
  });

  it("keeps mobile utility controls available across route changes", async () => {
    const user = userEvent.setup();
    renderHeader("/");

    expect(screen.getByRole("searchbox", { name: "Search news" })).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Toggle theme" }).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Go Search" }));
    expect(screen.getByRole("searchbox", { name: "Search news" })).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Toggle theme" }).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Go Politics" }));
    expect(screen.getByRole("searchbox", { name: "Search news" })).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Toggle theme" }).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Go Topic" }));
    expect(screen.getByRole("searchbox", { name: "Search news" })).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Toggle theme" }).length,
    ).toBeGreaterThan(0);
  });

  it("submits a header search when Enter is pressed", async () => {
    const user = userEvent.setup();
    renderHeader("/");

    const searchInput = screen.getByRole("searchbox", { name: "Search news" });
    await user.type(searchInput, "long ai search query{enter}");

    expect(screen.getByTestId("location-probe").textContent).toBe(
      "/search?q=long%20ai%20search%20query",
    );
  });

  it("submits a header search when the search icon button is clicked", async () => {
    const user = userEvent.setup();
    renderHeader("/");

    // The search icon is collapsed by default on desktop/tablet — the first
    // click opens it, the second click (once a query is entered) submits.
    await user.click(screen.getByRole("button", { name: "Open search" }));

    const searchInput = screen.getByRole("searchbox", { name: "Search news" });
    await user.type(searchInput, "mobile tap search");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByTestId("location-probe").textContent).toBe(
      "/search?q=mobile%20tap%20search",
    );
  });
});
