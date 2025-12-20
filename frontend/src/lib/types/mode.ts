export const SubmissionMode = {
  TEST: "test",
  BENCHMARK: "benchmark",
  PROFILE: "profile",
  LEADERBOARD: "leaderboard",
  PRIVATE: "private",
} as const;

export type SubmissionMode =
  (typeof SubmissionMode)[keyof typeof SubmissionMode];
