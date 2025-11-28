// src/theme/newTheme.js
import { createTheme } from "@mui/material/styles";

const newTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1363DF" },        // Royal blue (action)
    secondary: { main: "#00C896" },      // Mint green (accents)
    background: {
      default: "#F7FAFF",                // App background
      paper: "#FFFFFF",                  // Card / surface
    },
    text: {
      primary: "#0B1A33",                // Ink
      secondary: "#56637A",              // Muted
    },
    divider: "#E6ECF5",
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    h5: { fontWeight: 800 },
    subtitle1: { fontWeight: 700 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid #EEF2F7",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 12, fontWeight: 600 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
});

export default newTheme;
