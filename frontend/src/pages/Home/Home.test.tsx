import { render, screen, fireEvent, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import { appTheme } from "../../components/common/styles/theme";
import Home from "./Home";
import * as apiHook from "../../lib/hooks/useApi";
import { vi, expect, it, describe, beforeEach } from "vitest";

// Mock the API hook
vi.mock("../../lib/hooks/useApi");

// Mock utility functions
vi.mock("../../lib/date/utils", () => ({
  getTimeLeft: vi.fn(() => "2 days 5 hours remaining"),
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
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ThemeProvider>
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
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
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

    renderWithProviders(<Home />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Error (500)")).toBeInTheDocument();
  });

  it("shows error message without status", () => {
    const mockHookReturn = {
      data: null,
      loading: false,
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
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("No active leaderboards found.")).toBeInTheDocument();
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
