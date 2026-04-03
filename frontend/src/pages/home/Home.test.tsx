import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import { appTheme } from "../../components/common/styles/theme";
import Home from "./Home";
import * as apiHook from "../../lib/hooks/useApi";
import * as dateUtils from "../../lib/date/utils";
import { vi, expect, it, describe, beforeEach } from "vitest";

// Mock the API hook
vi.mock("../../lib/hooks/useApi");

// Mock react-syntax-highlighter to avoid ESM issues
vi.mock("react-syntax-highlighter", () => ({
  default: ({ children }: { children: string }) => <pre>{children}</pre>,
  Prism: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

vi.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  vscDarkPlus: {},
}));

// Mock utility functions
vi.mock("../../lib/date/utils", () => ({
  getTimeLeft: vi.fn(() => "2 days 5 hours remaining"),
  isExpired: vi.fn(() => false),
}));

vi.mock("../../lib/utils/ranking", () => ({
  formatMicroseconds: vi.fn(() => "123.000μs"),
}));

vi.mock("../../components/common/medal", () => ({
  getMedalIcon: vi.fn(() => null),
}));

const mockCall = vi.fn();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={appTheme}>
      <BrowserRouter>{component}</BrowserRouter>
    </ThemeProvider>,
  );
};

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    const mockHookReturn = {
      data: null,
      loading: true,
      hasLoaded: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    // Page structure is visible during loading
    expect(screen.getByText("Leaderboards")).toBeInTheDocument();
    // Loading indicator is present
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows error message", () => {
    const mockHookReturn = {
      data: null,
      loading: false,
      hasLoaded: true,
      error: "Something went wrong",
      errorStatus: 500,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Error (500)")).toBeInTheDocument();
  });

  it("shows error message without status", () => {
    const mockHookReturn = {
      data: null,
      loading: false,
      hasLoaded: true,
      error: "Network error",
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("shows leaderboards when data is loaded", () => {
    const mockData = {
      leaderboards: [
        {
          id: 1,
          name: "test-leaderboard",
          deadline: "2025-12-31T23:59:59Z",
          gpu_types: ["T4", "L4"],
          priority_gpu_type: "L4",
          top_users: [
            {
              rank: 1,
              score: 0.123,
              user_name: "alice",
            },
          ],
        },
      ],
      now: "2025-01-01T00:00:00Z",
    };

    const mockHookReturn = {
      data: mockData,
      loading: false,
      hasLoaded: true,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("Leaderboards")).toBeInTheDocument();
    expect(screen.getByText("test-leaderboard")).toBeInTheDocument();
    expect(screen.getByText("T4, L4")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("shows no leaderboards message when empty", () => {
    const mockData = {
      leaderboards: [],
      now: "2025-01-01T00:00:00Z",
    };

    const mockHookReturn = {
      data: mockData,
      loading: false,
      hasLoaded: true,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(
      screen.getByText("No active leaderboards found."),
    ).toBeInTheDocument();
  });

  it("renders multiple leaderboards correctly", () => {
    const mockData = {
      leaderboards: [
        {
          id: 1,
          name: "first-leaderboard",
          deadline: "2025-12-31T23:59:59Z",
          gpu_types: ["T4"],
          priority_gpu_type: "T4",
          top_users: [
            {
              rank: 1,
              score: 0.123,
              user_name: "alice",
            },
          ],
        },
        {
          id: 2,
          name: "second-leaderboard",
          deadline: "2025-11-30T23:59:59Z",
          gpu_types: ["L4", "A100"],
          priority_gpu_type: "A100",
          top_users: [
            {
              rank: 1,
              score: 0.456,
              user_name: "bob",
            },
            {
              rank: 2,
              score: 0.789,
              user_name: "charlie",
            },
          ],
        },
      ],
      now: "2025-01-01T00:00:00Z",
    };

    const mockHookReturn = {
      data: mockData,
      loading: false,
      hasLoaded: true,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("first-leaderboard")).toBeInTheDocument();
    expect(screen.getByText("second-leaderboard")).toBeInTheDocument();
    expect(screen.getAllByText("T4")).toHaveLength(2); // GPU types and chip
    expect(screen.getByText("L4, A100")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("charlie")).toBeInTheDocument();
  });

  it("handles leaderboard with null top_users", () => {
    const mockData = {
      leaderboards: [
        {
          id: 1,
          name: "empty-leaderboard",
          deadline: "2025-12-31T23:59:59Z",
          gpu_types: ["T4"],
          priority_gpu_type: "T4",
          top_users: null,
        },
      ],
      now: "2025-01-01T00:00:00Z",
    };

    const mockHookReturn = {
      data: mockData,
      loading: false,
      hasLoaded: true,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("empty-leaderboard")).toBeInTheDocument();
    expect(screen.getByText("T4")).toBeInTheDocument();
  });

  it("handles leaderboard with empty top_users array", () => {
    const mockData = {
      leaderboards: [
        {
          id: 1,
          name: "no-users-leaderboard",
          deadline: "2025-12-31T23:59:59Z",
          gpu_types: ["L4"],
          priority_gpu_type: "L4",
          top_users: [],
        },
      ],
      now: "2025-01-01T00:00:00Z",
    };

    const mockHookReturn = {
      data: mockData,
      loading: false,
      hasLoaded: true,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("no-users-leaderboard")).toBeInTheDocument();
    expect(screen.getByText("L4")).toBeInTheDocument();
  });

  it("shows active private competitions in their own section before closed competitions", () => {
    vi.mocked(dateUtils.isExpired).mockImplementation((deadline: string | Date) => {
      if (deadline instanceof Date) return deadline.getTime() < Date.now();
      return deadline === "2024-01-01T00:00:00Z";
    });

    const mockData = {
      leaderboards: [
        {
          id: 1,
          name: "public-competition",
          visibility: "public",
          deadline: "2025-12-31T23:59:59Z",
          gpu_types: ["T4"],
          priority_gpu_type: "T4",
          top_users: null,
        },
        {
          id: 2,
          name: "private-competition",
          visibility: "closed",
          deadline: "2025-12-31T23:59:59Z",
          gpu_types: ["A100"],
          priority_gpu_type: "A100",
          top_users: null,
        },
        {
          id: 3,
          name: "expired-public-competition",
          visibility: "public",
          deadline: "2024-01-01T00:00:00Z",
          gpu_types: ["L4"],
          priority_gpu_type: "L4",
          top_users: null,
        },
      ],
      now: "2025-01-01T00:00:00Z",
    };

    const mockHookReturn = {
      data: mockData,
      loading: false,
      hasLoaded: true,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("Active Competitions")).toBeInTheDocument();
    expect(screen.getByText("Private Competitions")).toBeInTheDocument();
    expect(screen.getByText("Closed Competitions")).toBeInTheDocument();
    expect(screen.getByText("private-competition")).toBeInTheDocument();

    const privateHeading = screen.getByText("Private Competitions");
    const closedHeading = screen.getByText("Closed Competitions");
    expect(
      Boolean(
        privateHeading.compareDocumentPosition(closedHeading) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it("keeps expired private competitions in the closed competitions section", () => {
    vi.mocked(dateUtils.isExpired).mockImplementation((deadline: string | Date) => {
      if (deadline instanceof Date) return deadline.getTime() < Date.now();
      return deadline === "2024-01-01T00:00:00Z";
    });

    const mockData = {
      leaderboards: [
        {
          id: 1,
          name: "expired-private-competition",
          visibility: "closed",
          deadline: "2024-01-01T00:00:00Z",
          gpu_types: ["H100"],
          priority_gpu_type: "H100",
          top_users: null,
        },
      ],
      now: "2025-01-01T00:00:00Z",
    };

    const mockHookReturn = {
      data: mockData,
      loading: false,
      hasLoaded: true,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.queryByText("Private Competitions")).not.toBeInTheDocument();
    expect(screen.getByText("Closed Competitions")).toBeInTheDocument();
    expect(screen.getByText("expired-private-competition")).toBeInTheDocument();
  });

  describe("LeaderboardTile functionality", () => {
    it("displays time left correctly", () => {
      const mockData = {
        leaderboards: [
          {
            id: 1,
            name: "test-leaderboard",
            deadline: "2025-12-31T23:59:59Z",
            gpu_types: ["T4"],
            priority_gpu_type: "T4",
            top_users: [
              {
                rank: 1,
                score: 0.123,
                user_name: "alice",
              },
            ],
          },
        ],
        now: "2025-01-01T00:00:00Z",
      };

      const mockHookReturn = {
        data: mockData,
        loading: false,
        hasLoaded: true,
        error: null,
        errorStatus: null,
        call: mockCall,
      };

      (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
        mockHookReturn,
      );

      renderWithProviders(<Home />);

      expect(screen.getByText("2 days 5 hours remaining")).toBeInTheDocument();
    });

    it("formats scores correctly", () => {
      const mockData = {
        leaderboards: [
          {
            id: 1,
            name: "test-leaderboard",
            deadline: "2025-12-31T23:59:59Z",
            gpu_types: ["T4"],
            priority_gpu_type: "T4",
            top_users: [
              {
                rank: 1,
                score: 0.123,
                user_name: "alice",
              },
            ],
          },
        ],
        now: "2025-01-01T00:00:00Z",
      };

      const mockHookReturn = {
        data: mockData,
        loading: false,
        hasLoaded: true,
        error: null,
        errorStatus: null,
        call: mockCall,
      };

      (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
        mockHookReturn,
      );

      renderWithProviders(<Home />);

      expect(screen.getByText("123.000μs")).toBeInTheDocument();
    });

    it("displays multiple users correctly", () => {
      const mockData = {
        leaderboards: [
          {
            id: 1,
            name: "test-leaderboard",
            deadline: "2025-12-31T23:59:59Z",
            gpu_types: ["T4"],
            priority_gpu_type: "T4",
            top_users: [
              {
                rank: 1,
                score: 0.123,
                user_name: "alice",
              },
              {
                rank: 2,
                score: 0.456,
                user_name: "bob",
              },
              {
                rank: 3,
                score: 0.789,
                user_name: "charlie",
              },
            ],
          },
        ],
        now: "2025-01-01T00:00:00Z",
      };

      const mockHookReturn = {
        data: mockData,
        loading: false,
        hasLoaded: true,
        error: null,
        errorStatus: null,
        call: mockCall,
      };

      (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
        mockHookReturn,
      );

      renderWithProviders(<Home />);

      expect(screen.getByText("alice")).toBeInTheDocument();
      expect(screen.getByText("bob")).toBeInTheDocument();
      expect(screen.getByText("charlie")).toBeInTheDocument();
    });

    it("creates correct navigation links", () => {
      const mockData = {
        leaderboards: [
          {
            id: 42,
            name: "test-leaderboard",
            deadline: "2025-12-31T23:59:59Z",
            gpu_types: ["T4"],
            priority_gpu_type: "T4",
            top_users: [
              {
                rank: 1,
                score: 0.123,
                user_name: "alice",
              },
            ],
          },
        ],
        now: "2025-01-01T00:00:00Z",
      };

      const mockHookReturn = {
        data: mockData,
        loading: false,
        hasLoaded: true,
        error: null,
        errorStatus: null,
        call: mockCall,
      };

      (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
        mockHookReturn,
      );

      renderWithProviders(<Home />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/leaderboard/42");
    });

    it("displays priority GPU type chip when top users exist", () => {
      const mockData = {
        leaderboards: [
          {
            id: 1,
            name: "test-leaderboard",
            deadline: "2025-12-31T23:59:59Z",
            gpu_types: ["T4", "L4"],
            priority_gpu_type: "L4",
            top_users: [
              {
                rank: 1,
                score: 0.123,
                user_name: "alice",
              },
            ],
          },
        ],
        now: "2025-01-01T00:00:00Z",
      };

      const mockHookReturn = {
        data: mockData,
        loading: false,
        hasLoaded: true,
        error: null,
        errorStatus: null,
        call: mockCall,
      };

      (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
        mockHookReturn,
      );

      renderWithProviders(<Home />);

      // Should show both GPU types list and priority GPU type chip
      expect(screen.getByText("T4, L4")).toBeInTheDocument();
      expect(screen.getAllByText("L4")).toHaveLength(1); // Only in GPU types list
    });

    it("handles user names with special characters", () => {
      const mockData = {
        leaderboards: [
          {
            id: 1,
            name: "test-leaderboard",
            deadline: "2025-12-31T23:59:59Z",
            gpu_types: ["T4"],
            priority_gpu_type: "T4",
            top_users: [
              {
                rank: 1,
                score: 0.123,
                user_name: "user@example.com",
              },
              {
                rank: 2,
                score: 0.456,
                user_name: "user-with-dashes",
              },
              {
                rank: 3,
                score: 0.789,
                user_name: "user_with_underscores",
              },
            ],
          },
        ],
        now: "2025-01-01T00:00:00Z",
      };

      const mockHookReturn = {
        data: mockData,
        loading: false,
        hasLoaded: true,
        error: null,
        errorStatus: null,
        call: mockCall,
      };

      (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
        mockHookReturn,
      );

      renderWithProviders(<Home />);

      expect(screen.getByText("user@example.com")).toBeInTheDocument();
      expect(screen.getByText("user-with-dashes")).toBeInTheDocument();
      expect(screen.getByText("user_with_underscores")).toBeInTheDocument();
    });

    it("handles empty user name gracefully", () => {
      const mockData = {
        leaderboards: [
          {
            id: 1,
            name: "test-leaderboard",
            deadline: "2025-12-31T23:59:59Z",
            gpu_types: ["T4"],
            priority_gpu_type: "T4",
            top_users: [
              {
                rank: 1,
                score: 0.123,
                user_name: "",
              },
            ],
          },
        ],
        now: "2025-01-01T00:00:00Z",
      };

      const mockHookReturn = {
        data: mockData,
        loading: false,
        hasLoaded: true,
        error: null,
        errorStatus: null,
        call: mockCall,
      };

      (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
        mockHookReturn,
      );

      renderWithProviders(<Home />);

      // Should render the leaderboard even with empty user name
      expect(screen.getByText("test-leaderboard")).toBeInTheDocument();
      expect(screen.getAllByText("T4")).toHaveLength(2); // GPU types and chip
      // Verify that the user score appears even though the username is empty
      expect(screen.getByText("123.000μs")).toBeInTheDocument();
    });

    it("handles single GPU type correctly", () => {
      const mockData = {
        leaderboards: [
          {
            id: 1,
            name: "single-gpu-leaderboard",
            deadline: "2025-12-31T23:59:59Z",
            gpu_types: ["A100"],
            priority_gpu_type: "A100",
            top_users: [
              {
                rank: 1,
                score: 0.123,
                user_name: "alice",
              },
            ],
          },
        ],
        now: "2025-01-01T00:00:00Z",
      };

      const mockHookReturn = {
        data: mockData,
        loading: false,
        hasLoaded: true,
        error: null,
        errorStatus: null,
        call: mockCall,
      };

      (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
        mockHookReturn,
      );

      renderWithProviders(<Home />);

      expect(screen.getByText("single-gpu-leaderboard")).toBeInTheDocument();
      expect(screen.getAllByText("A100")).toHaveLength(2); // One in GPU types, one in chip
    });

    it("handles multiple GPU types correctly", () => {
      const mockData = {
        leaderboards: [
          {
            id: 1,
            name: "multi-gpu-leaderboard",
            deadline: "2025-12-31T23:59:59Z",
            gpu_types: ["T4", "L4", "A100", "H100"],
            priority_gpu_type: "H100",
            top_users: [
              {
                rank: 1,
                score: 0.123,
                user_name: "alice",
              },
            ],
          },
        ],
        now: "2025-01-01T00:00:00Z",
      };

      const mockHookReturn = {
        data: mockData,
        loading: false,
        hasLoaded: true,
        error: null,
        errorStatus: null,
        call: mockCall,
      };

      (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
        mockHookReturn,
      );

      renderWithProviders(<Home />);

      expect(screen.getByText("multi-gpu-leaderboard")).toBeInTheDocument();
      expect(screen.getByText("T4, L4, A100, H100")).toBeInTheDocument();
      expect(screen.getByText("H100")).toBeInTheDocument(); // Priority GPU chip
    });
  });
});
