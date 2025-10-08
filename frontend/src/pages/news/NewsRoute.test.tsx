import { screen, within, waitFor } from "@testing-library/react";
import { vi, describe, it, beforeEach, expect } from "vitest";
import News from "./News";
import { renderWithProviders } from "../../tests/test-utils";

// Mock the useApi hook used by News
vi.mock("../../lib/hooks/useApi", () => ({
  fetcherApiCallback: vi.fn(),
}));

// Mock MarkdownRenderer to avoid lazy loading in tests
vi.mock("../../components/markdown-renderer/MarkdownRenderer", () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
}));

import * as apiHook from "../../lib/hooks/useApi";

// helper to generate very large markdown content (many newlines)
const makeLargeMarkdown = (paragraphs = 200) =>
  Array.from({ length: paragraphs })
    .map((_, i) => `Paragraph ${i + 1}\n\nThis is a long line to increase vertical space.`)
    .join("\n\n");

const mockData = Array.from({ length: 5 }).map((_, i) => ({
  id: `news-${i + 1}`,
  title: `Displayed Post ${i + 1}`,
  date: `2025-10-01`,
  category: `Other`,
  markdown: makeLargeMarkdown(200),
}));

describe("News route deep link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the requested post when route is /news/:postId", async () => {
    const mockHookReturn = {
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: vi.fn(),
    };

    (apiHook.fetcherApiCallback as any).mockReturnValue(mockHookReturn);

    // spy on scrollIntoView so we can assert the deep-link triggers a scroll
    const original = Element.prototype.scrollIntoView;
    const scrollCalls: Array<{ el: Element; opts: any }> = [];
    Element.prototype.scrollIntoView = function (opts?: any) {
      scrollCalls.push({ el: this as Element, opts });
    };

    try {
      // render at /v2/news/news-3 (app is mounted with basename /v2)
      renderWithProviders(
        // Render the News component directly; renderWithProviders wraps MemoryRouter
        <News />,
        "/v2/news/news-3",
      );

      // title should be visible
      expect(screen.getByText("News and Announcements")).toBeInTheDocument();

      const newsContent = screen.getByTestId("news-content");
      await waitFor(() => {
        // The post title is present in the content area
        expect(within(newsContent).getByText("Displayed Post 3")).toBeInTheDocument();
      });

      // Assert scrollIntoView was called for the section with id 'news-3'
      const scrolled = scrollCalls.find((c) => c.el && (c.el as Element).id === "news-3");
      expect(scrolled).toBeTruthy();
      // Optionally check options (initial jump used 'auto')
      if (scrolled) expect(scrolled.opts).toMatchObject({ behavior: "auto", block: "start" });
    } finally {
      // restore
      Element.prototype.scrollIntoView = original;
    }
  });
});
