import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { Box, CssBaseline, Container } from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Book Bros Book Club",
  description: "Book club tracker",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lilita+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppRouterCacheProvider>
          <CssBaseline />

          {/* Sticky footer page layout */}
          <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Skip link for keyboard navigation - uses CSS :focus for visibility */}
            <Box
              component="a"
              href="#main-content"
              sx={{
                position: 'absolute',
                left: '-9999px',
                top: 'auto',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
                zIndex: 9999,
                '&:focus': {
                  position: 'fixed',
                  top: '10px',
                  left: '10px',
                  width: 'auto',
                  height: 'auto',
                  padding: '10px 20px',
                  backgroundColor: 'primary.main',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  boxShadow: 3,
                },
              }}
            >
              Skip to main content
            </Box>
            <SiteHeader />

            <Container
              component="main"
              id="main-content"
              maxWidth="lg"
              sx={{ pt: 3, pb: '88px', flex: 1 }}  // 64px footer height + 24px gap
            >
              {children}
            </Container>

            <SiteFooter />
          </Box>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}