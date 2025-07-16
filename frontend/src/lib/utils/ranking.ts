/**
 * Format score as a string with 3 decimal places in microseconds.
 * Matches the Python format_score function.
 */
export const formatMicroseconds = (score: number): string => {
    return `${(score * 1_000_000).toFixed(3)}μs`;
};
