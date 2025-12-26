// src/app/admin/page.tsx
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
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Grid from "@mui/material/Grid";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";

type BookRow = {
  id: string;
  member_email: string;
  status: "current" | "completed";
  title: string;
  created_at: string;
  completed_at: string | null;
};

type Bucket = { current?: BookRow; completed: BookRow[] };

export default function AdminPage() {
  const members = useMemo(() => getMembers(), []);
  const isMobile = useMediaQuery("(max-width:899px)"); // < md

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<BookRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // edit state
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [markComplete, setMarkComplete] = useState(false);

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const m of members) init[m.email] = true;
    setExpanded(init);
  }, [members]);

  async function loadSessionAndData() {
    setErr(null);

    const { data: sess } = await supabase.auth.getSession();
    const email = sess.session?.user?.email ?? null;

    if (!email) {
      window.location.href = "/admin/login";
      return;
    }

    setSessionEmail(email);

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .in(
        "member_email",
        members.map((m) => m.email)
      );

    if (error) setErr(error.message);
    setRows((data ?? []) as BookRow[]);
  }

  useEffect(() => {
    loadSessionAndData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byEmail: Record<string, Bucket> = useMemo(() => {
    const map: Record<string, Bucket> = {};
    for (const m of members) map[m.email] = { completed: [] };

    for (const r of rows) {
      const bucket = map[r.member_email];
      if (!bucket) continue;
      if (r.status === "current") bucket.current = r;
      else bucket.completed.push(r);
    }

    for (const email of Object.keys(map)) {
      map[email].completed.sort(
        (a, b) =>
          new Date(b.completed_at ?? b.created_at).getTime() -
          new Date(a.completed_at ?? a.created_at).getTime()
      );
    }
    return map;
  }, [members, rows]);

  const scored = useMemo(() => {
    return members
      .map((m) => ({
        ...m,
        completedCount: byEmail[m.email]?.completed.length ?? 0,
      }))
      .sort((a, b) => b.completedCount - a.completedCount);
  }, [members, byEmail]);

  // Desktop layout needs leader in center: [2nd, 1st, 3rd]
  const orderedForDesktop = useMemo(() => {
    if (scored.length !== 3) return scored;
    return [scored[1], scored[0], scored[2]];
  }, [scored]);

  // Mobile: rank order top-to-bottom
  const orderedForMobile = scored;

  const myBucket = sessionEmail ? byEmail[sessionEmail] : undefined;
  const myCurrent = myBucket?.current;

  function rankLabel(rankIndex: number) {
    if (rankIndex === 0) return "1 Bibliophile";
    if (rankIndex === 1) return "2 Bookworm";
    return "3 Can read gud";
  }

  async function saveCurrent() {
    if (!sessionEmail) return;

    setErr(null);

    if (!myCurrent) {
      setErr("No current row found for your user. Seed a current row in Supabase.");
      return;
    }

    const title = draftTitle.trim();
    if (!title) {
      setErr("Enter a book name.");
      return;
    }

    const nowIso = new Date().toISOString();

    if (markComplete) {
      const { data: completedRow, error: completeErr } = await supabase
        .from("books")
        .update({ title, status: "completed", completed_at: nowIso })
        .eq("id", myCurrent.id)
        .select("*")
        .single();

      if (completeErr) {
        setErr(completeErr.message);
        return;
      }

      const { data: newCurrentRow, error: newCurrentErr } = await supabase
        .from("books")
        .insert([{ member_email: sessionEmail, status: "current", title: "" }])
        .select("*")
        .single();

      if (newCurrentErr) {
        setErr(newCurrentErr.message);
        return;
      }

      setRows((prev) => {
        const withoutOldCurrent = prev.filter((r) => r.id !== myCurrent.id);
        return [newCurrentRow as BookRow, completedRow as BookRow, ...withoutOldCurrent];
      });

      setEditing(false);
      setDraftTitle("");
      setMarkComplete(false);
      return;
    }

    const { data: updatedCurrent, error: updErr } = await supabase
      .from("books")
      .update({ title })
      .eq("id", myCurrent.id)
      .select("*")
      .single();

    if (updErr) {
      setErr(updErr.message);
      return;
    }

    setRows((prev) => prev.map((r) => (r.id === myCurrent.id ? (updatedCurrent as BookRow) : r)));
    setEditing(false);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setErr(null);

    const { error } = await supabase.from("books").delete().eq("id", deleteId);
    if (error) setErr(error.message);

    setDeleteId(null);
    await loadSessionAndData();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  }

  function renderColumn(m: { email: string; name: string }, rankIndex: number) {
    const bucket = byEmail[m.email] ?? { completed: [] };
    const currentTitle = bucket.current?.title?.trim() || "—";
    const isMe = sessionEmail && m.email === sessionEmail;

    return (
      <Box>
        {/* Sticky header for desktop (page scroll) */}
        <Box
          sx={{
            position: { xs: "static", md: "sticky" },
            top: { md: 8 },
            zIndex: { md: 5 },
            backgroundColor: { md: "background.default" },
            pb: { md: 1 },
          }}
        >
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {rankLabel(rankIndex)}
          </Typography>

          <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
            {m.name}
          </Typography>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="overline">Current book</Typography>

              {!isMe || !editing ? (
                <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                  {currentTitle}
                </Typography>
              ) : (
                <>
                  <TextField
                    label="Current book"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    fullWidth
                    sx={{ mt: 1, mb: 1 }}
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={markComplete}
                        onChange={(e) => setMarkComplete(e.target.checked)}
                        disabled={!bucket.current?.title?.trim()}
                      />
                    }
                    label="Mark current as completed"
                  />
                </>
              )}

              {isMe && !editing && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setEditing(true);
                    setDraftTitle(bucket.current?.title ?? "");
                    setMarkComplete(false);
                  }}
                >
                  Edit
                </Button>
              )}

              {isMe && editing && (
                <Button variant="contained" onClick={saveCurrent}>
                  Save
                </Button>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Completed list (page scrolls) */}
        {bucket.completed.map((b) => (
          <Card key={b.id} sx={{ mb: 1 }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
                {b.title || "—"}
              </Typography>

              {isMe && (
                <Button variant="text" color="error" onClick={() => setDeleteId(b.id)}>
                  Delete
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }
function renderMobileDetails(m: { email: string; name: string }, rankIndex: number) {
  const bucket = byEmail[m.email] ?? { completed: [] };
  const currentTitle = bucket.current?.title?.trim() || "—";
  const isMe = sessionEmail && m.email === sessionEmail;

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="overline">Current book</Typography>

          {!isMe || !editing ? (
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              {currentTitle}
            </Typography>
          ) : (
            <>
              <TextField
                label="Current book"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                fullWidth
                sx={{ mt: 1, mb: 1 }}
              />

              {/* checkbox only appears while editing, so new current book can’t be marked read until you hit Edit */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={markComplete}
                    onChange={(e) => setMarkComplete(e.target.checked)}
                    disabled={!bucket.current?.title?.trim()}
                  />
                }
                label="Mark current as completed"
              />
            </>
          )}

          {isMe && !editing && (
            <Button
              variant="outlined"
              onClick={() => {
                setEditing(true);
                setDraftTitle(bucket.current?.title ?? "");
                setMarkComplete(false);
              }}
            >
              Edit
            </Button>
          )}

          {isMe && editing && (
            <Button variant="contained" onClick={saveCurrent}>
              Save
            </Button>
          )}
        </CardContent>
      </Card>

      {bucket.completed.map((b) => (
        <Card key={b.id} sx={{ mb: 1 }}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
              {b.title || "—"}
            </Typography>

            {isMe && (
              <Button variant="text" color="error" onClick={() => setDeleteId(b.id)}>
                Delete
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h3" component="h1">
          2026 Book Club Bros
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={logout}>
          Log out
        </Button>
      </Box>

      {err && (
        <Typography color="error" sx={{ mb: 2 }}>
          {err}
        </Typography>
      )}

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
                    <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
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

                <AccordionDetails>
                  {renderMobileDetails(m, rankIndex)}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* DESKTOP: 3 columns, page scroll */}
      {!isMobile && (
        <Grid container spacing={2}>
          {orderedForDesktop.map((m) => {
            const rankIndex = scored.findIndex((s) => s.email === m.email);
            return (
              <Grid key={m.email} size={{ xs: 12, md: 4 }}>
                {renderColumn(m, rankIndex)}
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Are you sure you want to delete?</DialogTitle>
        <DialogContent />
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
