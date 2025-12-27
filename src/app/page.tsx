// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Grid from "@mui/material/Grid";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import Link from "next/link";

type BookRow = {
  id: string;
  member_email: string;
  status: "current" | "completed";
  title: string;
  created_at: string;
  completed_at: string | null;
};

type Bucket = { current?: BookRow; completed: BookRow[] };

export default function HomePage() {
  const members = useMemo(() => getMembers(), []);
  const isMobile = useMediaQuery("(max-width:899px)"); // < md

  const [rows, setRows] = useState<BookRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // expanded by default (mobile)
    const init: Record<string, boolean> = {};
    for (const m of members) init[m.email] = true;
    setExpanded(init);
  }, [members]);

  useEffect(() => {
    (async () => {
      setErr(null);

      const { data, error } = await supabase
        .from("books")
        .select("*")
        .in(
          "member_email",
          members.map((m) => m.email)
        );

      if (error) setErr(error.message);
      setRows((data ?? []) as BookRow[]);
    })();
  }, [members]);

  if (err) return <Typography color="error">DB error: {err}</Typography>;

  const byEmail: Record<string, Bucket> = {};
  for (const m of members) byEmail[m.email] = { completed: [] };

  for (const r of rows) {
    const bucket = byEmail[r.member_email];
    if (!bucket) continue;
    if (r.status === "current") bucket.current = r;
    else bucket.completed.push(r);
  }

  for (const email of Object.keys(byEmail)) {
    byEmail[email].completed.sort(
      (a, b) =>
        new Date(b.completed_at ?? b.created_at).getTime() -
        new Date(a.completed_at ?? a.created_at).getTime()
    );
  }

  const scored = members
    .map((m) => ({
      ...m,
      completedCount: byEmail[m.email]?.completed.length ?? 0,
    }))
    .sort((a, b) => b.completedCount - a.completedCount);

  // Desktop layout needs leader in center: [2nd, 1st, 3rd]
  const orderedForDesktop =
    scored.length === 3 ? [scored[1], scored[0], scored[2]] : scored;

  // Mobile: show rank order top-to-bottom: [1st, 2nd, 3rd]
  const orderedForMobile = scored;

  function rankLabel(rankIndex: number) {
    if (rankIndex === 0) return "1 Bibliophile";
    if (rankIndex === 1) return "2 Bookworm";
    return "3 Can read gud";
  }

  function renderColumn(m: { email: string; name: string }, rankIndex: number) {
    const bucket = byEmail[m.email] ?? { completed: [] };
    const currentTitle = bucket.current?.title?.trim() || "—";

    return (
      <Box>
        {/* Sticky header for desktop (page scrolls, not column scroll) */}
        <Box
          sx={{
            position: { xs: "static", md: "sticky" },
            top: { md: 8 },
            zIndex: { md: 5 },
            backgroundColor: { md: "background.default" },
            pb: { md: 1 },
          }}
        >
          <Typography
            variant="subtitle1"
            component="h2"
            sx={{ fontWeight: 700, mb: 0.5 }}
          >
            {rankLabel(rankIndex)}
          </Typography>

          <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
            {m.name}
          </Typography>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="overline">Current book</Typography>
              <Typography variant="h6" component="h3">
                {currentTitle}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Completed list (normal flow; whole page scrolls) */}
        {bucket.completed.map((b) => (
          <Card key={b.id} sx={{ mb: 1 }}>
            <CardContent>
              <Typography variant="h6" component="h3">
                {b.title || "—"}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  function renderMobileDetails(m: { email: string; name: string }) {
    const bucket = byEmail[m.email] ?? { completed: [] };
    const currentTitle = bucket.current?.title?.trim() || "—";

    return (
      <>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="overline">Current book</Typography>
            <Typography variant="h6" component="h3">
              {currentTitle}
            </Typography>
          </CardContent>
        </Card>

        {bucket.completed.map((b) => (
          <Card key={b.id} sx={{ mb: 1 }}>
            <CardContent>
              <Typography variant="h6" component="h3">
                {b.title || "—"}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  return (
    <>
      <Typography variant="h3" component="h1" gutterBottom>
        2026 Book Club Bros
      </Typography>

      {/* Login button (top-right) */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button component={Link} href="/admin/login" variant="outlined">
          Log in
        </Button>
      </Box>

      {/* MOBILE: accordions */}
      {isMobile && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {orderedForMobile.map((m, rankIndex) => {
            const bucket = byEmail[m.email] ?? { completed: [] };
            const currentTitle = bucket.current?.title?.trim() || "—";
            const isExpanded = !!expanded[m.email];

            return (
              <Accordion
                key={m.email}
                expanded={isExpanded}
                onChange={() =>
                  setExpanded((prev) => ({ ...prev, [m.email]: !prev[m.email] }))
                }
                disableGutters
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    position: isExpanded ? "static" : "sticky",
                    top: 0,
                    zIndex: isExpanded ? "auto" : 10,
                    backgroundColor: "background.paper",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ width: "100%" }}>
                    <Typography
                      variant="subtitle1"
                      component="h2"
                      sx={{ fontWeight: 700 }}
                    >
                      {rankLabel(rankIndex)}
                    </Typography>
                    <Typography variant="h6" component="h2">
                      {m.name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      Current: {currentTitle}
                    </Typography>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>{renderMobileDetails(m)}</AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* DESKTOP: 3 columns, page scroll */}
      {!isMobile && (
        <Grid container spacing={2}>
          {orderedForDesktop.map((m) => {
            // rankIndex based on scored order (1st/2nd/3rd)
            const rankIndex = scored.findIndex((s) => s.email === m.email);
            return (
              <Grid key={m.email} size={{ xs: 12, md: 4 }}>
                {renderColumn(m, rankIndex)}
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );
}
