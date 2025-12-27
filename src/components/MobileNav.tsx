"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Our Top Tens", href: "/top-tens" },
  { label: "Book Report", href: "/book-report" },
  { label: "Donate", href: "/donate" },
  { label: "Admin Login", href: "/admin/login" },
];

export default function MobileNav() {
  const isMobile = useMediaQuery("(max-width:899px)");
  const [open, setOpen] = useState(false);

  if (!isMobile) return null;

  return (
    <>
      <IconButton
        edge="start"
        aria-label="open menu"
        onClick={() => setOpen(true)}
        sx={{ mr: 1 }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <Toolbar />
        <List sx={{ width: 260 }}>
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
      </Drawer>
    </>
  );
}
