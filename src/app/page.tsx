"use client";

import { Box, Button, Container, Typography } from "@mui/material";
import Link from "next/link";

export default function LandingPage() {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px - 88px)", // Viewport minus header and footer padding
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            textAlign: "center",
            py: { xs: 4, md: 0 },
          }}
        >
          {/* Hero Title */}
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem" },
              fontWeight: 800,
              mb: 3,
              lineHeight: 1.1,
            }}
          >
            Book Bros Book Club
          </Typography>

          {/* Quote */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h5"
              component="blockquote"
              sx={{
                fontStyle: "italic",
                color: "text.secondary",
                mb: 1,
                fontSize: { xs: "1.1rem", sm: "1.25rem", md: "1.5rem" },
              }}
            >
              &ldquo;A person who won&apos;t read has no advantage over one who can&apos;t read.&rdquo;
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                fontWeight: 500,
              }}
            >
              — Mark Twain
            </Typography>
          </Box>

          {/* Subheadline */}
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              mb: 4,
              maxWidth: 600,
              mx: "auto",
              fontSize: { xs: "1rem", md: "1.125rem" },
              lineHeight: 1.7,
            }}
          >
            This book club is for us to record our readings, discuss some, and suggest others. 
            See our progress as we read and be sure to follow along on our 2026 challenge.
          </Typography>

          {/* CTA Button */}
          <Button
            component={Link}
            href="/book-of-the-month"
            variant="contained"
            size="large"
            sx={{
              px: 5,
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 2,
            }}
          >
            Enter the Club
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
