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
  Collapse,
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

function ReadBookCard({
  row,
  showDelete,
  onDelete,
}: {
  row: BookRow;
  showDelete: boolean;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasComment = !!row.comment?.trim();

  return (
    <Card sx={{ mb: 1 }}>
      <CardContent sx={{ pb: 1.5 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h3">
              {row.title?.trim() || "—"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {row.author?.trim() || "—"}
            </Typography>
          </Box>

          {showDelete && (
            <Button variant="text" color="error" onClick={onDelete}>
              Delete
            </Button>
          )}
        </Box>

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

export default function AdminPage() {
  const members = useMemo(() => getMembers(), []);
  const isMobile = useMediaQuery("(max-width:899px)");

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<BookRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAuthor, setDraftAuthor] = useState("");
  const [draftComment, setDraftComment] = useState("");
  const [markComplete, setMarkComplete] = useState(false);

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

  const orderedForDesktop = useMemo(() => {
    if (scored.length !== 3) return scored;
    return [scored[1], scored[0], scored[2]];
  }, [scored]);

  const orderedForMobile = scored;

  const myBucket = sessionEmail ? byEmail[sessionEmail] : undefined;
  const myCurrent = myBucket?.current;

  function startEdit(current?: BookRow) {
    setEditing(true);
    setDraftTitle(current?.title ?? "");
    setDraftAuthor(current?.author ?? "");
    setDraftComment(current?.comment ?? "");
    setMarkComplete(false);
  }

  async function saveCurrent() {
    if (!sessionEmail) return;

    setErr(null);

    if (!myCurrent) {
      setErr("No current row found for your user.");
      return;
    }

    const title = draftTitle.trim();
    const author = draftAuthor.trim();
    const comment = draftComment.trim();

    if (!title) {
      setErr("Enter a title.");
      return;
    }
    if (!author) {
      setErr("Enter an author.");
      return;
    }
    if (comment.length > 200) {
      setErr("Comment must be 200 characters or less.");
      return;
    }

    const nowIso = new Date().toISOString();

    if (markComplete) {
      const { data: completedRow, error: completeErr } = await supabase
        .from("books")
        .update({ title, author, comment, status: "completed", completed_at: nowIso })
        .eq("id", myCurrent.id)
        .select("*")
        .single();

      if (completeErr) {
        setErr(completeErr.message);
        return;
      }

      const { data: newCurrentRow, error: newCurrentErr } = await supabase
        .from("books")
        .insert([{ member_email: sessionEmail, status: "current", title: "", author: "", comment: "" }])
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
      setDraftAuthor("");
      setDraftComment("");
      setMarkComplete(false);
      return;
    }

    const { data: updatedCurrent, error: updErr } = await supabase
      .from("books")
      .update({ title, author, comment })
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

  function renderDesktopColumn(m: { email: string; name: string }, rankIndex: number) {
    const bucket = byEmail[m.email] ?? { completed: [] };
    const current = bucket.current;
    const isMe = sessionEmail && m.email === sessionEmail;

    return (
      <Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mt: 3, mb: 1 }}>
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

              {!isMe || !editing ? (
                <>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {current ? formatBookLine(current.title, current.author) : "—"}
                  </Typography>

                  {current?.comment?.trim() && (
                    <Typography variant="body2" sx={{ fontStyle: "italic", mt: 1 }}>
                      {current.comment.trim()}
                    </Typography>
                  )}

                  {isMe && (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                      <Button variant="outlined" onClick={() => startEdit(current)}>
                        Edit
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <>
                  <TextField
                    label="Title"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    fullWidth
                    sx={{ mt: 1, mb: 1 }}
                  />
                  <TextField
                    label="Author"
                    value={draftAuthor}
                    onChange={(e) => setDraftAuthor(e.target.value)}
                    fullWidth
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    label="Why are you reading this?"
                    value={draftComment}
                    onChange={(e) => setDraftComment(e.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                    inputProps={{ maxLength: 200 }}
                    helperText={`${draftComment.trim().length}/200`}
                    sx={{ mb: 1 }}
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={markComplete}
                        onChange={(e) => setMarkComplete(e.target.checked)}
                        disabled={!current?.title?.trim() || !current?.author?.trim()}
                      />
                    }
                    label="Mark current as completed"
                  />

                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                    <Button variant="contained" onClick={saveCurrent}>
                      Save
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Box>

        {bucket.completed.map((b) => (
          <ReadBookCard
            key={b.id}
            row={b}
            showDelete={!!isMe}
            onDelete={() => setDeleteId(b.id)}
          />
        ))}
      </Box>
    );
  }

  function renderMobileDetails(m: { email: string; name: string }) {
    const bucket = byEmail[m.email] ?? { completed: [] };
    const current = bucket.current;
    const isMe = sessionEmail && m.email === sessionEmail;

    return (
      <>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="overline">Current book</Typography>

            {!isMe || !editing ? (
              <>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {current ? formatBookLine(current.title, current.author) : "—"}
                </Typography>

                {current?.comment?.trim() && (
                  <Typography variant="body2" sx={{ fontStyle: "italic", mt: 1 }}>
                    {current.comment.trim()}
                  </Typography>
                )}

                {isMe && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                    <Button variant="outlined" onClick={() => startEdit(current)}>
                      Edit
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <>
                <TextField
                  label="Title"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  fullWidth
                  sx={{ mt: 1, mb: 1 }}
                />
                <TextField
                  label="Author"
                  value={draftAuthor}
                  onChange={(e) => setDraftAuthor(e.target.value)}
                  fullWidth
                  sx={{ mb: 1 }}
                />
                <TextField
                  label="Why are you reading this?"
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                  inputProps={{ maxLength: 200 }}
                  helperText={`${draftComment.trim().length}/200`}
                  sx={{ mb: 1 }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={markComplete}
                      onChange={(e) => setMarkComplete(e.target.checked)}
                      disabled={!current?.title?.trim() || !current?.author?.trim()}
                    />
                  }
                  label="Mark current as completed"
                />

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                  <Button variant="contained" onClick={saveCurrent}>
                    Save
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {bucket.completed.map((b) => (
          <ReadBookCard
            key={b.id}
            row={b}
            showDelete={!!isMe}
            onDelete={() => setDeleteId(b.id)}
          />
        ))}
      </>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <MobileNav />

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h3" component="h1">
          Book Bros Book Club 2026
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
