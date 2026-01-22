"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import MobileNav from "@/components/MobileNav";

const navItems = [
  { label: "Book of the Month", href: "/book-of-the-month" },
  { label: "Reading Challenge", href: "/reading-challenge" },
  { label: "Top Ten", href: "/top-tens" },
  { label: "Libraries", href: "/libraries" },
  { label: "Book Reports", href: "/book-report" },
  { label: "Profiles", href: "/profiles" },
  { label: "Donate", href: "/donate" },
];

export default function SiteHeader() {
  const pathname = usePathname();

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
          Book Bros Book Club
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Desktop quick links (NO login here) */}
        <Box sx={{ display: { xs: "none", lg: "flex" }, gap: 1 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                sx={{
                  fontWeight: isActive ? 700 : 400,
                  backgroundColor: isActive ? "action.selected" : "transparent",
                  "&:hover": {
                    backgroundColor: isActive ? "action.selected" : "action.hover",
                  },
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>
      </Toolbar>
    </AppBar>
  );
}