import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import NavBar from "./NavBar";

describe("NavBar", () => {
  it("renders Working Groups link with correct URL", () => {
    render(<NavBar />);

    const workingGroupsLink = screen.getByRole("link", {
      name: /working groups/i,
    });

    expect(workingGroupsLink).toBeInTheDocument();
    expect(workingGroupsLink).toHaveAttribute(
      "href",
      "https://docs.google.com/document/d/1LprkfyOP5cRtv7rwkFiEHx2XEKhtwf9J4bQkD6btzgo/edit?usp=sharing",
    );
    expect(workingGroupsLink).toHaveAttribute("target", "_blank");
    expect(workingGroupsLink).toHaveAttribute("rel", "noopener");
  });

  it("renders all expected navigation links in correct order", () => {
    render(<NavBar />);

    const links = screen.getAllByRole("link");
    const navigationLinks = links.filter((link) =>
      ["News", "Working Groups", "Lectures", "Resources", "Docs"].includes(
        link.textContent || "",
      ),
    );

    expect(navigationLinks).toHaveLength(5);
    expect(navigationLinks[0]).toHaveTextContent("News");
    expect(navigationLinks[1]).toHaveTextContent("Working Groups");
    expect(navigationLinks[2]).toHaveTextContent("Lectures");
    expect(navigationLinks[3]).toHaveTextContent("Resources");
    expect(navigationLinks[4]).toHaveTextContent("Docs");
  });
});
