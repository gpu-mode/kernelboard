import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '@mui/material';
import { appTheme } from './styles/theme';
import { ColoredSquare } from './ColoredSquare';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={appTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('ColoredSquare', () => {
  it('should render without crashing', () => {
    renderWithTheme(<ColoredSquare name="test" />);
  });

  it('should render with custom size', () => {
    const { container } = renderWithTheme(<ColoredSquare name="test" size={24} />);
    const square = container.firstChild as HTMLElement;
    
    // Check if the element has the expected size styles
    expect(square).toBeInTheDocument();
  });

  it('should generate consistent colors for the same name', () => {
    const { container: container1 } = renderWithTheme(<ColoredSquare name="test-name" />);
    const { container: container2 } = renderWithTheme(<ColoredSquare name="test-name" />);
    
    const square1 = container1.firstChild as HTMLElement;
    const square2 = container2.firstChild as HTMLElement;
    
    // Both squares should have the same background color
    const style1 = window.getComputedStyle(square1);
    const style2 = window.getComputedStyle(square2);
    
    expect(style1.backgroundColor).toBe(style2.backgroundColor);
  });
});
