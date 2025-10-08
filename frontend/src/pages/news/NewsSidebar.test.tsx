import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, afterEach } from "vitest";

// the Sidebar is a named export
import { Sidebar } from "./components/NewsSideBar";

// mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("News Sidebar navigation", () => {
  afterEach(() => {
    mockNavigate.mockReset();
  });

  it("renders anchor hrefs and calls navigate on click", async () => {
    const data = [
      { id: "post-1", title: "First", date: "2025-10-08" },
      { id: "post-2", title: "Second", date: "2025-10-07" },
    ];

    render(<Sidebar data={data} scrollTo={() => {}} />);

    // anchors are ListItemButton with component="a" and have the href
    const firstAnchor = screen.getByTestId("news-sidbar-button-post-1");
    // anchor should have href attribute set
    expect(firstAnchor.getAttribute("href")).toBe("/v2/news/post-1");

    // click should call navigate to the expected path
    await userEvent.click(firstAnchor);
    expect(mockNavigate).toHaveBeenCalledWith("/news/post-1", { state: { fromSidebar: true } });
  });
});
