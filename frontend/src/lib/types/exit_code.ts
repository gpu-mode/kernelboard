const exitCodeMessages: { [key: number]: string } = {
  0: "Program completed successfully.",
  110: "A CUDA API call failed.",
  111: "Could not setup file descriptor for custom pipe.",
  112: "The run did not crash, but tests failed.",
  113: "Problem parsing test/benchmark specification.",
  114: "Process was shut down because it timed out.",
};

export function getExitCodeMessage(code: number): string {
  return exitCodeMessages[code] ?? `non-running exit code found: ${code}`;
}
