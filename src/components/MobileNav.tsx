"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AuthFooterAction from "@/components/AuthFooterAction";

const navItems = [
  { label: "Book of the Month", href: "/book-of-the-month" },
  { label: "Reading Challenge", href: "/reading-challenge" },
  { label: "Top Ten", href: "/top-tens" },
  { label: "Libraries", href: "/libraries" },
  { label: "Book Reports", href: "/book-report" },
  { label: "Profiles", href: "/profiles" },
  { label: "Donate", href: "/donate" },
];

export default function MobileNav() {
  const isMobile = useMediaQuery("(max-width:899px)");
  const [open, setOpen] = useState(false);

  if (!isMobile) return null;

  return (
    <>
      <IconButton
        edge="start"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        sx={{ mr: 1 }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer open={open} onClose={() => setOpen(false)} aria-label="Main navigation menu">
        <Box sx={{ width: 260, height: "100%", display: "flex", flexDirection: "column" }}>
          <List sx={{ flex: 1 }}>
            {navItems.map((item) => (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                onClick={() => setOpen(false)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>

          <Divider />

          <Box sx={{ p: 1, display: "flex", justifyContent: "flex-end" }}>
            {/* footer auth action inside drawer */}
            <AuthFooterAction />
          </Box>
        </Box>
      </Drawer>
    </>
  );
}