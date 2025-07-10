import { createTheme, type Components } from "@mui/material/styles";

const MuiCardGlobalStyle: Components["MuiCard"] = {
  styleOverrides: {
    root: {
      border: "1px solid lightgrey",
      boxShadow: "none",
      backgroundColor: "#fcfcfc",
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
  typography: {
    fontFamily: '"Manrope", "Helvetica", sans-serif',
    fontSize: 14,
  },
  components: {
    MuiCard: MuiCardGlobalStyle,
    MuiButton: MuiButtonGlobalStyle,
  },
});
