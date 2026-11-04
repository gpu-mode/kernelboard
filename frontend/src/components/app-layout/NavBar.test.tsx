import { fireEvent, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useLocation } from "react-router-dom";
import { renderWithRouter } from "../../tests/test-utils";
import NavBar from "./NavBar";

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>;
}

describe("NavBar", () => {
  it("renders the site navigation links", () => {
    renderWithRouter(<NavBar />);
    for (const [name, href] of [
      ["News", "/news"],
      ["Events", "/events"],
      ["Projects", "/working-groups"],
    ]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).not.toHaveAttribute("target", "_blank");
    }
  });

  it("navigates inside the app without reloading the document", () => {
    renderWithRouter(
      <>
        <NavBar />
        <CurrentPath />
      </>,
    );
    fireEvent.click(screen.getByRole("link", { name: "News" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/news");
    fireEvent.click(screen.getByRole("link", { name: "GPU MODE" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/");
  });
});
