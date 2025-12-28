"use client";

import { Box, Divider, Typography } from "@mui/material";
import AuthFooterAction from "@/components/AuthFooterAction";

export default function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        bgcolor: 'background.paper',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        px: 3,  // Add horizontal padding for content
      }}
    >
      <Divider sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: '100%' }}>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          © 2026 Book Bros
        </Typography>
        <AuthFooterAction />
      </Box>
    </Box>
  );
}