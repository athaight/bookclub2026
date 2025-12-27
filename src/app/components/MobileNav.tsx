"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Our Top Tens", href: "/top-tens" },
  { label: "Book Report", href: "/book-report" },
  { label: "Donate", href: "/donate" },
  { label: "Admin", href: "/admin" },
];

export default function MobileNav() {
  const isMobile = useMediaQuery("(max-width:899px)");
  const [open, setOpen] = useState(false);

  if (!isMobile) return null;

  return (
    <>
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setOpen(true)} aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            Book Club Bros
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Spacer so content isn't hidden under AppBar */}
      <Toolbar />

      <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <List>
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
        </Box>
      </Drawer>
    </>
  );
}
