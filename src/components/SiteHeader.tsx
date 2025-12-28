"use client";

import Link from "next/link";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import MobileNav from "@/components/MobileNav";

export default function SiteHeader() {
  return (
    <AppBar position="sticky" color="default" elevation={0}>
      <Toolbar sx={{ gap: 1 }}>
        <MobileNav />

        <Typography
          component={Link}
          href="/"
          variant="h6"
          sx={{ textDecoration: "none", color: "inherit", fontWeight: 700 }}
        >
          Book Bros Book Club 2026
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Desktop quick links (NO login here) */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
          <Button component={Link} href="/top-tens">
            Our Top Tens
          </Button>
          <Button component={Link} href="/book-report">
            Book Report
          </Button>
          <Button component={Link} href="/donate">
            Donate
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
