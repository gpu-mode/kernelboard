import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/test-utils";
import SubmissionCodeSidebar from "./SubmissionCodeSidebar";

describe("SubmissionCodeSidebar", () => {
  it("shows LOC when line count metadata is available", () => {
    renderWithProviders(
      <SubmissionCodeSidebar
        selectedSubmission={{
          submissionId: 123,
          userName: "alice",
          fileName: "solution.py",
          score: 12.5,
        }}
        navigationItems={[]}
        navigationIndex={0}
        codes={new Map([[123, "print('hello')\nprint('world')\n"]])}
        lineCounts={new Map([[123, 2]])}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getByText("LOC")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not show LOC without line count metadata", () => {
    renderWithProviders(
      <SubmissionCodeSidebar
        selectedSubmission={{
          submissionId: 123,
          userName: "alice",
          fileName: "solution.py",
          score: 12.5,
        }}
        navigationItems={[]}
        navigationIndex={0}
        codes={new Map([[123, "print('hello')\n"]])}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.queryByText("LOC")).not.toBeInTheDocument();
  });
});
