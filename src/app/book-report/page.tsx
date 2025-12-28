"use client";

import { Typography, Box, Card, CardContent } from "@mui/material";
import MobileNav from "@/components/MobileNav";

export default function BookReportPage() {
  return (
    <>
      <MobileNav />
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Book Reports
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Card sx={{
          maxWidth: 600,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                mb: 2
              }}
            >
              Coming Soon
            </Typography>
            <Typography
              variant="h6"
              sx={{
                opacity: 0.9,
                lineHeight: 1.6,
                fontStyle: 'italic'
              }}
            >
              Our reviews and thoughts on books that we found extra juicy. Check back soon!
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
