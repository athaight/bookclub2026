import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { CssBaseline, Container } from "@mui/material";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Book Bros Book Club 2026",
  description: "Book club tracker",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <CssBaseline />
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <SiteHeader />
            {children}
          </Container>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
