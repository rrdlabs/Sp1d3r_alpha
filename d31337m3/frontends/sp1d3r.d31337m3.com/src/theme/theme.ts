import { createTheme } from "@mui/material/styles"

const shared = {
  typography: {
    fontFamily: "'Roboto Mono', 'Roboto', monospace",
    h1: { fontFamily: "'Roboto Mono', monospace", fontWeight: 700 },
    h2: { fontFamily: "'Roboto Mono', monospace", fontWeight: 700 },
    h3: { fontFamily: "'Roboto Mono', monospace", fontWeight: 600 },
    h4: { fontFamily: "'Roboto Mono', monospace", fontWeight: 600 },
    h5: { fontFamily: "'Roboto Mono', monospace", fontWeight: 600 },
    h6: { fontFamily: "'Roboto Mono', monospace", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
  },
}

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: "dark",
    primary: { main: "#00e676", contrastText: "#000000" },
    secondary: { main: "#7c4dff" },
    background: {
      default: "#0a0a0f",
      paper: "#12121a",
    },
    text: {
      primary: "#e0e0e0",
      secondary: "#9e9e9e",
    },
    divider: "rgba(124, 77, 255, 0.2)",
    error: { main: "#ff5252" },
    warning: { main: "#ffab40" },
    info: { main: "#448aff" },
    success: { main: "#00e676" },
  },
})

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: "light",
    primary: { main: "#00c853", contrastText: "#ffffff" },
    secondary: { main: "#651fff" },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
    text: {
      primary: "#1a1a2e",
      secondary: "#555555",
    },
    divider: "rgba(101, 31, 255, 0.2)",
    error: { main: "#d32f2f" },
    warning: { main: "#f57c00" },
    info: { main: "#1976d2" },
    success: { main: "#00c853" },
  },
})
