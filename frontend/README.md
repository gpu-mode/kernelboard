# KernelBoard Frontend
A react based frontend for the kernel board.


# Unit tests
we use [vitest](https://vitest.dev/) to test our vite+react KernelBoard.

To run ui unittests
```
cd frontend
npm run test
```

## Example of unit test

### assert test items
Assume you have a toggle component that can be expanded by user click.
`data-testid` is mainly used for testing, set test id for the toggle button and
 icon elements.
```
// ToggleShowMore.tsx
export function ToggleShowMore() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ textAlign: "center", py: 1 }}>
      <Typography
        variant="body2"
        sx={{ cursor: "pointer" }}
        onClick={() => setExpanded((e) => !e)}
        data-testid="codeblock-show-all-toggle"
      >
        {expanded ? "Hide" : "Show more"}
        {expanded ? (
          <ExpandLessIcon fontSize="small" data-testid="icon-less" />
        ) : (
          <ExpandMoreIcon fontSize="small" data-testid="icon-more" />
        )}
      </Typography>
    </Box>
  );
}
```

Unit test to test the toggle behavior.
```
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleShowMore } from './ToggleShowMore';

describe('ToggleShowMore', () => {
  it('toggles expanded state on click', () => {
    render(<ToggleShowMore />);

    const toggle = screen.getByTestId('codeblock-show-all-toggle');

    // Initial state
    expect(screen.getByText(/show more/i)).toBeInTheDocument();
    expect(screen.getByTestId('icon-more')).toBeInTheDocument();

    // Click to expand
    fireEvent.click(toggle);
    expect(screen.getByText(/hide/i)).toBeInTheDocument();
    expect(screen.getByTestId('icon-less')).toBeInTheDocument();

    // Click to collapse again
    fireEvent.click(toggle);
    expect(screen.getByText(/show more/i)).toBeInTheDocument();
    expect(screen.getByTestId('icon-more')).toBeInTheDocument();
  });
});
```
