import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {
  CssBaseline,
  StyledEngineProvider,
  ThemeProvider,
  createTheme,
} from "@mui/material";

import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "./global.css";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#4dd0e1",
    },
    secondary: {
      main: "#fbbf24",
    },
    background: {
      default: "#07111f",
      paper: "rgba(15, 26, 47, 0.92)",
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h5: {
      fontWeight: 700,
    },
  },
});

const root = createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </BrowserRouter>
);

reportWebVitals();
