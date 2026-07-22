import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import NavBar from "./NavBar";
import { renderWithProviders } from "../../tests/test-utils";

describe("NavBar", () => {
  it("renders an explicit homepage link", () => {
    renderWithProviders(<NavBar />);

    const homeLink = screen.getByRole("link", {
      name: /gpu mode home/i,
    });

    expect(homeLink).toHaveAttribute("href", "/home");
    expect(homeLink).toHaveTextContent("Home");
  });

  it("renders all expected navigation links in correct order", () => {
    renderWithProviders(<NavBar />);

    const links = screen.getAllByRole("link");
    const navigationLinks = links.filter((link) =>
      ["News", "Events", "Projects"].includes(link.textContent || ""),
    );

    expect(navigationLinks).toHaveLength(3);
    expect(navigationLinks[0]).toHaveTextContent("News");
    expect(navigationLinks[1]).toHaveTextContent("Events");
    expect(navigationLinks[2]).toHaveTextContent("Projects");
  });
});
