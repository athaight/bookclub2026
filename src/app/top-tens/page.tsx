"use client";

import { Typography } from "@mui/material";
import MobileNav from "@/components/MobileNav";

export default function TopTensPage() {
  return (
    <>
      <MobileNav />
      <Typography variant="h3" component="h1" gutterBottom>
        Our Top Tens
      </Typography>
    </>
  );
}
