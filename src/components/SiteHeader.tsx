"use client";

import Link from "next/link";
import { AppBar, Box, Toolbar, Typography } from "@mui/material";
import MobileNav from "@/components/MobileNav";

export default function SiteHeader() {
  return (
    <AppBar position="sticky" color="default" elevation={0}>
      <Toolbar sx={{ gap: 1 }}>
        {/* Mobile-only hamburger */}
        <Box sx={{ display: { xs: "flex", md: "none" } }}>
          <MobileNav />
        </Box>

        <Typography
          component={Link}
          href="/"
          variant="h6"
          sx={{ textDecoration: "none", color: "inherit", fontWeight: 700 }}
        >
          Book Bros Book Club 2026
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Desktop-only section can be blank for now or keep nav buttons if you want.
            We are moving auth to footer, so no login/logout here. */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }} />
      </Toolbar>
    </AppBar>
  );
}
