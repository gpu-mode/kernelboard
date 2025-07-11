import { render, screen, fireEvent, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import News from "./News"; // 假设你当前文件路径为 pages/News.tsx
import * as apiHook from "../../lib/hooks/useApi";

// 统一 mock useApi hook
vi.mock("../../lib/hooks/useApi", () => ({
  fetcherApiCallback: vi.fn(),
}));

const mockCall = vi.fn();

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
  });

  it("shows loading state", () => {
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

    render(<News />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows error message", () => {
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

    render(<News />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("renders news items and markdown", () => {
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

    render(<News />);

    expect(screen.getByText("News and Announcements")).toBeInTheDocument();

    const sidebar = screen.getByTestId("news-sidbar");
    const newsContent = screen.getByTestId("news-content");

    expect(within(sidebar).getByText("Title One")).toBeInTheDocument();
    expect(within(sidebar).getByText("Title Two")).toBeInTheDocument();

    expect(within(newsContent).getByText("Title One")).toBeInTheDocument();
    expect(within(newsContent).getByText("Title Two")).toBeInTheDocument();
    expect(within(newsContent).getByText(/content one/i)).toBeInTheDocument();
  });

  it("calls scrollIntoView when sidebar item is clicked", () => {
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

    // Render page
    render(<News />);

    // Asserts
    const sidebar = screen.getByTestId("news-sidbar");
    const newsContent = screen.getByTestId("news-content");

    const section = within(newsContent).getByText("Title Two").closest("div");
    if (section) {
      Object.defineProperty(section, "scrollIntoView", {
        value: scrollIntoViewMock,
        writable: true,
      });
    }

    // click a button in Sidebar
    const button = within(sidebar).getByTestId("news-sidbar-button-news-2");
    fireEvent.click(button);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });
});
