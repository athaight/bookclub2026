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
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";

type Member = { email: string; name: string };

type BookRow = {
  id: string;
  member_email: string;
  status: "current" | "completed";
  title: string;
  author: string | null;
  comment: string | null;
  created_at: string;
  completed_at: string | null;
};

type Bucket = { current?: BookRow; completed: BookRow[] };

function rankLabel(rankIndex: number) {
  if (rankIndex === 0) return "Bibliophile";
  if (rankIndex === 1) return "Bookworm";
  return "Can read gud";
}

function formatBookLine(title?: string | null, author?: string | null) {
  const t = (title ?? "").trim();
  const a = (author ?? "").trim();
  if (!t && !a) return "—";
  if (t && !a) return t;
  if (!t && a) return a;
  return `${t} — ${a}`;
}

function BookCard({
  row,
  canDelete,
  onDelete,
}: {
  row: BookRow;
  canDelete: boolean;
  onDelete: (row: BookRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const comment = (row.comment ?? "").trim();
  const hasComment = comment.length > 0;

  return (
    <Card sx={{ mb: 1 }}>
      <CardContent sx={{ pb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h3" noWrap>
              {row.title?.trim() || "—"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }} noWrap>
              {(row.author ?? "").trim() || "—"}
            </Typography>
          </Box>

          {canDelete && (
            <IconButton aria-label="delete" onClick={() => onDelete(row)} size="small">
              <DeleteIcon fontSize="small" />
            </IconButton>
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
                {comment}
              </Typography>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const members = useMemo<Member[]>(() => getMembers(), []);
  const isMobile = useMediaQuery("(max-width:899px)");

  const [checkingSession, setCheckingSession] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<BookRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Current editor state (only for the logged-in user's column)
  const [editingCurrent, setEditingCurrent] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAuthor, setDraftAuthor] = useState("");
  const [draftComment, setDraftComment] = useState("");
  const [markCompleted, setMarkCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<BookRow | null>(null);

  // init accordions expanded
  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const m of members) init[m.email] = true;
    setExpanded(init);
  }, [members]);

  // auth guard
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? null;

      if (!mounted) return;

      // Not logged in => go to login
      if (!email) {
        setCheckingSession(false);
        window.location.href = "/admin/login";
        return;
      }

      // Logged in but not in our allowed members => boot
      const allowed = members.some((m) => m.email === email);
      if (!allowed) {
        await supabase.auth.signOut();
        setCheckingSession(false);
        window.location.href = "/admin/login";
        return;
      }

      setAuthedEmail(email);
      setCheckingSession(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const email = session?.user?.email ?? null;
      setAuthedEmail(email);
      setCheckingSession(false);
      if (!email) window.location.href = "/admin/login";
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [members]);

  async function refresh() {
    setErr(null);

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .in(
        "member_email",
        members.map((m) => m.email)
      );

    if (error) {
      setErr(error.message);
      setRows([]);
      return;
    }

    setRows((data ?? []) as BookRow[]);
  }

  useEffect(() => {
    if (!checkingSession) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingSession]);

  if (checkingSession) return <Typography>Loading…</Typography>;
  if (err) return <Typography color="error">DB error: {err}</Typography>;
  if (!authedEmail) return null;

  // Build buckets
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

  // Ranking / ordering
  const scored = members
    .map((m) => ({
      ...m,
      completedCount: byEmail[m.email]?.completed.length ?? 0,
    }))
    .sort((a, b) => b.completedCount - a.completedCount);

  const orderedForDesktop =
    scored.length === 3 ? [scored[1], scored[0], scored[2]] : scored;
  const orderedForMobile = scored;

  function resetEditorToBlank() {
    setDraftTitle("");
    setDraftAuthor("");
    setDraftComment("");
    setMarkCompleted(false);
    setEditingCurrent(false);
  }

  function loadEditorFromCurrent(current: BookRow) {
    setDraftTitle(current.title ?? "");
    setDraftAuthor(current.author ?? "");
    setDraftComment((current.comment ?? "").slice(0, 200));
    setMarkCompleted(false);
    setEditingCurrent(true);
  }

  async function saveCurrent(memberEmail: string) {
    const title = draftTitle.trim();
    const author = draftAuthor.trim();
    const comment = draftComment.trim();

    if (!title) {
      setErr("Title is required.");
      return;
    }

    if (comment.length > 200) {
      setErr("Comment must be 200 characters or less.");
      return;
    }

    setSaving(true);
    setErr(null);

    const current = byEmail[memberEmail]?.current;

    try {
      if (!current) {
        // Create new current row
        const { error } = await supabase.from("books").insert({
          member_email: memberEmail,
          status: "current",
          title,
          author: author || null,
          comment: comment || null,
        });
        if (error) throw new Error(error.message);
        await refresh();
        setEditingCurrent(false);
        setMarkCompleted(false);
        return;
      }

      // Existing current row: update fields
      const { error: updateErr } = await supabase
        .from("books")
        .update({
          title,
          author: author || null,
          comment: comment || null,
        })
        .eq("id", current.id);

      if (updateErr) throw new Error(updateErr.message);

      if (markCompleted) {
        // Mark completed (this moves it into the completed stack)
        const { error: completeErr } = await supabase
          .from("books")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", current.id);

        if (completeErr) throw new Error(completeErr.message);

        // After completing, clear editor for new current entry
        resetEditorToBlank();
      } else {
        setEditingCurrent(false);
        setMarkCompleted(false);
      }

      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(row: BookRow) {
    setSaving(true);
    setErr(null);

    try {
      const { error } = await supabase.from("books").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  function renderAdminCurrentEditor(memberEmail: string) {
    // Only for the logged-in user column
    if (authedEmail !== memberEmail) return null;

    const current = byEmail[memberEmail]?.current;
    const hasCurrent = !!current;

    // Requirement: brand-new current can't be marked completed.
    // So: show mark-completed checkbox ONLY when there is an existing current row AND you're editing it.
    const showMarkCompleted = hasCurrent && editingCurrent;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="overline">Current book (edit)</Typography>

          <TextField
            label="Title"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="e.g., Lonesome Dove"
            fullWidth
          />

          <TextField
            label="Author"
            value={draftAuthor}
            onChange={(e) => setDraftAuthor(e.target.value)}
            placeholder="e.g., Larry McMurtry"
            fullWidth
          />

          <TextField
            label="Why this book?"
            value={draftComment}
            onChange={(e) => setDraftComment(e.target.value.slice(0, 200))}
            helperText={`${draftComment.length}/200`}
            multiline
            minRows={2}
            fullWidth
          />

          {showMarkCompleted && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={markCompleted}
                  onChange={(e) => setMarkCompleted(e.target.checked)}
                />
              }
              label="Mark this current book as completed"
            />
          )}

          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            {hasCurrent && !editingCurrent && (
              <Button
                startIcon={<EditIcon />}
                onClick={() => loadEditorFromCurrent(current)}
                variant="outlined"
              >
                Edit
              </Button>
            )}

            {(editingCurrent || !hasCurrent) && (
              <Button
                startIcon={<SaveIcon />}
                onClick={() => saveCurrent(memberEmail)}
                disabled={saving}
                variant="contained"
              >
                Save
              </Button>
            )}
          </Box>

          {!hasCurrent && (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              No current book saved yet. Enter one above and hit Save.
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderDesktopColumn(m: Member, rankIndex: number) {
    const bucket = byEmail[m.email] ?? { completed: [] };
    const current = bucket.current;

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

          {/* Admin editor (only for authed user) */}
          {renderAdminCurrentEditor(m.email)}

          {/* Viewer current card for everyone else */}
          {authedEmail !== m.email && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="overline">Current book</Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {current ? formatBookLine(current.title, current.author) : "—"}
                </Typography>
                {!!(current?.comment ?? "").trim() && (
                  <Typography variant="body2" sx={{ fontStyle: "italic", mt: 1 }}>
                    {(current?.comment ?? "").trim()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Box>

        {bucket.completed.map((b) => (
          <BookCard
            key={b.id}
            row={b}
            canDelete={authedEmail === m.email}
            onDelete={(row) => setDeleteTarget(row)}
          />
        ))}
      </Box>
    );
  }

  function renderMobileDetails(m: Member) {
    const bucket = byEmail[m.email] ?? { completed: [] };
    const current = bucket.current;

    return (
      <>
        {renderAdminCurrentEditor(m.email)}

        {authedEmail !== m.email && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="overline">Current book</Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {current ? formatBookLine(current.title, current.author) : "—"}
              </Typography>
              {!!(current?.comment ?? "").trim() && (
                <Typography variant="body2" sx={{ fontStyle: "italic", mt: 1 }}>
                  {(current?.comment ?? "").trim()}
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {bucket.completed.map((b) => (
          <BookCard
            key={b.id}
            row={b}
            canDelete={authedEmail === m.email}
            onDelete={(row) => setDeleteTarget(row)}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {err && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{err}</Typography>
        </Box>
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

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete book?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{deleteTarget ? deleteTarget.title : ""}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteTarget && deleteRow(deleteTarget)}
            disabled={saving || !deleteTarget}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
