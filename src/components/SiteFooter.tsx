"use client";

import { Box, Divider, Typography } from "@mui/material";
import AuthFooterAction from "@/components/AuthFooterAction";

export default function SiteFooter() {
  return (
    <Box component="footer" sx={{ mt: 6, pb: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          © 2026 Book Bros
        </Typography>
        <AuthFooterAction />
      </Box>
    </Box>
  );
}
