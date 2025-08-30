import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter, MemoryRouter, Routes, Route } from "react-router-dom";
import SingleNewsPost from "./SingleNewsPost";
import * as apiHook from "../../lib/hooks/useApi";

// 统一 mock useApi hook
vi.mock("../../lib/hooks/useApi", () => ({
  fetcherApiCallback: vi.fn(),
}));

// Mock MarkdownRenderer to avoid lazy loading issues in tests
vi.mock("../../components/markdown-renderer/MarkdownRenderer", () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
}));

const mockCall = vi.fn();

// Test wrapper that provides router context
const renderWithRouter = (component: React.ReactElement, initialRoute = "/news/test-post") => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/news/:postId" element={component} />
      </Routes>
    </MemoryRouter>
  );
};

const mockNewsItem = {
  id: "test-post",
  title: "Test News Post",
  date: "2025-07-10",
  category: "Test Category",
  markdown: "This is **test** markdown content.",
};

describe("SingleNewsPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    renderWithRouter(<SingleNewsPost />);

    // asserts
    expect(screen.getByText(/Summoning/i)).toBeInTheDocument();
  });

  it("shows error message", () => {
    // prepare
    const mockHookReturn = {
      data: null,
      loading: false,
      error: "Post not found",
      errorStatus: 404,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    // render
    renderWithRouter(<SingleNewsPost />);

    // asserts
    expect(screen.getByText(/Post not found/i)).toBeInTheDocument();
  });

  it("renders news post content and back button", async () => {
    // prepare
    const mockHookReturn = {
      data: mockNewsItem,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    // render
    renderWithRouter(<SingleNewsPost />);

    // asserts
    expect(screen.getByText("Back to News")).toBeInTheDocument();
    expect(screen.getByText("News and Announcements")).toBeInTheDocument();
    expect(screen.getByText("Test News Post")).toBeInTheDocument();
    expect(screen.getByText("2025-07-10 • Test Category")).toBeInTheDocument();

    // Wait for the markdown content to load
    await waitFor(() => {
      expect(screen.getByText(/test.*content/i)).toBeInTheDocument();
    });
  });

  it("calls API with correct post ID from URL params", async () => {
    // prepare
    const mockHookReturn = {
      data: mockNewsItem,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    // render with specific route
    renderWithRouter(<SingleNewsPost />, "/news/amd-competition");

    // wait for useEffect to run
    await waitFor(() => {
      expect(mockCall).toHaveBeenCalledWith("amd-competition");
    });
  });

  it("does not show permalink icons for single post view", () => {
    // prepare
    const mockHookReturn = {
      data: mockNewsItem,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    // render
    renderWithRouter(<SingleNewsPost />);

    // asserts - should not have permalink icons in single post view
    expect(screen.queryByTestId(`permalink-${mockNewsItem.id}`)).not.toBeInTheDocument();
  });
});