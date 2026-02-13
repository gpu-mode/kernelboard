import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import News from "./News"; // 假设你当前文件路径为 pages/News.tsx
import * as apiHook from "../../lib/hooks/useApi";
import { useParams, useNavigate } from "react-router-dom";

// 统一 mock useApi hook
vi.mock("../../lib/hooks/useApi", () => ({
  fetcherApiCallback: vi.fn(),
}));

// Mock React Router hooks
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(),
  };
});

// Mock MarkdownRenderer to avoid lazy loading issues in tests
vi.mock("../../components/markdown-renderer/MarkdownRenderer", () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
}));

const mockCall = vi.fn();
const mockNavigate = vi.fn();

const mockData = [
  {
    id: "news-1",
    title: "Title One",
    date: "2025-07-10",
    category: "Category A",
    markdown: "This is **markdown** content one.",
  },
  {
    id: "news-2",
    title: "Title Two",
    date: "2025-07-09",
    category: "Category B",
    markdown: "Another _markdown_ section.",
  },
];

describe("News", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as ReturnType<typeof vi.fn>).mockReturnValue({});
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
  });

  it("shows loading state", () => {
    // prepare
    const mockHookReturn = {
      data: null,
      loading: true,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    // render
    render(<News />);

    // asserts
    expect(screen.getByText(/Summoning/i)).toBeInTheDocument();
  });

  it("shows error message", () => {
    // prepare
    const mockHookReturn = {
      data: null,
      loading: false,
      error: "Something went wrong",
      errorStatus: 500,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    // render
    render(<News />);

    // asserts
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("renders news items and markdown", async () => {
    // prepare
    const mockHookReturn = {
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    // render
    render(<News />);

    // asserts
    expect(screen.getByText("News and Announcements")).toBeInTheDocument();

    const sidebar = screen.getByTestId("news-sidbar");
    const newsContent = screen.getByTestId("news-content");

    expect(within(sidebar).getByText("Title One")).toBeInTheDocument();
    expect(within(sidebar).getByText("Title Two")).toBeInTheDocument();

    expect(within(newsContent).getByText("Title One")).toBeInTheDocument();
    expect(within(newsContent).getByText("Title Two")).toBeInTheDocument();

    // Wait for the markdown content to load
    await waitFor(() => {
      expect(within(newsContent).getByText(/content one/i)).toBeInTheDocument();
    });
  });

  it("calls scrollIntoView when sidebar item is clicked", () => {
    // prepare
    const scrollIntoViewMock = vi.fn();

    const mockHookReturn = {
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    // render
    render(<News />);

    // asserts
    const sidebar = screen.getByTestId("news-sidbar");
    const newsContent = screen.getByTestId("news-content");

    const section = within(newsContent).getByText("Title Two").closest("div");
    if (section) {
      Object.defineProperty(section, "scrollIntoView", {
        value: scrollIntoViewMock,
        writable: true,
      });
    }

    // click a button to navigate to item 2 in Sidebar
    const button = within(sidebar).getByTestId("news-sidbar-button-news-2");
    fireEvent.click(button);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(mockNavigate).toHaveBeenCalledWith("/news/news-2", {
      replace: true,
    });
  });

  it("scrolls to section when slug is provided in URL", async () => {
    // prepare
    const scrollIntoViewMock = vi.fn();
    (useParams as ReturnType<typeof vi.fn>).mockReturnValue({ slug: "news-2" });

    const mockHookReturn = {
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    // render
    render(<News />);

    const newsContent = screen.getByTestId("news-content");
    const section = within(newsContent).getByText("Title Two").closest("div");
    if (section) {
      Object.defineProperty(section, "scrollIntoView", {
        value: scrollIntoViewMock,
        writable: true,
      });
    }

    // Wait for the scroll effect to trigger
    await waitFor(
      () => {
        expect(scrollIntoViewMock).toHaveBeenCalledWith({
          behavior: "smooth",
          block: "start",
        });
      },
      { timeout: 200 },
    );
  });
});
