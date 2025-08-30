import { render, screen, fireEvent, within } from "@testing-library/react";
import { vi, expect, it, describe, beforeEach } from "vitest";
import Leaderboard from "./Leaderboard";
import * as apiHook from "../../lib/hooks/useApi";
import { renderWithRouter } from "../../tests/test-utils";

// --- Mocks ---
vi.mock("../../lib/hooks/useApi", () => ({
  fetcherApiCallback: vi.fn(),
}));

// Mutable auth state for mocking useAuthStore per test
type AuthState = {
  me: null | { authenticated: boolean; user?: { identity?: string } };
};
let currentAuth: AuthState = { me: null };

vi.mock("../../lib/store/authStore", () => {
  return {
    // Simulate Zustand's selector pattern
    useAuthStore: (selector: any) =>
      selector({
        me: currentAuth.me,
      }),
  };
});

// --- Shared fixtures ---
const mockDeadline = "2025-06-29T17:00:00-07:00";
const mockExpiredDeadline = "2024-01-29T12:00:00-02:00";
const mockDescription = "Implement a 2D the given specifications";
const mockReference = "import torch";
const mockName = "test-game";

describe("Leaderboard", () => {
  const mockCall = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z")); // freeze "now"
    currentAuth = { me: null }; // default: not authed
  });

  // -------------------- Basic rendering --------------------

  it("renders name, description, gpu types; rankings visible on Rankings tab; reference visible after switching to Reference tab", () => {
    const mockData = {
      deadline: mockDeadline,
      description: mockDescription,
      name: mockName,
      reference: mockReference,
      gpu_types: ["T1", "T2"],
      rankings: {
        T1: [
          {
            file_name: "test.py",
            prev_score: 0.1,
            rank: 1,
            score: 3.25,
            user_name: "user1",
          },
        ],
        T2: [
          {
            file_name: "test2.py",
            prev_score: 0.1,
            rank: 1,
            score: 3.25,
            user_name: "user2",
          },
        ],
      },
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);

    // Header + description are outside tabs
    expect(screen.getByText(mockName)).toBeInTheDocument();
    expect(screen.getByText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(mockDescription)).toBeInTheDocument();

    // Tabs exist
    const rankingsTab = screen.getByRole("tab", { name: /Rankings/i });
    const referenceTab = screen.getByRole("tab", { name: /Reference/i });
    const submissionTab = screen.getByRole("tab", { name: /Submission/i });
    expect(rankingsTab).toBeInTheDocument();
    expect(referenceTab).toBeInTheDocument();
    expect(submissionTab).toBeInTheDocument();

    // Default is Rankings tab -> rankings content visible
    expect(screen.getByText(/user1/)).toBeInTheDocument();
    expect(screen.getByText(/user2/)).toBeInTheDocument();

    // Switch to Reference tab before asserting its content
    fireEvent.click(referenceTab);
    expect(screen.getByText(/Reference Implementation/i)).toBeInTheDocument();
    expect(screen.getByText(/import/)).toBeInTheDocument();
    expect(screen.getByText(/torch/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);
    expect(screen.getByText(/Summoning/i)).toBeInTheDocument();
  });

  it("shows error message", () => {
    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      loading: false,
      error: "Something went wrong",
      errorStatus: 500,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  // -------------------- Rankings empty state --------------------

  it("shows no submission message when no rankings are present", () => {
    const mockData = {
      name: "test-empty",
      description: "",
      deadline: "",
      gpu_types: ["T1"],
      rankings: {},
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);
    expect(screen.getByText("test-empty")).toBeInTheDocument();
    // Matches component's current copy
    expect(screen.getByText(/No Submission Yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Be the first to submit a solution/i),
    ).toBeInTheDocument();
  });

  // -------------------- Rankings expand/hide toggle --------------------

  it("does not show expand button if ranking has less than 4 items", () => {
    const mockData = {
      name: "test-small",
      description: "",
      deadline: "",
      gpu_types: ["T1"],
      rankings: {
        T1: [
          {
            file_name: "f.py",
            prev_score: 0,
            rank: 1,
            score: 1,
            user_name: "u1",
          },
          {
            file_name: "f.py",
            prev_score: 0,
            rank: 2,
            score: 1,
            user_name: "u2",
          },
          {
            file_name: "f.py",
            prev_score: 0,
            rank: 3,
            score: 1,
            user_name: "u3",
          },
        ],
      },
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);
    expect(
      screen.queryByTestId("ranking-show-all-button-0"),
    ).not.toBeInTheDocument();
  });

  it("shows expand button if ranking has ≥ 4 items and toggles rows", () => {
    const mockData = {
      name: "test-large",
      description: "",
      deadline: "",
      gpu_types: ["T1"],
      rankings: {
        T1: [
          {
            file_name: "f.py",
            prev_score: 0,
            rank: 1,
            score: 1,
            user_name: "u1",
          },
          {
            file_name: "f.py",
            prev_score: 0,
            rank: 2,
            score: 1,
            user_name: "u2",
          },
          {
            file_name: "f.py",
            prev_score: 0,
            rank: 3,
            score: 1,
            user_name: "u3",
          },
          {
            file_name: "f.py",
            prev_score: 0,
            rank: 4,
            score: 1,
            user_name: "u4",
          },
        ],
      },
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);

    const btn = screen.queryByTestId("ranking-show-all-button-0");
    expect(btn).toBeInTheDocument();

    // By default only 3 rows shown
    expect(screen.queryAllByTestId("ranking-0-row")).toHaveLength(3);

    // Click to show all
    fireEvent.click(btn!);
    expect(screen.queryAllByTestId("ranking-0-row")).toHaveLength(4);
    expect(within(btn!).getByText(/Hide/i)).toBeInTheDocument();

    // Click to hide again
    fireEvent.click(btn!);
    expect(screen.queryAllByTestId("ranking-0-row")).toHaveLength(3);
  });

  // -------------------- Reference codeblock --------------------

  it("show reference codeblock (after switching to Reference tab)", () => {
    const mockData = {
      name: "test-code",
      description: "",
      deadline: "",
      gpu_types: ["T1"],
      reference: mockReference,
      rankings: { T1: [] },
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);

    // Must switch to Reference tab first
    fireEvent.click(screen.getByRole("tab", { name: /Reference/i }));

    // Reference codeblock should be visible
    expect(screen.getByText(/Reference Implementation/i)).toBeInTheDocument();
    expect(screen.getByText(/import/)).toBeInTheDocument();
    expect(screen.getByText(/torch/)).toBeInTheDocument();
  });

  // -------------------- Tabs behavior (switching) --------------------

  it("starts on Rankings tab by default and can switch to Reference and back", () => {
    const mockData = {
      deadline: mockDeadline,
      description: mockDescription,
      name: mockName,
      reference: mockReference,
      gpu_types: ["T1"],
      rankings: {
        T1: [
          {
            file_name: "test.py",
            prev_score: 0.1,
            rank: 1,
            score: 3.25,
            user_name: "user1",
          },
        ],
      },
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);

    // Default selected tab should be Rankings (content visible)
    expect(screen.getByText(/user1/)).toBeInTheDocument();

    // Switch to Reference tab
    fireEvent.click(screen.getByRole("tab", { name: /Reference/i }));
    expect(screen.getByText(/Reference Implementation/i)).toBeInTheDocument();
    expect(screen.getByText(/import/)).toBeInTheDocument();
    expect(screen.getByText(/torch/)).toBeInTheDocument();

    // Switch back to Rankings tab
    fireEvent.click(screen.getByRole("tab", { name: /Rankings/i }));
    expect(screen.getByText(/user1/)).toBeInTheDocument();
  });

  it("can switch from Rankings to Submission tab when not authed", () => {
    const mockData = {
      deadline: mockDeadline,
      description: mockDescription,
      name: mockName,
      reference: mockReference,
      gpu_types: ["T1"],
      rankings: { T1: [] },
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);

    fireEvent.click(screen.getByRole("tab", { name: /Submission/i }));
    expect(screen.getByText(/please login to submit/i)).toBeInTheDocument();
  });

  // -------------------- Submission tab: authed vs not authed --------------------

  it("Submission tab shows login tip when not authed", () => {
    const mockData = {
      name: "lb-noauth",
      description: "",
      deadline: mockDeadline,
      gpu_types: ["T1"],
      reference: mockReference,
      rankings: { T1: [] },
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    // No need to rely on URL for this test; just render and click the tab
    renderWithRouter(<Leaderboard />);

    // Switch to the Submission tab explicitly
    fireEvent.click(screen.getByRole("tab", { name: /Submission/i }));

    // Now the Submission panel should be visible for non-authed users
    expect(screen.getByText(/please login to submit/i)).toBeInTheDocument();
  });

  it("Submission tab renders submit UI when authed (URL drives tab)", () => {
    currentAuth = { me: { authenticated: true, user: { identity: "u-1" } } };

    const mockData = {
      name: "lb-auth",
      description: "",
      deadline: mockDeadline,
      gpu_types: ["T1"],
      reference: mockReference,
      rankings: { T1: [] },
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);

    // Switch to the Submission tab explicitly
    fireEvent.click(screen.getByRole("tab", { name: /Submission/i }));

    // Login tip should NOT be visible; submission card should be visible
    expect(
      screen.queryByText(/please login to submit/i),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("leaderboard-submit-btn")).toBeInTheDocument();
    expect(
      screen.getByTestId("submission-history-section"),
    ).toBeInTheDocument();
  });

  it("shows Submit button when deadline is in the future", () => {
    currentAuth = { me: { authenticated: true, user: { identity: "u-1" } } };

    const mockData = {
      name: "lb-auth",
      description: "",
      deadline: mockDeadline,
      gpu_types: ["T1"],
      reference: mockReference,
      rankings: { T1: [] },
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);

    // Switch to the Submission tab explicitly
    fireEvent.click(screen.getByRole("tab", { name: /Submission/i }));

    const submit_btn = screen.getByTestId("leaderboard-submit-btn");
    expect(submit_btn).toBeInTheDocument();
    expect(submit_btn).not.toBeDisabled();

    expect(
      screen.queryByTestId("deadline-passed-text"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("submission-history-section"),
    ).toBeInTheDocument();
  });

  it("shows expired message when deadline is in the past", () => {
    currentAuth = { me: { authenticated: true, user: { identity: "u-1" } } };

    const mockData = {
      name: "lb-auth",
      description: "",
      deadline: mockExpiredDeadline,
      gpu_types: ["T1"],
      reference: mockReference,
      rankings: { T1: [] },
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    });

    renderWithRouter(<Leaderboard />);

    // Switch to the Submission tab explicitly
    fireEvent.click(screen.getByRole("tab", { name: /Submission/i }));

    const submit_btn = screen.getByTestId("leaderboard-submit-btn");
    expect(submit_btn).toBeInTheDocument();
    expect(submit_btn).toBeDisabled();

    const deadline_txt = screen.getByTestId("deadline-passed-text");
    expect(
      within(deadline_txt).getByText(/deadline has passed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("submission-history-section"),
    ).toBeInTheDocument();
  });
});
