import {
  createTheme,
  type Components,
  type PaletteMode,
} from "@mui/material/styles";

const colorPalette = {
  primary: "#5865F2", // Blurple, Discord's brand color
  secondary: "#38bdf8", // sky[400]
  accent: "#a855f7", // purple[500]
  neutral: "#cbd5e1", // slate[300]
  dark: "#1e293b", // slate[800]
  discord: "#5865F2", // Same color as primary
  discordDarker: "#4F5AD9", // Like blurple but darker
  toastDefault: "#1e40af", // blue[800]
  toastError: "#991b1b", // red[800]
};

// Extend the Material-UI theme interface to include custom colors
declare module "@mui/material/styles" {
  interface Palette {
    custom: typeof colorPalette;
  }

  interface PaletteOptions {
    custom?: typeof colorPalette;
  }
}

// the global styles apply to app-wide

const getMuiCardGlobalStyle = (mode: PaletteMode): Components["MuiCard"] => ({
  styleOverrides: {
    root: {
      border: `1px solid ${mode === "dark" ? "#333" : colorPalette.neutral}`,
      boxShadow: "none",
      borderRadius: "12px",
      padding: "16px",
    },
  },
});

const getMuiButtonGlobalStyle = (
  mode: PaletteMode,
): Components["MuiButton"] => ({
  defaultProps: {
    variant: "contained",
    disableElevation: true,
  },
  styleOverrides: {
    root: {
      backgroundColor: mode === "dark" ? "#23272f" : "#e6f0ff",
      color: mode === "dark" ? "#e0e0e0" : "#333",
      fontWeight: 500,
      fontSize: "0.9rem",
      textTransform: "none",
      borderRadius: "13px",
      padding: "1px 5px",
      boxShadow: "none",
      border: `1px solid ${mode === "dark" ? "#444" : "#ddd"}`,
      "&:hover": {
        backgroundColor: mode === "dark" ? "#2d3340" : "#d0e4ff",
      },
      "&:active": {
        backgroundColor: mode === "dark" ? "#3a4050" : "#b3d4ff",
      },
    },
  },
});

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: colorPalette.primary,
      },
      secondary: {
        main: colorPalette.secondary,
      },
      custom: colorPalette,
      ...(mode === "dark" && {
        background: {
          default: "#0f1117",
          paper: "#181a20",
        },
      }),
    },
    typography: {
      fontFamily:
        'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      fontSize: 14,
      h1: {
        fontSize: "1.875rem",
        lineHeight: "2.25rem",
        fontWeight: 700,
        marginTop: "1rem",
      },
      h2: {
        fontSize: "1.5rem",
        lineHeight: "2rem",
        fontWeight: 700,
        marginTop: "1rem",
      },
      h3: {
        fontSize: "1.25rem",
        lineHeight: "1.75rem",
        fontWeight: 700,
        marginTop: "1rem",
      },
    },
    components: {
      MuiCard: getMuiCardGlobalStyle(mode),
      MuiButton: getMuiButtonGlobalStyle(mode),
    },
  });
}

export const appTheme = createAppTheme("light");
