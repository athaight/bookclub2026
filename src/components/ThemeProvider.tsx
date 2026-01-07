"use client";

import { useMemo, ReactNode } from "react";
import { ThemeProvider as MUIThemeProvider, createTheme, useMediaQuery } from "@mui/material";

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  // Detect system preference for dark mode
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
          primary: {
            main: "#667eea",
          },
          secondary: {
            main: "#764ba2",
          },
          ...(prefersDarkMode
            ? {
                // Dark mode customizations
                background: {
                  default: "#121212",
                  paper: "#1e1e1e",
                },
              }
            : {
                // Light mode customizations
                background: {
                  default: "#fafafa",
                  paper: "#ffffff",
                },
              }),
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontWeight: 700,
          },
          h2: {
            fontWeight: 600,
          },
          h3: {
            fontWeight: 600,
          },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
            },
          },
        },
      }),
    [prefersDarkMode]
  );

  return <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>;
}
