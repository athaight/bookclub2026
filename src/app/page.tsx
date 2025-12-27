"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Grid from "@mui/material/Grid";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import MobileNav from "@/components/MobileNav";

type BookRow = {
  id: string;
  member_email: string;
  status: "current" | "completed";
  title: string;
  author: string;
  comment: string;
  created_at: string;
  completed_at: string | null;
};

type Bucket = { current?: BookRow; completed: BookRow[] };

function rankLabel(rankIndex: number) {
  if (rankIndex === 0) return "Bibliophile";
  if (rankIndex === 1) return "Bookworm";
  return "Can read gud";
}

function formatBookLine(title: string, author: string) {
  const t = title?.trim();
  const a = author?.trim();
  if (!t && !a) return "—";
  if (t && !a) return t;
  if (!t && a) return a;
  return `${t} — ${a}`;
}

function BookCard({ row }: { row: BookRow }) {
  const [open, setOpen] = useState(false);
  const hasComment = !!row.comment?.trim();

  return (
    <Card sx={{ mb: 1 }}>
      <CardContent sx={{ pb: 1.5 }}>
        <Typography variant="h6" component="h3">
          {row.title?.trim() || "—"}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {row.author?.trim() || "—"}
        </Typography>

        {hasComment && (
          <>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
              <Button size="small" onClick={() => setOpen((v) => !v)}>
                {open ? "See less" : "See more"}
              </Button>
            </Box>

            <Collapse in={open}>
              <Typography variant="body2" sx={{ fontStyle: "italic", mt: 1 }}>
                {row.comment.trim()}
              </Typography>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const members = useMemo(() => getMembers(), []);
  const isMobile = useMediaQuery("(max-width:899px)");

  const [rows, setRows] = useState<BookRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
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

  const orderedForDesktop = scored.length === 3 ? [scored[1], scored[0], scored[2]] : scored;
  const orderedForMobile = scored;

  function renderDesktopColumn(m: { email: string; name: string }, rankIndex: number) {
    const bucket = byEmail[m.email] ?? { completed: [] };
    const current = bucket.current;

    return (
      <Box>
        <Typography
          variant="h5"
          component="h2"
          sx={{ fontWeight: 800, mt: 3, mb: 1 }}
        >
          {rankLabel(rankIndex)}
        </Typography>

        <Box
          sx={{
            position: "sticky",
            top: 8,
            zIndex: 5,
            backgroundColor: "background.default",
            pb: 1,
          }}
        >
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            {m.name}
          </Typography>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="overline">Current book</Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {current ? formatBookLine(current.title, current.author) : "—"}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {bucket.completed.map((b) => (
          <BookCard key={b.id} row={b} />
        ))}
      </Box>
    );
  }

  function renderMobileDetails(m: { email: string; name: string }) {
    const bucket = byEmail[m.email] ?? { completed: [] };
    const current = bucket.current;

    return (
      <>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="overline">Current book</Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {current ? formatBookLine(current.title, current.author) : "—"}
            </Typography>
            {current?.comment?.trim() && (
              <Typography variant="body2" sx={{ fontStyle: "italic", mt: 1 }}>
                {current.comment.trim()}
              </Typography>
            )}
          </CardContent>
        </Card>

        {bucket.completed.map((b) => (
          <BookCard key={b.id} row={b} />
        ))}
      </>
    );
  }

  return (
    <>
      <MobileNav />

      <Typography variant="h3" component="h1" gutterBottom>
        Book Bros Book Club 2026
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button component={Link} href="/admin/login" variant="outlined">
          Log in
        </Button>
      </Box>

      {isMobile && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {orderedForMobile.map((m, rankIndex) => {
            const bucket = byEmail[m.email] ?? { completed: [] };
            const current = bucket.current;
            const currentLine = current ? formatBookLine(current.title, current.author) : "—";
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
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                      {rankLabel(rankIndex)}
                    </Typography>
                    <Typography variant="subtitle1" component="h2">
                      {m.name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      Current: {currentLine}
                    </Typography>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>{renderMobileDetails(m)}</AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {!isMobile && (
        <Grid container spacing={2}>
          {orderedForDesktop.map((m) => {
            const rankIndex = scored.findIndex((s) => s.email === m.email);
            return (
              <Grid key={m.email} size={{ xs: 12, md: 4 }}>
                {renderDesktopColumn(m, rankIndex)}
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );
}
