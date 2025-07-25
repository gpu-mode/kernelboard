import { createTheme, type Components } from "@mui/material/styles";

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

const MuiCardGlobalStyle: Components["MuiCard"] = {
  styleOverrides: {
    root: {
      border: `1px solid ${colorPalette.neutral}`,
      boxShadow: "none",
      borderRadius: "12px",
      padding: "16px",
    },
  },
};

const MuiButtonGlobalStyle: Components["MuiButton"] = {
  defaultProps: {
    variant: "contained",
    disableElevation: true,
  },
  styleOverrides: {
    root: {
      backgroundColor: "#e6f0ff",
      color: "#333",
      fontWeight: 500,
      fontSize: "0.9rem",
      textTransform: "none",
      borderRadius: "13px",
      padding: "1px 5px",
      boxShadow: "none",
      border: "1px solid #ddd",
      "&:hover": {
        backgroundColor: "#d0e4ff",
      },
      "&:active": {
        backgroundColor: "#b3d4ff",
      },
    },
  },
};

export const appTheme = createTheme({
  palette: {
    primary: {
      main: colorPalette.primary,
    },
    secondary: {
      main: colorPalette.secondary,
    },
    custom: colorPalette,
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
    MuiCard: MuiCardGlobalStyle,
    MuiButton: MuiButtonGlobalStyle,
  },
});
